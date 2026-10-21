import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    // Use the standard Supabase service-role secret, with this project's existing
    // EXAM_SUPABASE_KEY as a fallback. This value must be the service_role key,
    // never the publishable/anon key, so RLS-protected answer rows can be deleted.
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("EXAM_SUPABASE_KEY");
    if (!service) throw new Error("Missing service-role secret: set SUPABASE_SERVICE_ROLE_KEY (or EXAM_SUPABASE_KEY to the service_role key) in Edge Function secrets");
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) throw new Error("Admin login required");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Session invalid; sign in again");
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    // The profile table is the primary authorization source. The configured owner UUID
    // is a tightly scoped fallback for this project, only after Supabase verifies the JWT.
    const { data: profile, error: profErr } = await db.from("admin_profiles").select("role").eq("user_id", userData.user.id).maybeSingle();
    const configuredOwnerId = "d3334656-ab3b-4abd-b22e-d9e264888bda";
    const profileAllows = !profErr && !!profile && ["admin", "exam_manager"].includes(profile.role);
    const configuredOwnerAllows = userData.user.id === configuredOwnerId;
    if (!profileAllows && !configuredOwnerAllows) {
      console.error("admin-erase-history authorization failed", { userId: userData.user.id, profileError: profErr?.message || null, profileFound: !!profile, role: profile?.role || null });
      throw new Error(profErr ? `Admin profile lookup failed: ${profErr.message}` : "Admin permission required for this signed-in account");
    }
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
    // This project's answer/certificate tables may not have an `id` column.
    // Count by attempt_id, then delete without selecting a nonexistent column.
    const answerCount = await db.from("ac_exam_answers").select("attempt_id", { count: "exact", head: true }).in("attempt_id", actualIds);
    if (answerCount.error) throw new Error(`Could not inspect saved answers: ${answerCount.error.message}`);
    const answerResult = await db.from("ac_exam_answers").delete().in("attempt_id", actualIds);
    if (answerResult.error) throw new Error(`Could not delete saved answers: ${answerResult.error.message}`);
    deletedAnswers = answerCount.count || 0;

    const certCount = await db.from("ac_exam_certificates").select("attempt_id", { count: "exact", head: true }).in("attempt_id", actualIds);
    if (certCount.error && !/does not exist|schema cache/i.test(certCount.error.message)) throw new Error(`Could not inspect certificates: ${certCount.error.message}`);
    if (!certCount.error) {
      const certResult = await db.from("ac_exam_certificates").delete().in("attempt_id", actualIds);
      if (certResult.error && !/does not exist|schema cache/i.test(certResult.error.message)) throw new Error(`Could not delete certificates: ${certResult.error.message}`);
      deletedCertificates = certCount.count || 0;
    }

    const deleteResult = await db.from("ac_exam_attempts").delete().in("id", actualIds);
    if (deleteResult.error) throw deleteResult.error;
    return new Response(JSON.stringify({ deletedAttempts: actualIds.length, deletedAnswers, deletedCertificates }), { headers: cors });
  } catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }), { status: 400, headers: cors }); }
});
