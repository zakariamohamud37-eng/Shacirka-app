import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

export async function requireUser() {
  const user=await getUser();
  if(!user)throw new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
  return user;
}

export function assertSameOrigin(req:Request){
  const origin=req.headers.get("origin");
  if(origin&&origin!==new URL(req.url).origin)throw new Response(JSON.stringify({error:"Forbidden"}),{status:403,headers:{"content-type":"application/json"}});
}

export async function rateLimit(userId:string,kind:"chat"|"image"){
  const store=getStore({name:"hage-ai-rate-limits",consistency:"strong"});
  const hour=new Date().toISOString().slice(0,13),key=`${kind}:${userId}:${hour}`;
  const current=Number(await store.get(key)||0),limit=kind==="image"?5:30;
  if(current>=limit)throw new Response(JSON.stringify({error:kind==="image"?"Waxaad gaartay xadka sawirrada saacaddan. Saacad kadib isku day.":"Waxaad gaartay xadka AI-ga saacaddan. Wax yar kadib isku day."}),{status:429,headers:{"content-type":"application/json"}});
  await store.set(key,String(current+1),{metadata:{expiresAfter:"2 hours"}});
}

export function handledError(error:unknown){
  if(error instanceof Response)return error;
  console.error(error);
  return Response.json({error:"Hage AI hadda lama heli karo."},{status:500});
}

