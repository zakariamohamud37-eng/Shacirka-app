import {Capacitor} from '@capacitor/core';
import {LocalNotifications as N} from '@capacitor/local-notifications';
import {App} from '@capacitor/app';
import {remindersFor} from './reminders';
let queue=Promise.resolve();
const run=fn=>{queue=queue.catch(()=>{}).then(fn);return queue;};
const cancel=async()=>{const {notifications}=await N.getPending();if(notifications.length)await N.cancel({notifications});};
const withBrandIcon=n=>Capacitor.getPlatform()==='android'?{...n,smallIcon:'ic_stat_shacirka',iconColor:'#C79A32'}:n;
async function sync(state){
  return run(async()=>{
    if(!state.notificationsEnabled){await cancel();return {enabled:false};}
    if((await N.checkPermissions()).display!=='granted')return {enabled:false,denied:true};
    const result=remindersFor(state);
    await cancel();
    if(Capacitor.getPlatform()==='android')await N.createChannel({id:'study',name:'Xusuusinta waxbarashada',importance:4,visibility:1,vibration:true});
    const scheduled=await N.schedule({notifications:result.notifications.map(withBrandIcon)});
    return {enabled:true,truncated:result.truncated,warning:scheduled.warning};
  });
}
window.ShacirkaNative={
  isNative:Capacitor.isNativePlatform(),sync,
  async permission(){return (await N.requestPermissions()).display==='granted';},
  async test(){await N.schedule({notifications:[withBrandIcon({id:900000,title:'Shacirka',body:'Ogeysiisyada telefoonka waa la daaray.',schedule:{at:new Date(Date.now()+2000)},channelId:'study'})]});},
  async ready(onResume){
    await App.addListener('appStateChange',({isActive})=>{if(isActive)onResume();});
    await N.addListener('localNotificationActionPerformed',({notification})=>{document.querySelector(`[data-view="${notification.extra?.view||'schedule'}"]`)?.click();});
    if(Capacitor.getPlatform()==='android')await App.addListener('backButton',()=>{
      const modal=document.querySelector('.modal-overlay.open');if(modal){modal.classList.remove('open');return;}
      const panel=document.querySelector('.dropdown-panel.open');if(panel){panel.classList.remove('open');return;}
      if(document.body.dataset.appView!=='home')document.querySelector('[data-view="home"]')?.click();else App.minimizeApp();
    });
  }
};
