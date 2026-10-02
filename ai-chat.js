(function(){
"use strict";
const USER_SCOPE_KEY="hage-auth-user-id";
const defaultPrefs={language:"auto",style:"clear",depth:"balanced",name:"",instructions:"",memory:true};
let prefs={...defaultPrefs},conversations=[],currentId="",attachment=null,busy=false,cloudTimer=null;
const scopedKey=name=>`${name}:${localStorage.getItem(USER_SCOPE_KEY)||"guest"}`;
const safeParse=(value,fallback)=>{try{return JSON.parse(value)||fallback}catch(_error){return fallback}};
const escapeHtml=value=>String(value||"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const nowId=()=>`chat-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

function greeting(){return {role:"assistant",content:"Salaan! Waxaan ahay Hage AI. Waxaad i weydiin kartaa waxbarasho, shaqo, teknoolojiyad, qoraal, turjumaad, fikrado, qorsheyn ama arrin kale. Waxaan si fiican kuugu jawaabi karaa Af Soomaali, English iyo العربية. Maxaan kuu qabtaa?",time:Date.now()}}
function newConversation(){const time=Date.now();return {id:nowId(),title:"Wadahadal cusub",createdAt:time,updatedAt:time,messages:[greeting()]}}
function current(){return conversations.find(chat=>chat.id===currentId)||conversations[0]}

function createWorkspace(){
  if(document.getElementById("aiWorkspace"))return;
  const section=document.createElement("section");section.id="aiWorkspace";section.className="ai-workspace card";section.dataset.appView="ai";
  section.innerHTML=`
    <div class="ai-head"><button class="ai-history-toggle" id="aiHistoryBtn" type="button" title="Wadahadalladii hore">☰</button><div class="ai-head-copy"><div class="ai-kicker">HAGE AI</div><h2>Kaaliyahaaga AI</h2><p>Wax kasta weydii, sawir ama fayl geli, ama sawir cusub samee.</p></div><div class="ai-head-actions"><button id="aiNewChat" type="button" title="Wadahadal cusub">＋</button><button id="aiSettingsBtn" type="button" title="Personalization">⚙</button></div></div>
    <div class="ai-history" id="aiHistory" hidden><div class="ai-history-head"><strong>Wadahadalladii hore</strong><button id="aiHistoryClose" type="button">✕</button></div><div id="aiHistoryList"></div></div>
    <div class="ai-quick-prompts"><button type="button">Arrintan si fudud ii sharax</button><button type="button">Qoraalkan ii hagaaji</button><button type="button">Ii samee qorshe tallaabooyin leh</button><button type="button">Af Soomaali iigu turjun</button></div>
    <div class="ai-messages" id="aiMessages" aria-live="polite"></div>
    <div class="ai-attachment" id="aiAttachment" hidden></div>
    <div class="ai-composer"><textarea id="aiPrompt" rows="1" placeholder="Wax kasta i weydii…" aria-label="Farriinta AI"></textarea>
      <div class="ai-composer-actions"><div><button id="aiAttachBtn" type="button" title="Sawir ama file geli">📎</button><button id="aiVoiceBtn" type="button" title="Cod ku qor">🎙</button><button id="aiImageMode" type="button" title="Sawir samee">🎨 <span>Sawir samee</span></button></div><button class="ai-send" id="aiSendBtn" type="button">Dir ➤</button></div>
      <input id="aiFileInput" type="file" accept="image/*,.pdf,.txt,.md,.csv" hidden>
    </div>
    <p class="ai-disclaimer">AI mararka qaar wuu khaldami karaa. Xogta muhiimka ah dib u hubi.</p>
    <div class="ai-settings" id="aiSettings" hidden><div class="ai-settings-card"><div class="ai-settings-head"><div><strong>Personalization</strong><span>Dooro sida Hage AI kuugu jawaabayo</span></div><button id="aiSettingsClose" type="button">✕</button></div>
      <label>Magaca uu kuugu yeero<input id="aiPrefName" placeholder="Magacaaga"></label>
      <label>Luqadda jawaabta<select id="aiPrefLanguage"><option value="auto">La jaanqaad su'aasha</option><option value="so">Af Soomaali</option><option value="en">English</option><option value="ar">العربية</option></select></label>
      <label>Habka jawaabta<select id="aiPrefStyle"><option value="clear">Cad oo waxtar leh</option><option value="teacher">Macallin dulqaad leh</option><option value="professional">Xirfadle / professional</option><option value="creative">Hal-abuur leh</option><option value="academic">Academic / jaamacadeed</option></select></label>
      <label>Faahfaahinta<select id="aiPrefDepth"><option value="short">Kooban</option><option value="balanced">Dheellitiran</option><option value="deep">Qoto dheer</option></select></label>
      <label>Tilmaamo gaar ah<textarea id="aiPrefInstructions" rows="3" placeholder="Tusaale: Jawaabta qodob-qodob ii sii..."></textarea></label>
      <label class="ai-check"><input id="aiPrefMemory" type="checkbox"> Kaydi wada-hadalladayda si aan mar kale u helo</label>
      <button class="ai-save-settings" id="aiSaveSettings" type="button">Kaydi personalization</button>
    </div></div>`;
  document.querySelector(".app-shell")?.insertBefore(section,document.querySelector(".footer"));
  const nav=document.querySelector(".bottom-nav");if(nav&&!nav.querySelector('[data-view="ai"]'))nav.insertAdjacentHTML("beforeend",'<button data-view="ai"><span>✦</span>Hage AI</button>');
}

function load(){
  prefs={...defaultPrefs,...safeParse(localStorage.getItem(scopedKey("hage-ai-prefs-v1")),{})};
  const saved=safeParse(localStorage.getItem(scopedKey("hage-ai-conversations-v2")),null);
  conversations=Array.isArray(saved?.conversations)?saved.conversations:[];
  if(!conversations.length){const legacy=safeParse(localStorage.getItem(scopedKey("hage-ai-history-v1")),[]),chat=newConversation();if(Array.isArray(legacy)&&legacy.length)chat.messages=legacy;conversations=[chat]}
  currentId=saved?.currentId&&conversations.some(x=>x.id===saved.currentId)?saved.currentId:conversations[0].id;
}
function localPayload(){return {version:2,updatedAt:Date.now(),currentId,conversations:conversations.slice(0,40).map(chat=>({...chat,messages:chat.messages.slice(-80).map(({role,content,time})=>({role,content,time}))}))}}
function save(sync=true){
  if(!prefs.memory)return;
  const payload=localPayload();localStorage.setItem(scopedKey("hage-ai-conversations-v2"),JSON.stringify(payload));
  if(sync&&window.HageAuth?.user){clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>fetch("/api/ai-conversations",{method:"PUT",headers:{"content-type":"application/json"},credentials:"include",body:JSON.stringify(payload)}).catch(()=>{}),900)}
}
async function loadCloud(){
  if(!window.HageAuth?.user||!prefs.memory)return;
  try{const response=await fetch("/api/ai-conversations",{credentials:"include"});if(!response.ok)return;const remote=await response.json();if(!Array.isArray(remote.conversations)||!remote.conversations.length){save();return}
    const map=new Map(conversations.map(chat=>[chat.id,chat]));for(const chat of remote.conversations){const local=map.get(chat.id);if(!local||chat.updatedAt>local.updatedAt)map.set(chat.id,chat)}
    conversations=[...map.values()].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,40);if(!conversations.some(x=>x.id===currentId))currentId=conversations[0].id;save(false);render();renderHistory();
  }catch(_error){}
}
function render(){
  const box=document.getElementById("aiMessages"),chat=current();if(!box||!chat)return;
  box.innerHTML=chat.messages.map((message,index)=>`<article class="ai-message ${message.role}"><div class="ai-message-avatar">${message.role==="assistant"?"✦":"Adiga"}</div><div class="ai-bubble">${message.image?`<img src="${message.image}" alt="Sawir uu sameeyay Hage AI">`:""}${formatText(message.content)}${message.role==="assistant"&&!message.pending?`<div class="ai-message-tools"><button type="button" data-copy-message="${index}">Nuqul</button></div>`:""}</div></article>`).join("");
  box.querySelectorAll("[data-copy-message]").forEach(button=>button.addEventListener("click",async()=>{await navigator.clipboard.writeText(chat.messages[Number(button.dataset.copyMessage)].content||"");button.textContent="La nuqulay"}));box.scrollTop=box.scrollHeight;
}
function renderHistory(){
  const list=document.getElementById("aiHistoryList");if(!list)return;list.innerHTML=conversations.slice().sort((a,b)=>b.updatedAt-a.updatedAt).map(chat=>`<button type="button" class="${chat.id===currentId?"active":""}" data-chat-id="${escapeHtml(chat.id)}"><strong>${escapeHtml(chat.title||"Wadahadal cusub")}</strong><span>${new Date(chat.updatedAt).toLocaleDateString()}</span></button>`).join("");
  list.querySelectorAll("[data-chat-id]").forEach(button=>button.addEventListener("click",()=>{currentId=button.dataset.chatId;save(false);render();renderHistory();document.getElementById("aiHistory").hidden=true}));
}
function formatText(value){return escapeHtml(value).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/^### (.+)$/gm,"<h4>$1</h4>").replace(/^[-•] (.+)$/gm,"<span class='ai-list-item'>• $1</span>").replace(/\n/g,"<br>")}
function currentStudyContext(){try{return {level:typeof ACTIVE_LEVEL!=="undefined"?ACTIVE_LEVEL:"unknown",subjects:typeof STATE!=="undefined"&&STATE?.subjects?STATE.subjects.map(s=>({name:s.name,grade:s.grade,progress:s.progress,status:s.status})).slice(0,20):[]}}catch(_error){return {level:"unknown",subjects:[]}}}
async function readAttachment(file){
  if(file.size>12*1024*1024)throw new Error("Faylka AI-ga geli karo waa inuu ka yaraadaa 12 MB.");
  if(file.type.startsWith("image/")){const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});return {kind:"image",name:file.name,data}}
  if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){if(!window.ShacirkaPDF)throw new Error("PDF-ga lama akhrin karo hadda.");const pdf=await window.ShacirkaPDF.getDocument({data:await file.arrayBuffer()}).promise;let text="";const totalPages=pdf.numPages,pages=Math.min(totalPages,100);for(let n=1;n<=pages&&text.length<90000;n++){const page=await pdf.getPage(n),content=await page.getTextContent();text+=`\n\n[Bog ${n}]\n`+content.items.map(item=>item.str).join(" ")}await pdf.destroy();return {kind:"document",name:file.name,text:text.slice(0,90000),meta:`${totalPages} bog`}}
  return {kind:"document",name:file.name,text:(await file.text()).slice(0,90000),meta:`${Math.round(file.size/1024)} KB`};
}
function showAttachment(){const box=document.getElementById("aiAttachment");if(!attachment){box.hidden=true;box.innerHTML="";return}box.hidden=false;box.innerHTML=`<span>${attachment.kind==="image"?"🖼️":"📄"}</span><div><strong>${escapeHtml(attachment.name)}</strong><small>${escapeHtml(attachment.meta||"Diyaar")}</small></div><button type="button" aria-label="Ka saar">✕</button>`;box.querySelector("button").addEventListener("click",()=>{attachment=null;showAttachment()})}
async function send(){
  if(busy)return;const input=document.getElementById("aiPrompt"),prompt=input.value.trim();if(!prompt&&!attachment)return;const chat=current(),imageMode=document.getElementById("aiImageMode").classList.contains("active"),userMessage={role:"user",content:prompt||(attachment?.kind==="image"?"Sawirkan ii sharax.":"Faylkan ii falanqee."),time:Date.now()};
  chat.messages.push(userMessage);if(chat.messages.filter(x=>x.role==="user").length===1)chat.title=userMessage.content.slice(0,55);chat.updatedAt=Date.now();const pending={role:"assistant",content:imageMode?"Sawirka ayaan kuu sameynayaa…":"Waan ka fikirayaa…",pending:true,time:Date.now()};chat.messages.push(pending);render();
  const payloadAttachment=attachment;attachment=null;showAttachment();input.value="";setBusy(true);
  try{const endpoint=imageMode?"/api/ai-image":"/api/ai-chat",body=imageMode?{prompt:userMessage.content,prefs}:{messages:chat.messages.filter(x=>!x.pending&&!x.image).slice(-20).map(({role,content})=>({role,content})),prefs,attachment:payloadAttachment,context:currentStudyContext()};const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},credentials:"include",body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"AI request failed");pending.pending=false;pending.content=data.answer||data.revisedPrompt||"Sawirka waa diyaar.";if(data.image)pending.image=data.image;chat.updatedAt=Date.now();save();render();renderHistory()}
  catch(error){pending.pending=false;pending.content=String(error.message||"").includes("Unauthorized")?"Fadlan Google-kaaga ku gal.":String(error.message||"Hage AI hadda jawaab ma bixin karo.");render()}finally{setBusy(false)}
}
function setBusy(value){busy=value;document.getElementById("aiSendBtn").disabled=value;document.getElementById("aiSendBtn").textContent=value?"…":"Dir ➤"}
function startNewChat(){const chat=newConversation();conversations.unshift(chat);currentId=chat.id;save();render();renderHistory()}
function bind(){
  document.querySelector('.bottom-nav [data-view="ai"]')?.addEventListener("click",event=>{document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.remove("active"));event.currentTarget.classList.add("active");document.body.dataset.appView="ai";window.scrollTo({top:0,behavior:"smooth"})});
  document.getElementById("aiSendBtn").addEventListener("click",send);const prompt=document.getElementById("aiPrompt");prompt.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send()}});prompt.addEventListener("input",()=>{prompt.style.height="auto";prompt.style.height=Math.min(prompt.scrollHeight,130)+"px"});
  document.getElementById("aiAttachBtn").addEventListener("click",()=>document.getElementById("aiFileInput").click());document.getElementById("aiFileInput").addEventListener("change",async event=>{const file=event.target.files?.[0];if(!file)return;const box=document.getElementById("aiAttachment");box.hidden=false;box.textContent="Faylka ayaa la diyaarinayaa…";try{attachment=await readAttachment(file);showAttachment()}catch(error){attachment=null;showAttachment();alert(error.message)}event.target.value=""});
  document.getElementById("aiImageMode").addEventListener("click",event=>event.currentTarget.classList.toggle("active"));document.getElementById("aiNewChat").addEventListener("click",startNewChat);
  document.getElementById("aiHistoryBtn").addEventListener("click",()=>{const panel=document.getElementById("aiHistory");panel.hidden=!panel.hidden;renderHistory()});document.getElementById("aiHistoryClose").addEventListener("click",()=>document.getElementById("aiHistory").hidden=true);
  document.querySelectorAll(".ai-quick-prompts button").forEach(button=>button.addEventListener("click",()=>{prompt.value=button.textContent;prompt.focus()}));
  const settings=document.getElementById("aiSettings");document.getElementById("aiSettingsBtn").addEventListener("click",()=>{fillSettings();settings.hidden=false});document.getElementById("aiSettingsClose").addEventListener("click",()=>settings.hidden=true);
  document.getElementById("aiSaveSettings").addEventListener("click",()=>{prefs={language:document.getElementById("aiPrefLanguage").value,style:document.getElementById("aiPrefStyle").value,depth:document.getElementById("aiPrefDepth").value,name:document.getElementById("aiPrefName").value.trim(),instructions:document.getElementById("aiPrefInstructions").value.trim().slice(0,600),memory:document.getElementById("aiPrefMemory").checked};localStorage.setItem(scopedKey("hage-ai-prefs-v1"),JSON.stringify(prefs));save();settings.hidden=true});setupVoice();document.addEventListener("hage:auth-ready",loadCloud);if(window.HageAuth?.user)loadCloud();
}
function fillSettings(){document.getElementById("aiPrefLanguage").value=prefs.language;document.getElementById("aiPrefStyle").value=prefs.style;document.getElementById("aiPrefDepth").value=prefs.depth;document.getElementById("aiPrefName").value=prefs.name;document.getElementById("aiPrefInstructions").value=prefs.instructions;document.getElementById("aiPrefMemory").checked=prefs.memory}
function setupVoice(){const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,button=document.getElementById("aiVoiceBtn");if(!Recognition){button.hidden=true;return}const recognition=new Recognition();recognition.lang="so-SO";recognition.interimResults=false;recognition.onstart=()=>button.classList.add("active");recognition.onend=()=>button.classList.remove("active");recognition.onresult=event=>{document.getElementById("aiPrompt").value=event.results[0][0].transcript};button.addEventListener("click",()=>recognition.start())}
function boot(){createWorkspace();load();render();renderHistory();bind()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
