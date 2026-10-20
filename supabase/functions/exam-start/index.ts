import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
async function sha256(text: string) { const bytes = new TextEncoder().encode(text.trim()); const hash = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join(""); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("EXAM_SUPABASE_KEY");
    if (!url || !key) return respond({ error: "Server configuration is incomplete." }, 500);
    const db = createClient(url, key);
    // Public, non-secret overview used to keep the student landing page in sync with Admin settings.
    if (req.method === "GET") {
      const { data: exams, error } = await db.from("ac_exams")
        .select("id,title,subject,duration_minutes,positive_marks,negative_marks,pass_percentage,is_published,created_at")
        .order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      const exam = exams?.[0];
      if (!exam) return respond({ available: false });
      const { count, error: countError } = await db.from("ac_exam_questions")
        .select("id", { count: "exact", head: true }).eq("exam_id", exam.id);
      if (countError) throw countError;
      return respond({ available: true, exam: {
        title: exam.title, subject: exam.subject, duration_minutes: exam.duration_minutes,
        question_count: count ?? 0, positive_marks: exam.positive_marks,
        negative_marks: exam.negative_marks, pass_percentage: exam.pass_percentage,
        is_published: Boolean(exam.is_published)
      }});
    }
    if (req.method !== "POST") return respond({ error: "GET or POST requests only." }, 405);
    const body = await req.json();
    const studentId = String(body.studentId ?? body.rollNumber ?? "").trim().slice(0, 40);
    const rollNumber = studentId;
    const examCode = String(body.examCode ?? "").trim();
    if (!studentId || !examCode) return respond({ error: "Enter your Student ID and exam code." }, 400);
    const { data: registeredStudent, error: studentError } = await db.from("ac_student_registry")
      .select("student_id,full_name,dob,phone").eq("student_id", studentId).maybeSingle();
    if (studentError) throw studentError;
    if (!registeredStudent) return respond({ error: "Student ID not found. Register first or use Find Student ID." }, 404);
    const studentName = String(registeredStudent.full_name || "").trim();
    if (!studentName) return respond({ error: "Your registration has no name. Contact the administrator." }, 409);
    const hash = await sha256(examCode);
    // A code may exist on older duplicate/closed records. Fetch matches as a list,
    // then select the published record instead of using maybeSingle() (which fails
    // when duplicate hashes exist). Fall back to exact code for legacy rows whose
    // hash was not populated or was not refreshed by an older admin version.
    const hashResult = await db.from("ac_exams")
      .select("id,title,subject,exam_code,duration_minutes,positive_marks,negative_marks,pass_percentage,is_published,instructions,exam_code_hash,created_at,set_number")
      .eq("exam_code_hash", hash).order("created_at", { ascending: false });
    if (hashResult.error) throw hashResult.error;
    const exactResult = await db.from("ac_exams")
      .select("id,title,subject,exam_code,duration_minutes,positive_marks,negative_marks,pass_percentage,is_published,instructions,exam_code_hash,created_at,set_number")
      .eq("exam_code", examCode).order("created_at", { ascending: false });
    if (exactResult.error) throw exactResult.error;
    const byId = new Map<string, any>();
    for (const item of [...(hashResult.data ?? []), ...(exactResult.data ?? [])]) byId.set(String(item.id), item);
    const matches = [...byId.values()].sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")));
    if (!matches?.length) return respond({ error: "Invalid exam code. Check the code and try again." }, 401);
    const publishedMatches = matches.filter((item: any) => item.is_published === true);
    if (!publishedMatches.length) return respond({ error: "This exam is currently closed. The administrator must publish the correct Subject + Set first." }, 403);
    // If old duplicate records share a code, use the most recently created published record.
    const exam = publishedMatches[0];
    const now = new Date();
    const { data: questions, error: qe } = await db.from("ac_exam_questions").select("id,chapter,question_text,options,sort_order").eq("exam_id", exam.id).order("sort_order", { ascending: true });
    if (qe) throw qe;
    if (!questions?.length) return respond({ error: "No questions are available for this exam." }, 409);
    const { data: attempt, error: ae } = await db.from("ac_exam_attempts").insert({ exam_id: exam.id, student_name: studentName, roll_number: rollNumber, started_at: now.toISOString(), status: "in_progress" }).select("id,exam_id,started_at,status").single();
    if (ae) throw ae;
    return respond({ attempt, student: { name: registeredStudent.full_name, studentId: registeredStudent.student_id, dob: registeredStudent.dob, phone: registeredStudent.phone }, exam: { id: exam.id, title: exam.title, subject: exam.subject, exam_code: exam.exam_code || examCode, duration_minutes: exam.duration_minutes, positive_marks: exam.positive_marks, negative_marks: exam.negative_marks, pass_percentage: exam.pass_percentage, instructions: exam.instructions || "" }, questions });
  } catch (error) { console.error("exam-start failed", error); return respond({ error: "Unable to start exam. Check that the latest exam-start function is deployed and its EXAM_SUPABASE_KEY secret is set correctly." }, 500); }
});
