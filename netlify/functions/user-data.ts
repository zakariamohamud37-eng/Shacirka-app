import {getStore} from "@netlify/blobs";
import type {Config} from "@netlify/functions";
import {assertSameOrigin,handledError,requireUser} from "./_shared/ai-security";
export default async(req:Request)=>{
  try{
    assertSameOrigin(req);const user=await requireUser();const store=getStore({name:"hage-private-user-data",consistency:"strong"});const key=`users/${user.id}/app-state`;
    if(req.method==="GET"){const value=await store.get(key,{type:"json"});return Response.json({data:value||null},{headers:{"cache-control":"no-store"}})}
    if(req.method==="PUT"){
      if(Number(req.headers.get("content-length")||0)>1_500_000)return Response.json({error:"Xogtu aad bay u weyn tahay."},{status:413});
      const body=await req.json().catch(()=>null) as any;if(!body||typeof body!=="object")return Response.json({error:"Xog aan sax ahayn."},{status:400});
      const record={version:1,updatedAt:Number(body.updatedAt)||Date.now(),activeLevel:String(body.activeLevel||"form4").slice(0,30),profiles:body.profiles};
      if(!record.profiles||typeof record.profiles!=="object")return Response.json({error:"Xog aan sax ahayn."},{status:400});
      await store.setJSON(key,record);return Response.json({ok:true,updatedAt:record.updatedAt});
    }
    return new Response("Method not allowed",{status:405});
  }catch(error){return handledError(error)}
};
export const config:Config={path:"/api/user-data",method:["GET","PUT"]};
