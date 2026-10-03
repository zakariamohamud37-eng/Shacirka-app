const DAYS=['Axad','Isniin','Talaado','Arbaco','Khamiis','Jimce','Sabti'];
export function remindersFor(state,now=new Date()){
  const study=[];
  DAYS.forEach((day,d)=>{(state.schedule?.[day]||[]).forEach((r,i)=>{
    if(r.free||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time||''))return;
    const [hour,minute]=r.time.split(':').map(Number);
    study.push({id:100+d*24+i,title:'Waqtigii waxbarashada',body:`Waxaa la joogaa xilligii aad akhrin lahayd ${r.subject}, hadda bilow.`,schedule:{on:{weekday:d+1,hour,minute,second:0},repeats:true,allowWhileIdle:true},channelId:'study',extra:{view:'schedule'}});
  })});
  const exams=[];
  for(const e of state.exams||[]){
    for(const days of [7,3,1,0]){
      const at=new Date(`${e.date}T${days===0?(e.time||'08:00'):'08:00'}:00`);at.setDate(at.getDate()-days);
      if(!Number.isFinite(+at)||at<=now)continue;
      exams.push({at,title:days===0?'Waqtigii imtixaanka':`Imtixaan ${days} maalmood kadib`,body:days===0?`${e.subject}: waqtigii imtixaanka ayaa la gaaray.`:`${e.subject}, diyaar-garowgaaga hubi.`});
    }
  }
  exams.sort((a,b)=>a.at-b.at);
  const slots=Math.max(0,60-study.length);
  const notifications=study.concat(exams.slice(0,slots).map((e,i)=>({id:1000+i,title:e.title,body:e.body,schedule:{at:e.at,allowWhileIdle:true},channelId:'study',extra:{view:'plan'}})));
  return {notifications,truncated:exams.length>slots};
}
