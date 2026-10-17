import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "POST requests only." }, 405);
  try {
    const body = await req.json(); const certificateNo = String(body.certificate_no ?? "").trim();
    if (!certificateNo || certificateNo.length > 100) return respond({ valid: false, error: "Invalid certificate number." }, 400);
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("EXAM_SUPABASE_KEY");
    if (!url || !key) return respond({ error: "Server configuration is incomplete." }, 500);
    const db = createClient(url, key);
    const { data: cert, error } = await db.from("ac_exam_certificates").select("certificate_no,issued_at,revoked_at,attempt_id,ac_exam_attempts(student_name,roll_number,score,status,exam_id,ac_exams(title,pass_percentage,positive_marks))").eq("certificate_no", certificateNo).maybeSingle();
    if (error) throw error;
    const a = cert?.ac_exam_attempts; const exam = a?.ac_exams;
    if (!cert || cert.revoked_at || !a || a.status !== "submitted" || !exam) return respond({ valid: false }, 200);
    const { count, error: countError } = await db.from("ac_exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", a.exam_id);
    if (countError) throw countError;
    const max = Number(count || 0) * Number(exam.positive_marks || 4); const pct = max > 0 ? Math.max(0, Number(a.score || 0)) / max * 100 : 0;
    if (pct < Number(exam.pass_percentage ?? 40)) return respond({ valid: false }, 200);
    return respond({ valid: true, certificate_no: cert.certificate_no, student_name: a.student_name, exam_title: exam.title, result: "PASS", issued_at: cert.issued_at });
  } catch (error) { console.error("verify-certificate failed:", error); return respond({ error: "Unable to verify certificate." }, 500); }
});
