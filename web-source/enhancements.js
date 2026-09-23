(function(){
"use strict";

const ENHANCEMENT_VERSION="1.5.1";
const PDF_READING_KEY="hage-study-pdf-reading-v1";
const ONBOARDING_KEY="hage-study-onboarding-v1.5";
const ERROR_LOG_KEY="hage-study-error-log-v1";
const GPA_POINTS={"A+":4,"A":4,"A-":3.7,"B+":3.3,"B":3,"B-":2.7,"C+":2.3,"C":2,"C-":1.7,"D":1,"F":0};
let currentPdfKey="",currentPdfSearchResults=[];

function toast(message){
  const region=document.getElementById("toastRegion");if(!region)return;
  const item=document.createElement("div");item.className="app-toast";item.textContent=message;region.appendChild(item);
  setTimeout(()=>item.remove(),3600);
}
function safeParse(value,fallback){try{return JSON.parse(value)||fallback}catch(e){return fallback}}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
function dataUrlToBlob(dataUrl){const [head,data]=String(dataUrl).split(","),mime=/data:([^;]+)/.exec(head)?.[1]||"application/octet-stream",bytes=atob(data),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new Blob([array],{type:mime})}
function formatStorage(bytes){if(!Number.isFinite(bytes))return "aan la garan";if(bytes<1048576)return Math.round(bytes/1024)+" KB";if(bytes<1073741824)return (bytes/1048576).toFixed(1)+" MB";return (bytes/1073741824).toFixed(2)+" GB"}
function getUni(){
  if(!STATE.university||typeof STATE.university!=="object")STATE.university={major:"",semester:""};
  if(!Array.isArray(STATE.university.semesterHistory))STATE.university.semesterHistory=[];
  return STATE.university;
}
function normalizeUniversityCourses(){
  if(ACTIVE_LEVEL!=="university")return;
  getUni();
  STATE.subjects.forEach(s=>{
    s.credits=Math.max(1,Math.min(12,Number(s.credits)||3));
    s.attendance=s.attendance&&typeof s.attendance==="object"?s.attendance:{attended:0,total:0,log:[]};
    s.attendance.attended=Math.max(0,Number(s.attendance.attended)||0);s.attendance.total=Math.max(s.attendance.attended,Number(s.attendance.total)||0);
    if(!Array.isArray(s.attendance.log))s.attendance.log=[];
    s.courseNotes=String(s.courseNotes||"");
    s.resources=Array.isArray(s.resources)?s.resources:[];
  });
}
function currentGpa(){
  if(ACTIVE_LEVEL!=="university")return {gpa:0,gradedCredits:0};
  let points=0,credits=0;
  STATE.subjects.forEach(s=>{if(GPA_POINTS[s.grade]!==undefined){const c=Number(s.credits)||0;points+=GPA_POINTS[s.grade]*c;credits+=c}});
  return {gpa:credits?points/credits:0,gradedCredits:credits};
}
function cumulativeGpa(){
  const now=currentGpa(),uni=getUni(),history=uni.semesterHistory.filter(x=>String(x.name).toLowerCase()!==String(uni.semester||"").toLowerCase());let points=now.gpa*now.gradedCredits,credits=now.gradedCredits;
  history.forEach(x=>{const c=Number(x.gradedCredits)||0;points+=(Number(x.gpa)||0)*c;credits+=c});
  return {cgpa:credits?points/credits:0,credits};
}
function attendanceSummary(){
  let attended=0,total=0;STATE.subjects.forEach(s=>{attended+=Number(s.attendance?.attended)||0;total+=Number(s.attendance?.total)||0});
  return {attended,total,pct:total?Math.round(attended/total*100):0};
}
function renderUniversityPro(){
  const grid=document.getElementById("universityProGrid");if(!grid)return;
  if(ACTIVE_LEVEL!=="university"){grid.innerHTML="";return}
  normalizeUniversityCourses();
  const uni=getUni(),g=currentGpa(),cg=cumulativeGpa(),att=attendanceSummary();
  const totalCredits=STATE.subjects.reduce((a,s)=>a+(Number(s.credits)||0),0),completedCredits=STATE.subjects.filter(s=>s.status==="done").reduce((a,s)=>a+(Number(s.credits)||0),0);
  const history=uni.semesterHistory.slice().reverse();
  grid.innerHTML=`
    <section class="uni-pro-card"><div class="uni-pro-label">GPA semester-kan</div><div class="uni-pro-value">${g.gradedCredits?g.gpa.toFixed(2):"—"}</div><div class="uni-pro-note">${g.gradedCredits} credit oo la qiimeeyey</div></section>
    <section class="uni-pro-card"><div class="uni-pro-label">CGPA guud</div><div class="uni-pro-value">${cg.credits?cg.cgpa.toFixed(2):"—"}</div><div class="uni-pro-note">Dhammaan semester-rada kaydsan</div></section>
    <section class="uni-pro-card"><div class="uni-pro-label">Credit-ka la dhammaystiray</div><div class="uni-pro-value">${completedCredits}/${totalCredits}</div><div class="uni-pro-note">${totalCredits?Math.round(completedCredits/totalCredits*100):0}% koorsooyinka hadda</div></section>
    <section class="uni-pro-card"><div class="uni-pro-label">Imaanshaha guud</div><div class="uni-pro-value">${att.total?att.pct+"%":"—"}</div><div class="uni-pro-note">${att.attended} joogitaan, ${Math.max(0,att.total-att.attended)} maqnaansho</div></section>
    <section class="uni-pro-card wide"><div class="uni-pro-label">Semester archive</div><div class="uni-pro-note">Kaydi natiijada semester-ka si CGPA-ga iyo taariikhdu u sii jiraan.</div><div class="uni-pro-actions"><button class="uni-mini-btn" id="archiveSemesterBtn" type="button">Kaydi semester-kan</button></div><div class="semester-list">${history.length?history.map(x=>`<div class="semester-row"><div><strong>${escapeHtml(x.name)}</strong><span>GPA ${Number(x.gpa).toFixed(2)} · ${Number(x.gradedCredits)||0} credits · ${escapeHtml(x.savedAt||"")}</span></div><button class="row-del" type="button" data-semester-delete="${escapeHtml(x.id)}" aria-label="Ka saar semester-ka">✕</button></div>`).join(""):"<div class='uni-pro-note'>Semester hore weli lama kaydin.</div>"}</div></section>
    <section class="uni-pro-card wide"><div class="uni-pro-label">Caafimaadka jadwalka</div><div class="uni-pro-value">${countScheduleConflicts()?"Isku dhac jira":"Waa hagaagsan yahay"}</div><div class="uni-pro-note">${countScheduleConflicts()?countScheduleConflicts()+" cashar ayaa waqti isku dul dhacay. Beddel jadwalka si aad u saxdo.":"Casharrada jaamacaddu iskuma dul dhacayaan."}</div></section>`;
  document.getElementById("archiveSemesterBtn")?.addEventListener("click",archiveSemester);
  grid.querySelectorAll("[data-semester-delete]").forEach(btn=>btn.addEventListener("click",()=>{uni.semesterHistory=uni.semesterHistory.filter(x=>x.id!==btn.dataset.semesterDelete);saveState();renderUniversityPro();toast("Semester-ka waa laga saaray archive-ka.")}));
}
function archiveSemester(){
  const uni=getUni(),g=currentGpa(),att=attendanceSummary(),name=(uni.semester||"").trim();
  if(!name){document.getElementById("uniSemester")?.focus();toast("Marka hore qor magaca semester-ka.");return}
  if(!g.gradedCredits){toast("Darajooyin geli koorsooyinka ka hor intaadan kaydin semester-ka.");return}
  const snapshot={id:"sem-"+Date.now(),name,major:uni.major||"",gpa:g.gpa,gradedCredits:g.gradedCredits,attendance:att.pct,totalCredits:STATE.subjects.reduce((a,s)=>a+(Number(s.credits)||0),0),completedCredits:STATE.subjects.filter(s=>s.status==="done").reduce((a,s)=>a+(Number(s.credits)||0),0),savedAt:new Date().toLocaleDateString("so-SO"),courses:STATE.subjects.map(s=>({name:s.name,grade:s.grade,credits:s.credits,status:s.status}))};
  const found=uni.semesterHistory.findIndex(x=>x.name.toLowerCase()===name.toLowerCase());if(found>=0)uni.semesterHistory[found]=snapshot;else uni.semesterHistory.push(snapshot);
  saveState();renderUniversityPro();toast("Semester-ka waxaa lagu kaydiyey archive-ka.");
}
function timeToMinutes(value){const [h,m]=String(value||"").split(":").map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null}
function getScheduleConflicts(rows){
  const sorted=(rows||[]).filter(r=>r.time).map(r=>{const start=timeToMinutes(r.time),end=timeToMinutes(r.endTime);return {...r,start,end:end!==null?end:start+60}}).sort((a,b)=>a.start-b.start),conflicts=[];
  for(let i=1;i<sorted.length;i++)if(sorted[i].start<sorted[i-1].end)conflicts.push([sorted[i-1],sorted[i]]);return conflicts;
}
function countScheduleConflicts(){if(ACTIVE_LEVEL!=="university")return 0;return Object.values(STATE.schedule).reduce((n,rows)=>n+getScheduleConflicts(rows).length,0)}

async function updateStorageSummary(){
  const el=document.getElementById("storageSummary");if(!el)return;
  try{const estimate=await navigator.storage?.estimate?.();if(!estimate){el.textContent="Kaydka qalabkan lama cabbiri karo.";return}const pct=estimate.quota?Math.round(estimate.usage/estimate.quota*100):0;el.textContent=`Kaydka app-ka: ${formatStorage(estimate.usage)} / ${formatStorage(estimate.quota)} (${pct}%)`;}
  catch(e){el.textContent="Kaydka qalabkan lama cabbiri karo."}
}
async function exportBackup(){
  const btn=document.getElementById("backupExportBtn");btn.disabled=true;btn.textContent="Diyaarinaya...";
  try{
    clearTimeout(saveTimer);persistActiveState();
    const records=await pdfDbAction("readonly",store=>store.getAll()),pdfs=[];
    for(const r of records)pdfs.push({subject:r.subject,displayName:r.displayName,fileName:r.fileName,size:r.size,type:r.type,updatedAt:r.updatedAt,data:await blobToDataUrl(r.blob)});
    const payload={app:"Hage Study",version:ENHANCEMENT_VERSION,createdAt:new Date().toISOString(),activeLevel:ACTIVE_LEVEL,profiles:PROFILE_STATES,pdfReading:safeParse(localStorage.getItem(PDF_READING_KEY),{}),pdfs};
    downloadBlob(new Blob([JSON.stringify(payload)],{type:"application/json"}),`Hage-Study-Backup-${new Date().toISOString().slice(0,10)}.hagebackup`);toast("Backup-ga waa diyaar. Meel ammaan ah ku hay.");
  }catch(e){logError(e,"backup-export");alert("Backup-ga lama diyaarin. Waxaa laga yaabaa in PDF-yadu aad u waaweyn yihiin ama kaydku xiran yahay.")}
  finally{btn.disabled=false;btn.textContent="Soo saar backup"}
}
async function importBackup(file){
  if(!file)return;
  try{
    const payload=JSON.parse(await file.text());if(payload?.app!=="Hage Study"||!payload.profiles||typeof payload.profiles!=="object")throw new Error("Backup invalid");
    if(!confirm("Backup-kan wuxuu beddeli doonaa xogta hadda ku jirta app-ka. Ma sii wadnaa?"))return;
    await pdfDbAction("readwrite",store=>store.clear());
    for(const p of payload.pdfs||[]){const blob=dataUrlToBlob(p.data);await pdfDbAction("readwrite",store=>store.put({...p,blob,data:undefined}))}
    PROFILE_STATES=payload.profiles;ACTIVE_LEVEL=LEVEL_NAMES[payload.activeLevel]?payload.activeLevel:"form4";STATE=normalizeState(PROFILE_STATES[ACTIVE_LEVEL]||buildDefaultState(ACTIVE_LEVEL),ACTIVE_LEVEL);PROFILE_STATES[ACTIVE_LEVEL]=STATE;
    localStorage.setItem(PDF_READING_KEY,JSON.stringify(payload.pdfReading||{}));persistActiveState();renderAll();updateStorageSummary();toast("Backup-ga waa la soo celiyey.");
  }catch(e){logError(e,"backup-import");alert("Faylkan ma aha backup sax ah oo Hage Study ah.")}
  finally{document.getElementById("backupImportInput").value=""}
}

function pdfReadingMap(){return safeParse(localStorage.getItem(PDF_READING_KEY),{})}
function pdfReadingState(){const map=pdfReadingMap();if(!map[currentPdfKey])map[currentPdfKey]={lastPage:1,bookmarks:[],highlights:[]};return {map,state:map[currentPdfKey]}}
function savePdfReading(mutator){if(!currentPdfKey)return;const {map,state}=pdfReadingState();mutator(state);localStorage.setItem(PDF_READING_KEY,JSON.stringify(map));refreshPdfSavedPages();applyPdfPageMarkers()}
function applyPdfPageMarkers(){
  if(!currentPdfKey)return;const {state}=pdfReadingState();document.querySelectorAll(".pdf-page-shell").forEach(el=>{const n=Number(el.dataset.page);el.classList.toggle("is-bookmarked",state.bookmarks.includes(n));el.classList.toggle("is-highlighted",state.highlights.includes(n))});
  document.getElementById("pdfBookmarkBtn")?.setAttribute("aria-pressed",String(state.bookmarks.includes(pdfPageNumber)));document.getElementById("pdfHighlightBtn")?.setAttribute("aria-pressed",String(state.highlights.includes(pdfPageNumber)));
}
function refreshPdfSavedPages(){
  const select=document.getElementById("pdfSavedPages");if(!select||!currentPdfKey)return;const {state}=pdfReadingState();
  const saved=[...new Set([...state.bookmarks,...state.highlights])].sort((a,b)=>a-b);select.innerHTML='<option value="">Bogagga la kaydiyey</option>'+saved.map(n=>`<option value="${n}">Bog ${n}${state.bookmarks.includes(n)?" · bookmark":""}${state.highlights.includes(n)?" · highlight":""}</option>`).join("")+currentPdfSearchResults.map(n=>`<option value="${n}">Bog ${n} · natiijo raadis</option>`).join("");
}
async function searchPdf(){
  const query=document.getElementById("pdfSearchInput").value.trim().toLocaleLowerCase(),status=document.getElementById("pdfSearchStatus");if(!query||!openPdfDocument)return;
  status.textContent="PDF-ga ayaa la baarayaa...";currentPdfSearchResults=[];
  try{for(let n=1;n<=openPdfDocument.numPages;n++){const page=await openPdfDocument.getPage(n),content=await page.getTextContent(),text=content.items.map(x=>x.str).join(" ").toLocaleLowerCase();if(text.includes(query))currentPdfSearchResults.push(n);if(n%8===0){status.textContent=`Waxaa la baaray ${n}/${openPdfDocument.numPages} bog`;await new Promise(r=>setTimeout(r,0))}}refreshPdfSavedPages();status.textContent=currentPdfSearchResults.length?`${currentPdfSearchResults.length} bog ayaa laga helay “${query}”. Ka dooro liiska bogagga.`:`“${query}” lagama helin PDF-ga.`;if(currentPdfSearchResults[0])scrollToPdfPage(currentPdfSearchResults[0],true)}catch(e){logError(e,"pdf-search");status.textContent="Raadinta PDF-ga way fashilantay."}
}

function showOnboarding(force=false){
  if(!force&&localStorage.getItem(ONBOARDING_KEY))return;let step=0,chosen=ACTIVE_LEVEL,overlay=document.getElementById("onboardingOverlay");overlay.classList.add("open");
  const draw=()=>{const title=document.getElementById("onboardingTitle"),desc=document.getElementById("onboardingDescription"),body=document.getElementById("onboardingBody"),next=document.getElementById("onboardingNextBtn");document.getElementById("onboardingStepText").textContent=`Tallaabada ${step+1} ee 3`;
    if(step===0){title.textContent="Dooro heerkaaga";desc.textContent="App-ku wuxuu kuu diyaarinayaa maadooyinka ama qalabka jaamacadda.";body.innerHTML=`<div class="onboarding-options">${Object.entries(LEVEL_NAMES).map(([v,l])=>`<button class="onboarding-option ${chosen===v?"selected":""}" data-level-choice="${v}" type="button">${l}</button>`).join("")}</div>`;body.querySelectorAll("[data-level-choice]").forEach(b=>b.addEventListener("click",()=>{chosen=b.dataset.levelChoice;draw()}));next.textContent="Sii wad"}
    else if(step===1){title.textContent="Diyaari jadwalkaaga";desc.textContent="Dooro jadwalka, maadooyinka ama koorsooyinka, kadib geli waqtiga saxda ah.";body.innerHTML='<div class="onboarding-checklist"><div class="onboarding-check">1. Ku dar koorsooyinka ama fur maadooyinka.</div><div class="onboarding-check">2. Beddel jadwalka maalmaha iyo saacadaha.</div><div class="onboarding-check">3. Geli assignments iyo imtixaannada.</div></div>';next.textContent="Sii wad"}
    else{title.textContent="Badbaadi xogtaada";desc.textContent="Daar notifications-ka, kadibna backup samee marka aad xog muhiim ah geliso.";body.innerHTML='<div class="onboarding-checklist"><div class="onboarding-check">Notifications-ku waxay ku xusuusinayaan casharrada iyo imtixaannada.</div><div class="onboarding-check">Backup-ku wuxuu kuu oggolaanayaa inaad xogta telefoon kale ku soo celiso.</div></div>';next.textContent="Dhammaystir"}}
  draw();
  const finish=()=>{localStorage.setItem(ONBOARDING_KEY,"done");overlay.classList.remove("open")};
  document.getElementById("onboardingSkipBtn").onclick=finish;document.getElementById("onboardingNextBtn").onclick=()=>{if(step===0&&chosen!==ACTIVE_LEVEL){document.getElementById("levelSelect").value=chosen;document.getElementById("levelSelect").dispatchEvent(new Event("change"))}if(step<2){step++;draw()}else finish()};
}

function syncSwitchAria(){document.querySelectorAll(".switch[role='switch']").forEach(el=>el.setAttribute("aria-checked",String(el.classList.contains("on"))))}
function professionalizeTitles(){
  const pathFor=text=>/Jadwal|Taariikh/.test(text)?'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>':/Garaaf|Horumar/.test(text)?'<path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6"/>':/Imtixaan|Deadline/.test(text)?'<path d="M5 3v18M5 4h12l-2 4 2 4H5"/>':/Timer|Hawlihii/.test(text)?'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>':/Yool/.test(text)?'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v2M21 12h-2"/>':/Shaqo|Hawl/.test(text)?'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>':/Guusha/.test(text)?'<path d="M8 3h8v4a4 4 0 0 1-8 0V3ZM6 5H3v1a4 4 0 0 0 4 4M18 5h3v1a4 4 0 0 1-4 4M12 11v5M8 21h8M9 16h6"/>':'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>';
  document.querySelectorAll(".card-title").forEach(el=>{if(!el.querySelector(".title-icon")){el.textContent=el.textContent.replace(/^[^\p{L}\p{N}]+/u,"");el.insertAdjacentHTML("afterbegin",`<span class="title-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathFor(el.textContent)}</svg></span>`)}});
}
function improveAccessibility(){
  document.querySelectorAll(".modal-overlay").forEach(o=>{const panel=o.querySelector(".modal-panel");if(panel){panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true")}});
  document.querySelectorAll(".subject-card").forEach(card=>{card.setAttribute("role","button");card.tabIndex=0;card.setAttribute("aria-label",`${card.querySelector(".subject-name")?.textContent||"Maado"}, fur faahfaahinta`);if(!card.dataset.keyboardReady){card.dataset.keyboardReady="1";card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();card.click()}})}});
  document.getElementById("examDateInput")?.setAttribute("aria-label","Taariikhda imtixaanka");
  syncSwitchAria();
}
function renderCourseResources(){
  if(ACTIVE_LEVEL!=="university"||editingIndex===null)return;const s=STATE.subjects[editingIndex],box=document.getElementById("modalCourseResources");if(box)box.value=(s.resources||[]).join("\n");const notes=document.getElementById("modalCourseNotes");if(notes)notes.value=s.courseNotes||"";const att=s.attendance||{attended:0,total:0};document.getElementById("modalAttendanceText").textContent=`${att.attended} / ${att.total} · ${att.total?Math.round(att.attended/att.total*100):0}%`;
  const links=document.getElementById("courseResourceLinks");links.replaceChildren();(s.resources||[]).forEach((value,i)=>{try{const u=new URL(value);if(!/^https?:$/.test(u.protocol))return;const a=document.createElement("a");a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=`Resource ${i+1}`;a.title=u.href;links.appendChild(a)}catch(e){}});
}
function refresh(){normalizeUniversityCourses();renderUniversityPro();updateStorageSummary();professionalizeTitles();improveAccessibility()}
function logError(error,context="app"){
  try{const rows=safeParse(localStorage.getItem(ERROR_LOG_KEY),[]);rows.unshift({time:new Date().toISOString(),context,message:String(error?.message||error)});localStorage.setItem(ERROR_LOG_KEY,JSON.stringify(rows.slice(0,20)))}catch(e){}
}

window.addEventListener("error",e=>logError(e.error||e.message,"window"));window.addEventListener("unhandledrejection",e=>logError(e.reason,"promise"));

const baseRenderAll=renderAll;renderAll=function(){baseRenderAll();refresh()};
const baseRenderSubjects=renderSubjects;renderSubjects=function(){baseRenderSubjects();improveAccessibility()};
const baseRenderExams=renderExams;renderExams=function(){baseRenderExams();improveAccessibility()};
const baseOpenSubjectModal=openSubjectModal;openSubjectModal=function(i){baseOpenSubjectModal(i);normalizeUniversityCourses();renderCourseResources()};
const baseUniversitySummary=renderUniversitySummary;renderUniversitySummary=function(){baseUniversitySummary();renderUniversityPro()};
const baseBuildPdfPages=buildPdfPages;buildPdfPages=async function(page){await baseBuildPdfPages(page);applyPdfPageMarkers()};
const baseUpdatePdfCurrentPage=updatePdfCurrentPage;updatePdfCurrentPage=function(){baseUpdatePdfCurrentPage();if(currentPdfKey)savePdfReading(s=>s.lastPage=pdfPageNumber)};
const baseOpenPdfReader=openPdfReader;openPdfReader=async function(record){currentPdfKey=pdfStorageKey(record.subject);currentPdfSearchResults=[];document.getElementById("pdfSearchStatus").textContent="";document.getElementById("pdfSearchInput").value="";await baseOpenPdfReader(record);const {state}=pdfReadingState();refreshPdfSavedPages();applyPdfPageMarkers();if(state.lastPage>1)scrollToPdfPage(state.lastPage,false)};
const baseClosePdfReader=closePdfReader;closePdfReader=async function(){if(currentPdfKey)savePdfReading(s=>s.lastPage=pdfPageNumber);currentPdfKey="";currentPdfSearchResults=[];await baseClosePdfReader()};

document.getElementById("backupExportBtn")?.addEventListener("click",exportBackup);
document.getElementById("backupImportBtn")?.addEventListener("click",()=>document.getElementById("backupImportInput").click());
document.getElementById("backupImportInput")?.addEventListener("change",e=>importBackup(e.target.files?.[0]));
document.getElementById("diagnosticsBtn")?.addEventListener("click",()=>{const payload={app:"Hage Study",version:ENHANCEMENT_VERSION,createdAt:new Date().toISOString(),platform:navigator.userAgent,errors:safeParse(localStorage.getItem(ERROR_LOG_KEY),[])};downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),`Hage-Study-Diagnostics-${new Date().toISOString().slice(0,10)}.json`);toast("Warbixinta ciladaha waa la diyaariyey.")});
document.getElementById("onboardingOpenBtn")?.addEventListener("click",()=>showOnboarding(true));
document.getElementById("pdfBookmarkBtn")?.addEventListener("click",()=>savePdfReading(s=>{s.bookmarks=s.bookmarks.includes(pdfPageNumber)?s.bookmarks.filter(n=>n!==pdfPageNumber):[...s.bookmarks,pdfPageNumber]}));
document.getElementById("pdfHighlightBtn")?.addEventListener("click",()=>savePdfReading(s=>{s.highlights=s.highlights.includes(pdfPageNumber)?s.highlights.filter(n=>n!==pdfPageNumber):[...s.highlights,pdfPageNumber]}));
document.getElementById("pdfSearchBtn")?.addEventListener("click",searchPdf);
document.getElementById("pdfSearchInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")searchPdf()});
document.getElementById("pdfSavedPages")?.addEventListener("change",e=>{if(e.target.value)scrollToPdfPage(Number(e.target.value),true)});
document.querySelectorAll(".attendance-action").forEach(btn=>btn.addEventListener("click",()=>{if(ACTIVE_LEVEL!=="university"||editingIndex===null)return;normalizeUniversityCourses();const att=STATE.subjects[editingIndex].attendance,action=btn.dataset.attendance;if(action==="undo"){const last=att.log.pop();if(!last){toast("Wax diiwaan ah oo laga noqdo ma jiro.");return}att.total=Math.max(0,att.total-1);if(last==="present")att.attended=Math.max(0,att.attended-1);toast("Diiwaankii ugu dambeeyey waa laga noqday.")}else{att.total++;if(action==="present")att.attended++;att.log.push(action);toast(action==="present"?"Joogitaanka waa la diiwaangeliyey.":"Maqnaanshaha waa la diiwaangeliyey.")}saveState();renderCourseResources();renderUniversityPro()}));
document.getElementById("modalSaveBtn")?.addEventListener("click",()=>{if(ACTIVE_LEVEL!=="university"||editingIndex===null)return;const s=STATE.subjects[editingIndex];s.courseNotes=document.getElementById("modalCourseNotes").value.trim();s.resources=document.getElementById("modalCourseResources").value.split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,40)},true);

document.getElementById("modalPdfInput")?.addEventListener("change",async function(e){
  e.stopImmediatePropagation();const file=this.files?.[0];if(!file||editingIndex===null)return;
  if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){alert("Fadlan dooro fayl PDF ah.");this.value="";return}
  const btn=document.getElementById("modalPdfChooseBtn"),subject=STATE.subjects[editingIndex].name;btn.disabled=true;btn.textContent="Hubinaya kaydka...";
  try{const estimate=await navigator.storage?.estimate?.(),free=estimate?.quota&&estimate?.usage!==undefined?estimate.quota-estimate.usage:Infinity;if(file.size*1.25>free)throw new Error("Boos kayd oo ku filan ma jiro");if(file.size>200*1048576&&!confirm(`PDF-gu waa ${formatStorage(file.size)}. Wuxuu gaabin karaa telefoonka, gaar ahaan iPhone. Ma sii wadnaa?`))return;btn.textContent="Kaydinaya...";await saveSubjectPdf({subject,fileName:file.name,size:file.size,type:"application/pdf",updatedAt:Date.now(),blob:file});await navigator.storage?.persist?.();await renderSubjectPdfBox(subject);updateStorageSummary();toast("PDF-ga waa la kaydiyey.")}
  catch(err){logError(err,"pdf-save");alert(err.message==="Boos kayd oo ku filan ma jiro"?"Telefoonka kuma filna booska PDF-gan. Ka saar PDF hore ama meel bannaan samee.":"PDF-ga lama kaydin. Hubi kaydka telefoonka.")}
  finally{btn.disabled=false;btn.textContent="PDF ku dar";this.value=""}
},true);

const switchObserver=new MutationObserver(syncSwitchAria);document.querySelectorAll(".switch").forEach(el=>switchObserver.observe(el,{attributes:true,attributeFilter:["class"]}));
document.addEventListener("DOMContentLoaded",()=>{const wait=()=>{if(typeof STATE==="object"&&STATE){refresh();showOnboarding(false)}else setTimeout(wait,50)};wait()});
window.HageEnhancements={refresh,renderUniversityPro,updateStorageSummary,version:ENHANCEMENT_VERSION};
})();
