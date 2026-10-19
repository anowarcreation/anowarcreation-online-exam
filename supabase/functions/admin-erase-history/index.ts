import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const out=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return out({error:"POST requests only."},405);
  try {
    const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("EXAM_SUPABASE_KEY");
    if(!url||!key) return out({error:"Server configuration is incomplete."},500);
    const auth=req.headers.get("Authorization")||""; const token=auth.replace(/^Bearer\s+/i,"");
    if(!token) return out({error:"Admin sign-in is required."},401);
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:userErr}=await db.auth.getUser(token);
    if(userErr||!userData.user) return out({error:"Your admin session is invalid. Sign in again."},401);
    const {data:profile,error:profileErr}=await db.from("admin_profiles").select("role").eq("user_id",userData.user.id).maybeSingle();
    if(profileErr||!profile||!(["admin","exam_manager"].includes(profile.role))) return out({error:"You do not have permission to erase test history."},403);
    const body=await req.json(); const all=body?.all===true; const raw=Array.isArray(body?.attemptIds)?body.attemptIds:[];
    if(!all && (!raw.length || raw.length>500 || raw.some((x:unknown)=>typeof x!=="string"||!/^[0-9a-f-]{36}$/i.test(x)))) return out({error:"Select between 1 and 500 valid test attempts."},400);
    let ids:string[]=[];
    if(all){
      const {data,error}=await db.from("ac_exam_attempts").select("id").limit(10000);
      if(error) throw error; ids=(data||[]).map((x:any)=>x.id);
      if(ids.length>=10000) return out({error:"There are 10,000 or more attempts. Use selected deletion in batches to avoid an incomplete erase."},409);
    } else {
      const {data,error}=await db.from("ac_exam_attempts").select("id").in("id",raw);
      if(error) throw error; ids=(data||[]).map((x:any)=>x.id);
    }
    if(!ids.length) return out({deletedAttempts:0,deletedAnswers:0,deletedCertificates:0});
    let deletedAnswers=0,deletedCertificates=0,deletedAttempts=0;
    for(let i=0;i<ids.length;i+=100){
      const batch=ids.slice(i,i+100);
      const {data:answers,error:answerErr}=await db.from("ac_exam_answers").delete().in("attempt_id",batch).select("attempt_id");
      if(answerErr) throw answerErr; deletedAnswers+=(answers||[]).length;
      const {data:certs,error:certErr}=await db.from("ac_exam_certificates").delete().in("attempt_id",batch).select("attempt_id");
      if(certErr) throw certErr; deletedCertificates+=(certs||[]).length;
      const {data:attempts,error:attemptErr}=await db.from("ac_exam_attempts").delete().in("id",batch).select("id");
      if(attemptErr) throw attemptErr; deletedAttempts+=(attempts||[]).length;
    }
    return out({deletedAttempts,deletedAnswers,deletedCertificates});
  } catch(e) { console.error("admin-erase-history error",e); return out({error:"Could not erase test history. Check table names, foreign keys, and server configuration."},500); }
});
