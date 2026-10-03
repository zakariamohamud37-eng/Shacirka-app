import {getStore} from "@netlify/blobs";
import type {Config} from "@netlify/functions";
import {assertSameOrigin,handledError,requireUser} from "./_shared/ai-security";
function clean(body:any){
  const conversations=Array.isArray(body?.conversations)?body.conversations.slice(0,40).map((chat:any)=>({
    id:String(chat?.id||"").slice(0,80),title:String(chat?.title||"Wadahadal cusub").slice(0,100),createdAt:Number(chat?.createdAt)||Date.now(),updatedAt:Number(chat?.updatedAt)||Date.now(),
    messages:Array.isArray(chat?.messages)?chat.messages.slice(-80).filter((m:any)=>["user","assistant"].includes(m?.role)&&typeof m?.content==="string").map((m:any)=>({role:m.role,content:m.content.slice(0,16000),time:Number(m.time)||Date.now()})):[]
  })).filter((chat:any)=>chat.id):[];
  return {version:2,updatedAt:Number(body?.updatedAt)||Date.now(),conversations};
}
export default async(req:Request)=>{
  try{
    assertSameOrigin(req);const user=await requireUser();const store=getStore({name:"hage-private-ai-history",consistency:"strong"});const key=`users/${user.id}/conversations`;
    if(req.method==="GET"){const value=await store.get(key,{type:"json"});return Response.json(value||{version:2,updatedAt:0,conversations:[]},{headers:{"cache-control":"no-store"}})}
    if(req.method==="PUT"){
      if(Number(req.headers.get("content-length")||0)>1_800_000)return Response.json({error:"Wadahadalladu aad bay u waaweyn yihiin."},{status:413});
      const record=clean(await req.json().catch(()=>null));await store.setJSON(key,record);return Response.json({ok:true,updatedAt:record.updatedAt});
    }
    return new Response("Method not allowed",{status:405});
  }catch(error){return handledError(error)}
};
export const config:Config={path:"/api/ai-conversations",method:["GET","PUT"]};
