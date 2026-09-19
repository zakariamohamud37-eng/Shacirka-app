import {Capacitor} from '@capacitor/core';
import {LocalNotifications as N} from '@capacitor/local-notifications';
import {App} from '@capacitor/app';
import {Browser} from '@capacitor/browser';
import {remindersFor} from './reminders';

const UPDATE_MANIFEST='https://shacirka-dashboard.netlify.app/version.json';
let queue=Promise.resolve();
const run=fn=>{queue=queue.catch(()=>{}).then(fn);return queue;};
const cancel=async()=>{const {notifications}=await N.getPending();if(notifications.length)await N.cancel({notifications});};
const newer=(a,b)=>{
  const pa=String(a||'0').split('.').map(n=>parseInt(n,10)||0);
  const pb=String(b||'0').split('.').map(n=>parseInt(n,10)||0);
  for(let i=0;i<Math.max(pa.length,pb.length);i++){const x=pa[i]||0,y=pb[i]||0;if(x!==y)return x>y;}
  return false;
};
async function sync(state){
  return run(async()=>{
    if(!state.notificationsEnabled){await cancel();return {enabled:false};}
    if((await N.checkPermissions()).display!=='granted')return {enabled:false,denied:true};
    const result=remindersFor(state);await cancel();
    if(Capacitor.getPlatform()==='android')await N.createChannel({id:'study',name:'Xusuusinta waxbarashada',importance:4,visibility:1,vibration:true});
    const scheduled=await N.schedule({notifications:result.notifications});
    return {enabled:true,truncated:result.truncated,warning:scheduled.warning};
  });
}
async function checkUpdate(force=false){
  if(Capacitor.getPlatform()!=='android')return {available:false};
  try{
    const now=Date.now(),last=Number(localStorage.getItem('shacirkaUpdateLastCheck')||0);
    if(!force&&now-last<6*60*60*1000)return {skipped:true};
    localStorage.setItem('shacirkaUpdateLastCheck',String(now));
    const [info,res]=await Promise.all([App.getInfo(),fetch(`${UPDATE_MANIFEST}?t=${now}`,{cache:'no-store'})]);
    if(!res.ok)throw new Error(`HTTP ${res.status}`);const meta=await res.json();
    if(newer(meta.version,info.version)){
      const ok=confirm(`Shacirka ${meta.version} ayaa diyaar ah. Ma rabtaa inaad hadda update-gareyso?`);
      if(ok&&meta.apkUrl)await Browser.open({url:meta.apkUrl});
      return {available:true,current:info.version,latest:meta.version};
    }
    return {available:false,current:info.version,latest:meta.version};
  }catch(error){return {available:false,error:String(error?.message||error)};}
}
window.ShacirkaNative={
  isNative:Capacitor.isNativePlatform(),sync,checkUpdate,
  async permission(){return (await N.requestPermissions()).display==='granted';},
  async test(){await N.schedule({notifications:[{id:900000,title:'Shacirka',body:'Ogeysiisyada telefoonka waa la daaray.',schedule:{at:new Date(Date.now()+2000)},channelId:'study'}]});},
  async ready(onResume){
    await App.addListener('appStateChange',({isActive})=>{if(isActive){onResume();checkUpdate(false);}});
    await N.addListener('localNotificationActionPerformed',({notification})=>{document.querySelector(`[data-view="${notification.extra?.view||'schedule'}"]`)?.click();});
    if(Capacitor.getPlatform()==='android')await App.addListener('backButton',()=>{
      const modal=document.querySelector('.modal-overlay.open');if(modal){modal.classList.remove('open');return;}
      const panel=document.querySelector('.dropdown-panel.open');if(panel){panel.classList.remove('open');return;}
      if(document.body.dataset.appView!=='home')document.querySelector('[data-view="home"]')?.click();else App.minimizeApp();
    });
    setTimeout(()=>checkUpdate(false),2500);
  }
};
