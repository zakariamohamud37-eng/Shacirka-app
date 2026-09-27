import {
  getUser,
  getSettings,
  handleAuthCallback,
  login,
  logout,
  oauthLogin,
  requestPasswordRecovery,
  signup,
  updateUser,
} from "@netlify/identity";

const USER_SCOPE_KEY="hage-auth-user-id";
let currentUser=null;

function authMarkup(){
  return `<div class="auth-gate" id="authGate" aria-live="polite">
    <section class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <div class="auth-logo"><img src="icons/icon-192.png" alt=""><div><strong>Hage Study</strong><span>Baro. Qorshee. Horumar.</span></div></div>
      <h2 id="authTitle">Ku soo dhowow</h2>
      <p class="auth-lead" id="authLead">Gmail-kaaga ama email-kaaga ku gal si xogtaadu kuu gaar ahaato.</p>
      <div class="auth-tabs"><button class="active" type="button" data-auth-mode="login">Gal</button><button type="button" data-auth-mode="signup">Akoon samee</button></div>
      <form id="authForm" novalidate>
        <label class="auth-name-field" hidden>Magacaaga<input id="authName" autocomplete="name" placeholder="Magaca oo buuxa"></label>
        <label>Gmail ama email<input id="authEmail" type="email" autocomplete="email" inputmode="email" required placeholder="magaca@gmail.com"></label>
        <label>Password<input id="authPassword" type="password" autocomplete="current-password" minlength="8" required placeholder="Ugu yaraan 8 xaraf"></label>
        <button class="auth-primary" id="authSubmit" type="submit">Gal akoonka</button>
      </form>
      <button class="auth-google" id="authGoogle" type="button" hidden><span>G</span> Ku gal Google</button>
      <button class="auth-link" id="authRecovery" type="button">Password-ka ma ilowday?</button>
      <div class="auth-status" id="authStatus"></div>
      <p class="auth-privacy">Xogta akoonka waxaa loo adeegsadaa gelitaanka iyo ilaalinta xogtaada oo keliya.</p>
    </section>
  </div>`;
}

function injectAuth(){
  if(!document.getElementById("authGate"))document.body.insertAdjacentHTML("afterbegin",authMarkup());
}

function setStatus(message,type="info"){
  const el=document.getElementById("authStatus");if(!el)return;el.textContent=message;el.dataset.type=type;
}

function setBusy(busy){
  document.querySelectorAll("#authGate button,#authGate input").forEach(el=>el.disabled=busy);
}

function friendlyError(error){
  const message=String(error?.message||error||"").toLowerCase();
  if(message.includes("invalid login")||message.includes("credentials"))return "Email-ka ama password-ku waa khalad.";
  if(message.includes("already registered")||message.includes("already exists"))return "Email-kan hore ayaa akoon loogu sameeyay.";
  if(message.includes("password"))return "Password-ku waa inuu ahaadaa ugu yaraan 8 xaraf.";
  if(message.includes("identity")||message.includes("not configured"))return "Nidaamka login-ka weli lagama daarin Netlify. Fadlan mar kale isku day wax yar kadib.";
  return "Hawshu way fashilantay. Hubi internet-ka oo mar kale isku day.";
}

function activateUser(user){
  currentUser=user;window.HageAuth={user};
  const previous=localStorage.getItem(USER_SCOPE_KEY);
  if(previous!==user.id){localStorage.setItem(USER_SCOPE_KEY,user.id);location.reload();return false}
  document.getElementById("authGate")?.classList.add("authenticated");
  renderAccountChip(user);
  document.dispatchEvent(new CustomEvent("hage:auth-ready",{detail:{user}}));
  return true;
}

function renderAccountChip(user){
  const host=document.querySelector(".topbar-right");if(!host||document.getElementById("accountButton"))return;
  const button=document.createElement("button");button.id="accountButton";button.className="account-button";button.type="button";button.title="Akoonka";
  button.innerHTML=`<span>${(user.name||user.email||"U").trim().charAt(0).toUpperCase()}</span>`;
  host.prepend(button);
  const panel=document.createElement("div");panel.className="account-panel";panel.id="accountPanel";panel.innerHTML=`
    <strong>${escapeText(user.name||"Isticmaale")}</strong><span>${escapeText(user.email||"")}</span>
    <button type="button" id="manageUsersBtn" hidden>Maamul isticmaalayaasha</button>
    <button type="button" id="logoutBtn">Ka bax akoonka</button>`;
  document.body.appendChild(panel);
  button.addEventListener("click",()=>panel.classList.toggle("open"));
  document.addEventListener("click",event=>{if(!panel.contains(event.target)&&!button.contains(event.target))panel.classList.remove("open")});
  document.getElementById("logoutBtn").addEventListener("click",async()=>{try{await logout()}finally{localStorage.removeItem(USER_SCOPE_KEY);location.reload()}});
  detectAdmin();
}

function escapeText(value){const el=document.createElement("span");el.textContent=String(value||"");return el.innerHTML}

async function detectAdmin(){
  try{
    const response=await fetch("/api/admin-users",{credentials:"include"});
    if(!response.ok)return;
    const button=document.getElementById("manageUsersBtn");button.hidden=false;button.addEventListener("click",openAdminUsers);
  }catch(_error){}
}

async function openAdminUsers(){
  let overlay=document.getElementById("adminUsersOverlay");
  if(!overlay){
    overlay=document.createElement("div");overlay.id="adminUsersOverlay";overlay.className="modal-overlay admin-users-overlay";
    overlay.innerHTML=`<section class="modal-panel admin-users-panel" role="dialog" aria-modal="true"><div class="modal-head"><div><div class="modal-title">Maamulka isticmaalayaasha</div><div class="modal-sub">Akoonnada Hage Study</div></div><button class="modal-close" type="button" aria-label="Xir">✕</button></div><div id="adminUsersList" class="admin-users-list">Soo dejinaya...</div></section>`;
    document.body.appendChild(overlay);overlay.querySelector(".modal-close").addEventListener("click",()=>overlay.classList.remove("open"));
  }
  overlay.classList.add("open");
  const list=overlay.querySelector("#adminUsersList");list.textContent="Soo dejinaya...";
  try{
    const response=await fetch("/api/admin-users",{credentials:"include"});if(!response.ok)throw new Error();
    const data=await response.json();
    list.innerHTML=data.users.map(user=>`<div class="admin-user-row"><div><strong>${escapeText(user.name||"Magac lama gelin")}</strong><span>${escapeText(user.email)}</span><small>${user.confirmed?"La xaqiijiyey":"Sugaya xaqiijin"}</small></div>${user.id===currentUser?.id?'<em>Adiga</em>':`<button type="button" data-remove-user="${escapeText(user.id)}" data-user-email="${escapeText(user.email)}">Remove</button>`}</div>`).join("")||"<p>Isticmaale kale ma jiro.</p>";
    list.querySelectorAll("[data-remove-user]").forEach(button=>button.addEventListener("click",async()=>{
      if(!confirm(`Ma hubtaa inaad ka saarayso ${button.dataset.userEmail}? Akoonku dib uma geli karo.`))return;
      button.disabled=true;button.textContent="Ka saaraya...";
      const result=await fetch(`/api/admin-users?id=${encodeURIComponent(button.dataset.removeUser)}`,{method:"DELETE",credentials:"include"});
      if(result.ok)button.closest(".admin-user-row").remove();else{button.disabled=false;button.textContent="Remove";alert("Isticmaalaha lama saari karin.")}
    }));
  }catch(_error){list.textContent="Liiska lama soo dejin. Mar kale isku day."}
}

async function boot(){
  injectAuth();
  let callback=null;
  try{callback=await handleAuthCallback()}catch(error){setStatus(friendlyError(error),"error")}
  if(callback?.type==="recovery"){
    const password=prompt("Geli password-ka cusub, ugu yaraan 8 xaraf:");
    if(password){try{const user=await updateUser({password});setStatus("Password-ka waa la beddelay.","success");activateUser(user);return}catch(error){setStatus(friendlyError(error),"error")}}
  }
  const user=await getUser();if(user){activateUser(user);return}
  let mode="login";
  document.querySelectorAll("[data-auth-mode]").forEach(button=>button.addEventListener("click",()=>{
    mode=button.dataset.authMode;document.querySelectorAll("[data-auth-mode]").forEach(x=>x.classList.toggle("active",x===button));
    document.querySelector(".auth-name-field").hidden=mode!=="signup";
    document.getElementById("authPassword").autocomplete=mode==="signup"?"new-password":"current-password";
    document.getElementById("authSubmit").textContent=mode==="signup"?"Samee akoon":"Gal akoonka";
    document.getElementById("authRecovery").hidden=mode!=="login";setStatus("");
  }));
  try{const settings=await getSettings();document.getElementById("authGoogle").hidden=!settings.providers.google}catch(_error){}
  document.getElementById("authGoogle").addEventListener("click",()=>oauthLogin("google"));
  document.getElementById("authForm").addEventListener("submit",async event=>{
    event.preventDefault();const email=document.getElementById("authEmail").value.trim().toLowerCase(),password=document.getElementById("authPassword").value,name=document.getElementById("authName").value.trim();
    if(!email||password.length<8){setStatus("Geli email sax ah iyo password ugu yaraan 8 xaraf ah.","error");return}
    setBusy(true);setStatus(mode==="signup"?"Akoonka ayaa la sameynayaa...":"Waa lagu gelinayaa...");
    try{
      if(mode==="signup"){
        const created=await signup(email,password,{full_name:name||email.split("@")[0]});
        if(created.confirmedAt)activateUser(created);else setStatus("Akoonka waa la sameeyay. Ka eeg email-kaaga fariinta xaqiijinta, kadibna ku soo gal.","success");
      }else activateUser(await login(email,password));
    }catch(error){setStatus(friendlyError(error),"error")}finally{setBusy(false)}
  });
  document.getElementById("authRecovery").addEventListener("click",async()=>{
    const email=document.getElementById("authEmail").value.trim();if(!email){setStatus("Marka hore geli email-kaaga.","error");return}
    setBusy(true);try{await requestPasswordRecovery(email);setStatus("Link-ga beddelidda password-ka email-kaaga ayaa loo diray.","success")}catch(error){setStatus(friendlyError(error),"error")}finally{setBusy(false)}
  });
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
