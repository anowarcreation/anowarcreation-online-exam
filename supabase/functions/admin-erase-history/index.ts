import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) throw new Error("Admin login required");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Session invalid; sign in again");
    const db = createClient(url, service);
    const { data: profile, error: profErr } = await db.from("admin_profiles").select("role").eq("user_id", userData.user.id).maybeSingle();
    if (profErr || !profile || !["admin", "exam_manager"].includes(profile.role)) throw new Error("Admin permission required");
    const body = await req.json();
    const all = body?.all === true;
    const ids = Array.isArray(body?.attemptIds) ? body.attemptIds.filter((x: unknown) => typeof x === "string") : [];
    if (!all && ids.length === 0) throw new Error("Select at least one attempt");
    let attemptQuery = db.from("ac_exam_attempts").select("id");
    if (!all) attemptQuery = attemptQuery.in("id", ids);
    const { data: attempts, error: attemptsErr } = await attemptQuery;
    if (attemptsErr) throw attemptsErr;
    const actualIds = (attempts || []).map((a: {id:string}) => a.id);
    if (!actualIds.length) return new Response(JSON.stringify({ deletedAttempts: 0, deletedAnswers: 0, deletedCertificates: 0 }), { headers: cors });
    let deletedAnswers = 0, deletedCertificates = 0;
    // Delete dependent records first. Table names follow this project's schema.
    const answerResult = await db.from("ac_exam_answers").delete().in("attempt_id", actualIds).select("id");
    if (answerResult.error) throw new Error(`Could not delete saved answers: ${answerResult.error.message}`);
    deletedAnswers = answerResult.data?.length || 0;
    const certResult = await db.from("ac_exam_certificates").delete().in("attempt_id", actualIds).select("id");
    if (certResult.error && !/does not exist|schema cache/i.test(certResult.error.message)) throw new Error(`Could not delete certificates: ${certResult.error.message}`);
    deletedCertificates = certResult.data?.length || 0;
    const deleteResult = await db.from("ac_exam_attempts").delete().in("id", actualIds).select("id");
    if (deleteResult.error) throw deleteResult.error;
    return new Response(JSON.stringify({ deletedAttempts: deleteResult.data?.length || 0, deletedAnswers, deletedCertificates }), { headers: cors });
  } catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }), { status: 400, headers: cors }); }
});
