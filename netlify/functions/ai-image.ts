import OpenAI from "openai";
import type { Config } from "@netlify/functions";
import { assertSameOrigin,handledError,rateLimit,requireUser } from "./_shared/ai-security";

export default async(req:Request)=>{
  try{
    assertSameOrigin(req);const user=await requireUser();await rateLimit(user.id,"image");
    if(Number(req.headers.get("content-length")||0)>30_000)return Response.json({error:"Codsigu aad buu u weyn yahay."},{status:413});
    const body=await req.json().catch(()=>null) as any,prompt=String(body?.prompt||"").trim().slice(0,1800);if(!prompt)return Response.json({error:"Qor sawirka aad rabto."},{status:400});
    const language=body?.prefs?.language==="ar"?"Arabic":body?.prefs?.language==="en"?"English":"Somali when text is needed";
    const client=new OpenAI();
    const result=await client.images.generate({model:"gpt-image-1.5",prompt:`Create a polished, high-quality image that follows this request: ${prompt}. Any visible text should be in ${language}. Do not add a watermark. Respect the user's requested style, composition, lighting, and subject.`,size:"1024x1024"});
    const item=result.data?.[0];const image=item?.b64_json?`data:image/png;base64,${item.b64_json}`:item?.url;
    if(!image)throw new Error("No image returned");
    return Response.json({image,revisedPrompt:item?.revised_prompt||prompt},{headers:{"cache-control":"no-store"}});
  }catch(error){return handledError(error)}
};

export const config:Config={path:"/api/ai-image",method:"POST"};
