/* Runs after the dashboard so native scheduling replaces browser push. */
if(window.ShacirkaNative?.isNative){
  const native=window.ShacirkaNative;
  let timer,signature='';
  document.getElementById('installBtn').style.display='none';
  checkScheduledNotifications=()=>{};
  const old=document.getElementById('switchNotif'),toggle=old.cloneNode(true);old.replaceWith(toggle);
  async function sync(force=false){
    if(!STATE)return;
    const snapshot=JSON.parse(JSON.stringify(STATE));
    const key=JSON.stringify([snapshot.notificationsEnabled,snapshot.schedule,snapshot.exams,new Date().toDateString()]);
    if(!force&&key===signature)return;
    try{
      const result=await native.sync(snapshot);
      toggle.classList.toggle('on',!!result.enabled);
      if(result.denied){pushStatus('Fadlan Settings-ka telefoonka ka oggolow ogeysiisyada.');return;}
      signature=key;
      pushStatus(!result.enabled?'Ogeysiisyada waa dansan yihiin.':result.warning?'Ogeysiiska waa shidan yahay, laakiin waqtigu wuu dib dhici karaa. Oggolow Alarms & reminders.':result.truncated?'Ogeysiiska waa shidan yahay. App-ka toddobaad kasta fur si imtixaannada dambe loo cusboonaysiiyo.':'Ogeysiisyada telefoonka waa shidan yihiin, internet uma baahna.');
    }catch(e){console.error(e);pushStatus('Jadwalka ogeysiisyada lama kaydin. Mar kale isku day.');throw e;}
  }
  schedulePushSync=()=>{clearTimeout(timer);timer=setTimeout(()=>sync().catch(()=>{}),500);};
  toggle.addEventListener('click',async()=>{
    toggle.disabled=true;
    try{
      if(!STATE.notificationsEnabled&&!(await native.permission())){pushStatus('Ogeysiisyada lama oggolaan. Ka oggolow Settings-ka telefoonka.');return;}
      STATE.notificationsEnabled=!STATE.notificationsEnabled;
      await sync(true);saveState();
      if(STATE.notificationsEnabled)await native.test();
    }catch{alert('Ogeysiisyada lama kaydin. Hubi oggolaanshaha telefoonka oo mar kale isku day.');}
    finally{toggle.disabled=false;}
  });
  native.ready(()=>sync(true).catch(()=>{}));
}
