import { admin,getUser } from "@netlify/identity";
import type { Config } from "@netlify/functions";

function isAdmin(user:any){
  const owner=String(Netlify.env.get("HAGE_ADMIN_EMAIL")||"").trim().toLowerCase();
  return Boolean(user&&(user.roles?.includes("admin")||(owner&&String(user.email||"").toLowerCase()===owner)));
}

export default async(req:Request)=>{
  const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)return new Response("Forbidden",{status:403});
  const current=await getUser();if(!isAdmin(current))return new Response("Forbidden",{status:403});
  try{
    if(req.method==="GET"){
      const users=await admin.listUsers({page:1,perPage:100});
      return Response.json({users:users.map(user=>({id:user.id,email:user.email,name:user.name||user.userMetadata?.full_name||"",confirmed:Boolean(user.confirmedAt),createdAt:user.createdAt}))},{headers:{"cache-control":"no-store"}});
    }
    if(req.method==="DELETE"){
      const id=new URL(req.url).searchParams.get("id");if(!id||id===current?.id)return Response.json({error:"Invalid user"},{status:400});
      await admin.deleteUser(id);return Response.json({ok:true});
    }
    return new Response("Method not allowed",{status:405});
  }catch(error){console.error(error);return Response.json({error:"User management failed"},{status:500})}
};

export const config:Config={path:"/api/admin-users",method:["GET","DELETE"]};
