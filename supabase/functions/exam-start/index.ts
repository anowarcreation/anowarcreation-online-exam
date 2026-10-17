import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
async function sha256(text: string) { const bytes = new TextEncoder().encode(text.trim()); const hash = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join(""); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "POST requests only." }, 405);
  try {
    const body = await req.json();
    const studentName = String(body.studentName ?? "").trim().slice(0, 100);
    const rollNumber = String(body.rollNumber ?? "").trim().slice(0, 40);
    const examCode = String(body.examCode ?? "").trim();
    if (!studentName || !rollNumber || !examCode) return respond({ error: "Enter your name, roll number, and exam code." }, 400);
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("EXAM_SUPABASE_KEY");
    if (!url || !key) return respond({ error: "Server configuration is incomplete." }, 500);
    const db = createClient(url, key);
    const hash = await sha256(examCode);
    const { data: exam, error: ee } = await db.from("ac_exams").select("id,title,subject,duration_minutes,positive_marks,negative_marks,pass_percentage,is_published,instructions,exam_code_hash").eq("exam_code_hash", hash).maybeSingle();
    if (ee) throw ee;
    if (!exam) return respond({ error: "Invalid exam code." }, 401);
    if (!exam.is_published) return respond({ error: "This exam is currently closed. New responses are not being accepted." }, 403);
    const now = new Date();
    const { data: questions, error: qe } = await db.from("ac_exam_questions").select("id,chapter,question_text,options,sort_order").eq("exam_id", exam.id).order("sort_order", { ascending: true });
    if (qe) throw qe;
    if (!questions?.length) return respond({ error: "No questions are available for this exam." }, 409);
    const { data: attempt, error: ae } = await db.from("ac_exam_attempts").insert({ exam_id: exam.id, student_name: studentName, roll_number: rollNumber, started_at: now.toISOString(), status: "in_progress" }).select("id,exam_id,started_at,status").single();
    if (ae) throw ae;
    return respond({ attempt, exam: { id: exam.id, title: exam.title, subject: exam.subject, duration_minutes: exam.duration_minutes, positive_marks: exam.positive_marks, negative_marks: exam.negative_marks, pass_percentage: exam.pass_percentage, instructions: exam.instructions || "" }, questions });
  } catch (error) { console.error("exam-start failed", error); return respond({ error: "Unable to start exam. Please try again or contact the administrator." }, 500); }
});
