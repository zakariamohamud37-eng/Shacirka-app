(function(){
"use strict";

const USER_SCOPE_KEY="hage-auth-user-id";
const defaultPrefs={language:"auto",style:"teacher",depth:"balanced",name:"",instructions:"",memory:true};
let prefs={...defaultPrefs},messages=[],attachment=null,busy=false;

const scopedKey=name=>`${name}:${localStorage.getItem(USER_SCOPE_KEY)||"guest"}`;
const safeParse=(value,fallback)=>{try{return JSON.parse(value)||fallback}catch(_error){return fallback}};
const escapeHtml=value=>String(value||"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function createWorkspace(){
  if(document.getElementById("aiWorkspace"))return;
  const section=document.createElement("section");section.id="aiWorkspace";section.className="ai-workspace card";section.dataset.appView="ai";
  section.innerHTML=`
    <div class="ai-head"><div><div class="ai-kicker">HAGE AI</div><h2>Kaaliyahaaga Waxbarashada</h2><p>Weydii su'aal, geli sawir ama PDF, ama samee sawir waxbarasho.</p></div><div class="ai-head-actions"><button id="aiNewChat" type="button" title="Wadahadal cusub">＋</button><button id="aiSettingsBtn" type="button" title="Personalization">⚙</button></div></div>
    <div class="ai-quick-prompts"><button type="button">Casharkan ii sharax si fudud</button><button type="button">Ii samee qorshe waxbarasho</button><button type="button">Imtixaan gaaban iga qaad</button><button type="button">Soo koob qoraalkan</button></div>
    <div class="ai-messages" id="aiMessages" aria-live="polite"></div>
    <div class="ai-attachment" id="aiAttachment" hidden></div>
    <div class="ai-composer">
      <textarea id="aiPrompt" rows="1" placeholder="Wax kasta i weydii…" aria-label="Farriinta AI"></textarea>
      <div class="ai-composer-actions"><div><button id="aiAttachBtn" type="button" title="Sawir ama file geli">📎</button><button id="aiVoiceBtn" type="button" title="Cod ku qor">🎙</button><button id="aiImageMode" type="button" title="Sawir samee">🎨 <span>Sawir</span></button></div><button class="ai-send" id="aiSendBtn" type="button">Dir ➤</button></div>
      <input id="aiFileInput" type="file" accept="image/*,.pdf,.txt,.md,.csv" hidden>
    </div>
    <p class="ai-disclaimer">AI mararka qaar wuu khaldami karaa. Xogta muhiimka ah dib u hubi.</p>
    <div class="ai-settings" id="aiSettings" hidden><div class="ai-settings-card"><div class="ai-settings-head"><div><strong>Personalization</strong><span>U sheeg AI sida uu kuugu jawaabo</span></div><button id="aiSettingsClose" type="button">✕</button></div>
      <label>Magaca uu kuugu yeero<input id="aiPrefName" placeholder="Tusaale: Zakaria"></label>
      <label>Luqadda jawaabta<select id="aiPrefLanguage"><option value="auto">La jaanqaad su'aasha</option><option value="so">Af Soomaali</option><option value="en">English</option><option value="ar">العربية</option></select></label>
      <label>Habka waxbaridda<select id="aiPrefStyle"><option value="teacher">Macallin dulqaad leh</option><option value="coach">Tababare dhiirrigeliya</option><option value="exam">Diyaarinta imtixaanka</option><option value="academic">Academic / jaamacadeed</option></select></label>
      <label>Faahfaahinta<select id="aiPrefDepth"><option value="short">Kooban</option><option value="balanced">Dheellitiran</option><option value="deep">Qoto dheer</option></select></label>
      <label>Tilmaamo gaar ah<textarea id="aiPrefInstructions" rows="3" placeholder="Tusaale: Isticmaal tusaalooyin badan..."></textarea></label>
      <label class="ai-check"><input id="aiPrefMemory" type="checkbox"> Xasuuso wada-hadalkan qalabkan</label>
      <button class="ai-save-settings" id="aiSaveSettings" type="button">Kaydi personalization</button>
    </div></div>`;
  document.querySelector(".app-shell")?.insertBefore(section,document.querySelector(".footer"));
  const nav=document.querySelector(".bottom-nav");if(nav&&!nav.querySelector('[data-view="ai"]'))nav.insertAdjacentHTML("beforeend",'<button data-view="ai"><span>✦</span>Hage AI</button>');
}

function greeting(){
  return {role:"assistant",content:"Salaan! Waxaan ahay Hage AI. Waxaan kaa caawin karaa sharaxaadda casharrada, qorshaha waxbarashada, su'aalaha imtixaanka, sawirrada iyo PDF-yada. Maxaan kuu qabtaa?",time:Date.now()};
}

function load(){
  prefs={...defaultPrefs,...safeParse(localStorage.getItem(scopedKey("hage-ai-prefs-v1")),{})};
  messages=prefs.memory?safeParse(localStorage.getItem(scopedKey("hage-ai-history-v1")),[]):[];
  if(!Array.isArray(messages)||!messages.length)messages=[greeting()];
}

function save(){if(prefs.memory)localStorage.setItem(scopedKey("hage-ai-history-v1"),JSON.stringify(messages.slice(-40)));else localStorage.removeItem(scopedKey("hage-ai-history-v1"))}

function render(){
  const box=document.getElementById("aiMessages");if(!box)return;
  box.innerHTML=messages.map((message,index)=>`<article class="ai-message ${message.role}"><div class="ai-message-avatar">${message.role==="assistant"?"✦":"Adiga"}</div><div class="ai-bubble">${message.image?`<img src="${message.image}" alt="Sawir uu sameeyay Hage AI">`:formatText(message.content)}${message.role==="assistant"&&!message.pending?`<div class="ai-message-tools"><button type="button" data-copy-message="${index}">Nuqul</button></div>`:""}</div></article>`).join("");
  box.querySelectorAll("[data-copy-message]").forEach(button=>button.addEventListener("click",async()=>{await navigator.clipboard.writeText(messages[Number(button.dataset.copyMessage)].content||"");button.textContent="La nuqulay"}));
  box.scrollTop=box.scrollHeight;
}

function formatText(value){
  const safe=escapeHtml(value);return safe.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/^### (.+)$/gm,"<h4>$1</h4>").replace(/^[-•] (.+)$/gm,"<span class='ai-list-item'>• $1</span>").replace(/\n/g,"<br>");
}

function currentStudyContext(){
  try{return {level:typeof ACTIVE_LEVEL!=="undefined"?ACTIVE_LEVEL:"unknown",subjects:typeof STATE!=="undefined"&&STATE?.subjects?STATE.subjects.map(s=>({name:s.name,grade:s.grade,progress:s.progress,status:s.status})).slice(0,20):[]}}catch(_error){return {level:"unknown",subjects:[]}}
}

async function readAttachment(file){
  if(file.size>8*1024*1024)throw new Error("Faylku waa ka weyn yahay 8 MB.");
  if(file.type.startsWith("image/")){
    if(file.size>4*1024*1024)throw new Error("Sawirku waa ka weyn yahay 4 MB.");
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
    return {kind:"image",name:file.name,data};
  }
  if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
    if(!window.ShacirkaPDF)throw new Error("PDF-ga lama akhrin karo hadda.");
    const pdf=await window.ShacirkaPDF.getDocument({data:await file.arrayBuffer()}).promise;let text="";const totalPages=pdf.numPages,pages=Math.min(totalPages,80);
    for(let pageNumber=1;pageNumber<=pages&&text.length<70000;pageNumber++){const page=await pdf.getPage(pageNumber),content=await page.getTextContent();text+=`\n\n[Bog ${pageNumber}]\n`+content.items.map(item=>item.str).join(" ")}
    await pdf.destroy();return {kind:"document",name:file.name,text:text.slice(0,70000),meta:`${totalPages} bog`};
  }
  const text=(await file.text()).slice(0,70000);return {kind:"document",name:file.name,text,meta:`${Math.round(file.size/1024)} KB`};
}

function showAttachment(){
  const box=document.getElementById("aiAttachment");if(!attachment){box.hidden=true;box.innerHTML="";return}
  box.hidden=false;box.innerHTML=`<span>${attachment.kind==="image"?"🖼️":"📄"}</span><div><strong>${escapeHtml(attachment.name)}</strong><small>${escapeHtml(attachment.meta||"Diyaar")}</small></div><button type="button" aria-label="Ka saar">✕</button>`;
  box.querySelector("button").addEventListener("click",()=>{attachment=null;showAttachment()});
}

async function send(){
  if(busy)return;const input=document.getElementById("aiPrompt"),prompt=input.value.trim();if(!prompt&&!attachment)return;
  const imageMode=document.getElementById("aiImageMode").classList.contains("active");
  messages.push({role:"user",content:prompt||(attachment?.kind==="image"?"Sharax sawirkan.":"Soo koob faylkan."),time:Date.now()});
  const pending={role:"assistant",content:imageMode?"Sawirka ayaa la sameynayaa…":"Waan ka fikirayaa…",pending:true,time:Date.now()};messages.push(pending);render();
  const payloadAttachment=attachment;attachment=null;showAttachment();input.value="";setBusy(true);
  try{
    const endpoint=imageMode?"/api/ai-image":"/api/ai-chat";
    const body=imageMode?{prompt:messages[messages.length-2].content,prefs}:{messages:messages.filter(x=>!x.pending&&!x.image).slice(-16).map(({role,content})=>({role,content})),prefs,attachment:payloadAttachment,context:currentStudyContext()};
    const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"AI request failed");
    pending.pending=false;pending.content=data.answer||data.revisedPrompt||"Sawirka waa diyaar.";if(data.image)pending.image=data.image;
    save();render();
  }catch(error){pending.pending=false;pending.content=error.message.includes("Unauthorized")?"Fadlan marka hore akoonkaaga ku gal.":"Hage AI hadda jawaab ma bixin karo. Wax yar kadib mar kale isku day.";render()}
  finally{setBusy(false)}
}

function setBusy(value){busy=value;document.getElementById("aiSendBtn").disabled=value;document.getElementById("aiSendBtn").textContent=value?"…":"Dir ➤"}

function bind(){
  document.querySelector('.bottom-nav [data-view="ai"]')?.addEventListener("click",event=>{document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.remove("active"));event.currentTarget.classList.add("active");document.body.dataset.appView="ai";window.scrollTo({top:0,behavior:"smooth"})});
  document.getElementById("aiSendBtn").addEventListener("click",send);
  const prompt=document.getElementById("aiPrompt");prompt.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send()}});prompt.addEventListener("input",()=>{prompt.style.height="auto";prompt.style.height=Math.min(prompt.scrollHeight,130)+"px"});
  document.getElementById("aiAttachBtn").addEventListener("click",()=>document.getElementById("aiFileInput").click());
  document.getElementById("aiFileInput").addEventListener("change",async event=>{const file=event.target.files?.[0];if(!file)return;const box=document.getElementById("aiAttachment");box.hidden=false;box.textContent="Faylka ayaa la diyaarinayaa…";try{attachment=await readAttachment(file);showAttachment()}catch(error){attachment=null;showAttachment();alert(error.message)}event.target.value=""});
  document.getElementById("aiImageMode").addEventListener("click",event=>event.currentTarget.classList.toggle("active"));
  document.getElementById("aiNewChat").addEventListener("click",()=>{if(messages.length>1&&!confirm("Ma bilownaa wada-hadal cusub?"))return;messages=[greeting()];save();render()});
  document.querySelectorAll(".ai-quick-prompts button").forEach(button=>button.addEventListener("click",()=>{prompt.value=button.textContent;prompt.focus()}));
  const settings=document.getElementById("aiSettings");document.getElementById("aiSettingsBtn").addEventListener("click",()=>{fillSettings();settings.hidden=false});document.getElementById("aiSettingsClose").addEventListener("click",()=>settings.hidden=true);
  document.getElementById("aiSaveSettings").addEventListener("click",()=>{prefs={language:document.getElementById("aiPrefLanguage").value,style:document.getElementById("aiPrefStyle").value,depth:document.getElementById("aiPrefDepth").value,name:document.getElementById("aiPrefName").value.trim(),instructions:document.getElementById("aiPrefInstructions").value.trim().slice(0,600),memory:document.getElementById("aiPrefMemory").checked};localStorage.setItem(scopedKey("hage-ai-prefs-v1"),JSON.stringify(prefs));save();settings.hidden=true});
  setupVoice();
}

function fillSettings(){document.getElementById("aiPrefLanguage").value=prefs.language;document.getElementById("aiPrefStyle").value=prefs.style;document.getElementById("aiPrefDepth").value=prefs.depth;document.getElementById("aiPrefName").value=prefs.name;document.getElementById("aiPrefInstructions").value=prefs.instructions;document.getElementById("aiPrefMemory").checked=prefs.memory}

function setupVoice(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,button=document.getElementById("aiVoiceBtn");if(!Recognition){button.hidden=true;return}
  const recognition=new Recognition();recognition.lang="so-SO";recognition.interimResults=false;recognition.onstart=()=>button.classList.add("active");recognition.onend=()=>button.classList.remove("active");recognition.onresult=event=>{document.getElementById("aiPrompt").value=event.results[0][0].transcript};button.addEventListener("click",()=>recognition.start());
}

function boot(){createWorkspace();load();render();bind()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
