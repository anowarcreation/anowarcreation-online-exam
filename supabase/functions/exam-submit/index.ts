import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "POST requests only." }, 405);
  try {
    const body = await req.json();
    const attemptId = String(body.attemptId ?? "").trim();
    const answers = body.answers;
    if (!attemptId || !Array.isArray(answers) || answers.length > 500) return respond({ error: "Invalid attempt or answers." }, 400);
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("EXAM_SUPABASE_KEY");
    if (!url || !key) return respond({ error: "Server configuration is incomplete." }, 500);
    const db = createClient(url, key);
    const { data: attempt, error: ae } = await db.from("ac_exam_attempts").select("id,exam_id,started_at,submitted_at,status").eq("id", attemptId).maybeSingle();
    if (ae) throw ae; if (!attempt) return respond({ error: "Attempt not found." }, 404);
    if (attempt.submitted_at || attempt.status === "submitted") return respond({ error: "This attempt has already been submitted." }, 409);
    const { data: exam, error: ee } = await db.from("ac_exams").select("id,duration_minutes,positive_marks,negative_marks,pass_percentage").eq("id", attempt.exam_id).single();
    if (ee) throw ee;
    const deadline = new Date(attempt.started_at).getTime() + Number(exam.duration_minutes) * 60000;
    if (Date.now() > deadline + 60000) return respond({ error: "Exam time has expired." }, 403);
    const { data: questions, error: qe } = await db.from("ac_exam_questions").select("id,correct_option,question_text,options,explanation,chapter,sort_order").eq("exam_id", exam.id).order("sort_order", { ascending: true });
    if (qe) throw qe; if (!questions?.length) return respond({ error: "No questions found." }, 409);
    const keyMap = new Map(questions.map(q => [q.id, Number(q.correct_option)]));
    const submitted = new Map<string, number>();
    for (const answer of answers) {
      const qid = String(answer.questionId ?? ""); const option = Number(answer.selectedOption);
      if (!keyMap.has(qid) || !Number.isInteger(option) || option < 0 || option > 3 || submitted.has(qid)) return respond({ error: "Invalid or duplicate answer." }, 400);
      submitted.set(qid, option);
    }
    const correct = [...submitted.entries()].filter(([id, opt]) => keyMap.get(id) === opt).length;
    const wrong = submitted.size - correct, unanswered = questions.length - submitted.size;
    const score = correct * Number(exam.positive_marks ?? 4) - wrong * Number(exam.negative_marks ?? 1);
    const answerRows = [...submitted.entries()].map(([question_id, selected_option]) => ({ question_id, selected_option }));
    const candidate = `AC-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const { data: finalized, error: fe } = await db.rpc("ac_finalize_exam_attempt", {
      p_attempt_id: attemptId, p_answers: answerRows, p_score: score,
      p_correct_count: correct, p_wrong_count: wrong, p_unanswered_count: unanswered,
      p_pass_percentage: Number(exam.pass_percentage ?? 40), p_candidate_certificate_no: candidate
    });
    if (fe) throw fe;
    if (finalized?.already_submitted) return respond({ error: "This attempt has already been submitted." }, 409);
    const submittedMap = new Map([...submitted.entries()]);
    const answerReview = questions.map((q, index) => ({
      questionId: q.id,
      question: q.question_text,
      chapter: q.chapter ?? "",
      options: Array.isArray(q.options) ? q.options : [],
      selectedOption: submittedMap.has(q.id) ? submittedMap.get(q.id) : null,
      correctOption: Number(q.correct_option),
      isCorrect: submittedMap.has(q.id) && submittedMap.get(q.id) === Number(q.correct_option),
      explanation: q.explanation ?? "",
      number: index + 1
    }));
    return respond({ success: true, result: { totalQuestions: questions.length, correctCount: correct, wrongCount: wrong, unansweredCount: unanswered, score, percentage: finalized?.percentage, result: finalized?.passed ? "PASS" : "FAIL", certificateNo: finalized?.certificate_no ?? null, certificateIssued: Boolean(finalized?.certificate_no), answerReview } });
  } catch (error) { console.error("exam-submit failed:", error); return respond({ error: "Unable to submit exam." }, 500); }
});
