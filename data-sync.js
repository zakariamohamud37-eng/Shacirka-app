(function(){
"use strict";
const scope=()=>localStorage.getItem("hage-auth-user-id")||"guest";
const modifiedKey=()=>`hage-data-modified-v1:${scope()}`;
let timer=null,syncing=false;
function snapshot(){
  try{return {version:1,updatedAt:Number(localStorage.getItem(modifiedKey()))||Date.now(),activeLevel:ACTIVE_LEVEL,profiles:PROFILE_STATES}}catch(_error){return null}
}
async function push(){
  if(syncing||!window.HageAuth?.user||!navigator.onLine)return;const data=snapshot();if(!data)return;syncing=true;
  try{const response=await fetch("/api/user-data",{method:"PUT",headers:{"content-type":"application/json"},credentials:"include",body:JSON.stringify(data)});if(response.ok)localStorage.setItem(`hage-data-synced-v1:${scope()}`,String(data.updatedAt))}catch(_error){}finally{syncing=false}
}
function schedule(){
  localStorage.setItem(modifiedKey(),String(Date.now()));clearTimeout(timer);timer=setTimeout(push,1100);
}
async function pull(){
  if(!window.HageAuth?.user)return;
  try{
    const response=await fetch("/api/user-data",{credentials:"include"});if(!response.ok)return;const {data}=await response.json(),localModified=Number(localStorage.getItem(modifiedKey()))||0;
    if(data?.profiles&&Number(data.updatedAt)>localModified){
      localStorage.setItem(`hage-study-profiles-v1:${scope()}`,JSON.stringify(data.profiles));localStorage.setItem(`hage-study-level-v1:${scope()}`,data.activeLevel||"form4");localStorage.setItem(modifiedKey(),String(data.updatedAt));localStorage.setItem(`hage-data-synced-v1:${scope()}`,String(data.updatedAt));location.reload();return;
    }
    if(!data){localStorage.setItem(modifiedKey(),String(Date.now()));push()}
  }catch(_error){}
}
window.HageCloudSync={schedule,push,pull};
document.addEventListener("hage:auth-ready",pull);window.addEventListener("online",push);window.addEventListener("pagehide",push);
if(window.HageAuth?.user)pull();
})();
