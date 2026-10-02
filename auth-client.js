import {getUser,getSettings,handleAuthCallback,logout,oauthLogin} from "@netlify/identity";

const USER_SCOPE_KEY="hage-auth-user-id";
let currentUser=null;

function authMarkup(){
  return `<div class="auth-gate" id="authGate" aria-live="polite">
    <section class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <div class="auth-logo"><img src="icons/icon-192.png" alt=""><div><strong>Hage Study</strong><span>Baro. Qorshee. Horumar.</span></div></div>
      <h2 id="authTitle">Ku soo dhowow</h2>
      <p class="auth-lead">Google ku gal si jadwalkaaga, xogtaada iyo wada sheekaysiyada Hage AI ay adiga keliya kuugu xirnaadaan.</p>
      <button class="auth-google auth-google-only" id="authGoogle" type="button"><span>G</span> Ku sii wad Google</button>
      <div class="auth-status" id="authStatus"></div>
      <p class="auth-privacy">Hage Study ma arko password-kaaga Google. Qof kasta xogtiisu waa gaar oo akoonkiisa ayay ku xiran tahay.</p>
    </section>
  </div>`;
}
function injectAuth(){if(!document.getElementById("authGate"))document.body.insertAdjacentHTML("afterbegin",authMarkup())}
function setStatus(message,type="info"){const el=document.getElementById("authStatus");if(el){el.textContent=message;el.dataset.type=type}}
function setBusy(busy){const button=document.getElementById("authGoogle");if(button){button.disabled=busy;button.innerHTML=busy?"Google ayaa la furayaa…":"<span>G</span> Ku sii wad Google"}}
function friendlyError(error){const message=String(error?.message||error||"").toLowerCase();if(message.includes("provider")||message.includes("not enabled"))return "Google login weli lagama daarin Netlify. Maamulaha app-ka ayaa daaraya.";return "Gelitaanku wuu fashilmay. Hubi internet-ka oo mar kale isku day."}
function escapeText(value){const el=document.createElement("span");el.textContent=String(value||"");return el.innerHTML}

function migrateLocalData(userId,previousId){
  const pairs=[
    ["shacirka-dashboard-state-v1","shacirka-dashboard-state-v1:"+userId],["hage-study-profiles-v1","hage-study-profiles-v1:"+userId],["hage-study-level-v1","hage-study-level-v1:"+userId],
    ["shacirka-dashboard-state-v1:guest","shacirka-dashboard-state-v1:"+userId],["hage-study-profiles-v1:guest","hage-study-profiles-v1:"+userId],["hage-study-level-v1:guest","hage-study-level-v1:"+userId],
    ["hage-study-pdf-reading-v1:guest","hage-study-pdf-reading-v1:"+userId],["hage-ai-prefs-v1:guest","hage-ai-prefs-v1:"+userId],["hage-ai-conversations-v2:guest","hage-ai-conversations-v2:"+userId]
  ];
  if(previousId&&previousId!=="guest"&&previousId!==userId)for(const name of ["shacirka-dashboard-state-v1","hage-study-profiles-v1","hage-study-level-v1","hage-study-pdf-reading-v1","hage-ai-prefs-v1","hage-ai-conversations-v2"])pairs.unshift([`${name}:${previousId}`,`${name}:${userId}`]);
  for(const [from,to] of pairs)if(!localStorage.getItem(to)&&localStorage.getItem(from))localStorage.setItem(to,localStorage.getItem(from));
}
async function migratePdfData(fromId,toId){
  if(!fromId||fromId==="guest"||fromId===toId||!("indexedDB" in window))return;
  await new Promise(resolve=>{const request=indexedDB.open("shacirka-subject-pdfs-v1",1);request.onerror=()=>resolve();request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("pdfs"))request.result.createObjectStore("pdfs",{keyPath:"subject"})};request.onsuccess=()=>{const db=request.result,tx=db.transaction("pdfs","readwrite"),store=tx.objectStore("pdfs"),cursor=store.openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;const key=String(row.key);if(key.startsWith(fromId+"::"))store.put({...row.value,subject:toId+key.slice(fromId.length)});row.continue()};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();resolve()}}});
}
async function activateUser(user){
  currentUser=user;window.HageAuth={user};const previous=localStorage.getItem(USER_SCOPE_KEY);migrateLocalData(user.id,previous);
  if(previous!==user.id){await migratePdfData(previous,user.id);localStorage.setItem(USER_SCOPE_KEY,user.id);location.reload();return false}
  document.getElementById("authGate")?.classList.add("authenticated");renderAccountChip(user);
  document.dispatchEvent(new CustomEvent("hage:auth-ready",{detail:{user}}));return true;
}
function renderAccountChip(user){
  const host=document.querySelector(".topbar-right");if(!host||document.getElementById("accountButton"))return;
  const button=document.createElement("button");button.id="accountButton";button.className="account-button";button.type="button";button.title="Akoonka Google";
  const photo=user.userMetadata?.avatar_url||user.userMetadata?.picture;button.innerHTML=photo?`<img src="${escapeText(photo)}" alt="">`:`<span>${(user.name||user.email||"U").trim().charAt(0).toUpperCase()}</span>`;host.prepend(button);
  const panel=document.createElement("div");panel.className="account-panel";panel.id="accountPanel";panel.innerHTML=`<strong>${escapeText(user.name||user.userMetadata?.full_name||"Isticmaale")}</strong><span>${escapeText(user.email||"")}</span><small>Xogtaadu akoonkan ayay ku kaydsan tahay</small><button type="button" id="manageUsersBtn" hidden>Maamul isticmaalayaasha</button><button type="button" id="logoutBtn">Ka bax akoonka</button>`;
  document.body.appendChild(panel);button.addEventListener("click",()=>panel.classList.toggle("open"));document.addEventListener("click",event=>{if(!panel.contains(event.target)&&!button.contains(event.target))panel.classList.remove("open")});
  document.getElementById("logoutBtn").addEventListener("click",async()=>{try{await logout()}finally{localStorage.removeItem(USER_SCOPE_KEY);location.reload()}});detectAdmin();
}
async function detectAdmin(){try{const response=await fetch("/api/admin-users",{credentials:"include"});if(!response.ok)return;const button=document.getElementById("manageUsersBtn");button.hidden=false;button.addEventListener("click",openAdminUsers)}catch(_error){}}
async function openAdminUsers(){
  let overlay=document.getElementById("adminUsersOverlay");if(!overlay){overlay=document.createElement("div");overlay.id="adminUsersOverlay";overlay.className="modal-overlay admin-users-overlay";overlay.innerHTML=`<section class="modal-panel admin-users-panel" role="dialog" aria-modal="true"><div class="modal-head"><div><div class="modal-title">Maamulka isticmaalayaasha</div><div class="modal-sub">Akoonnada Hage Study</div></div><button class="modal-close" type="button" aria-label="Xir">✕</button></div><div id="adminUsersList" class="admin-users-list">Soo dejinaya...</div></section>`;document.body.appendChild(overlay);overlay.querySelector(".modal-close").addEventListener("click",()=>overlay.classList.remove("open"))}
  overlay.classList.add("open");const list=overlay.querySelector("#adminUsersList");list.textContent="Soo dejinaya...";
  try{const response=await fetch("/api/admin-users",{credentials:"include"});if(!response.ok)throw new Error();const data=await response.json();list.innerHTML=data.users.map(user=>`<div class="admin-user-row"><div><strong>${escapeText(user.name||"Magac lama gelin")}</strong><span>${escapeText(user.email)}</span><small>${user.confirmed?"La xaqiijiyey":"Sugaya xaqiijin"}</small></div>${user.id===currentUser?.id?'<em>Adiga</em>':`<button type="button" data-remove-user="${escapeText(user.id)}" data-user-email="${escapeText(user.email)}">Remove</button>`}</div>`).join("")||"<p>Isticmaale kale ma jiro.</p>";list.querySelectorAll("[data-remove-user]").forEach(button=>button.addEventListener("click",async()=>{if(!confirm(`Ma hubtaa inaad ka saarayso ${button.dataset.userEmail}?`))return;button.disabled=true;const result=await fetch(`/api/admin-users?id=${encodeURIComponent(button.dataset.removeUser)}`,{method:"DELETE",credentials:"include"});if(result.ok)button.closest(".admin-user-row").remove();else{button.disabled=false;alert("Isticmaalaha lama saari karin.")}}))}catch(_error){list.textContent="Liiska lama soo dejin. Mar kale isku day."}
}
async function boot(){
  injectAuth();try{await handleAuthCallback()}catch(error){setStatus(friendlyError(error),"error")}
  const user=await getUser();if(user){await activateUser(user);return}
  try{const settings=await getSettings();if(!settings.providers.google)setStatus("Google login waa inuu marka hore ka daarnaadaa Netlify Identity.","error")}catch(_error){}
  document.getElementById("authGoogle").addEventListener("click",async()=>{setBusy(true);try{await oauthLogin("google")}catch(error){setBusy(false);setStatus(friendlyError(error),"error")}});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
