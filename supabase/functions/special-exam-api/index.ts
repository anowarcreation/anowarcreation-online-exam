import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("EXAM_SUPABASE_KEY") || "";
const livekitUrl = Deno.env.get("LIVEKIT_URL") || "";
const livekitKey = Deno.env.get("LIVEKIT_API_KEY") || "";
const livekitSecret = Deno.env.get("LIVEKIT_API_SECRET") || "";
const db = createClient(url, serviceKey);

async function adminUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt || jwt === Deno.env.get("SUPABASE_ANON_KEY")) throw new Error("Admin sign-in is required.");
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) throw new Error("Admin session is invalid. Sign in again.");
  const { data: profile, error: pe } = await db.from("admin_profiles").select("role").eq("user_id", data.user.id).maybeSingle();
  if (pe || !profile || !["admin", "exam_manager"].includes(profile.role)) throw new Error("This account is not authorized to manage Special Exam.");
  return data.user;
}
async function livekitToken(identity: string, name: string, room: string, canPublish: boolean) {
  if (!livekitUrl || !livekitKey || !livekitSecret) throw new Error("Live video is not configured yet. Admin must configure LiveKit secrets before the exam can start.");
  const token = new AccessToken(livekitKey, livekitSecret, { identity, name, ttl: "2h" });
  token.addGrant({ roomJoin: true, room, canPublish, canSubscribe: true, canPublishData: false });
  return await token.toJwt();
}
async function finishAttempt(attemptId: string, finalStatus: "submitted" | "removed" | "expired", reason = "") {
  const { data: attempt, error: ae } = await db.from("ac_special_exam_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (ae) throw ae; if (!attempt) throw new Error("Special exam attempt not found.");
  if (attempt.status !== "in_progress") return { alreadySubmitted: true, attempt };
  const { data: questions, error: qe } = await db.from("ac_exam_questions").select("id,correct_option").eq("exam_id", attempt.exam_id);
  if (qe) throw qe;
  const answers = (attempt.answers && typeof attempt.answers === "object") ? attempt.answers as Record<string, unknown> : {};
  const keys = new Map((questions || []).map((q: any) => [String(q.id), Number(q.correct_option)]));
  let correct = 0, wrong = 0;
  for (const [qid, raw] of Object.entries(answers)) {
    const option = Number(raw);
    if (!keys.has(qid) || !Number.isInteger(option) || option < 0 || option > 3) continue;
    if (keys.get(qid) === option) correct++; else wrong++;
  }
  const { data: exam, error: ee } = await db.from("ac_exams").select("positive_marks,negative_marks").eq("id", attempt.exam_id).single();
  if (ee) throw ee;
  const score = correct * Number(exam.positive_marks ?? 4) - wrong * Number(exam.negative_marks ?? 1);
  const unanswered = Math.max(0, (questions || []).length - Object.keys(answers).length);
  const certificateNo = finalStatus === "removed" ? null : `AC-SE-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const { data: updated, error: ue } = await db.from("ac_special_exam_attempts").update({ status: finalStatus, submitted_at: new Date().toISOString(), score, certificate_no: certificateNo, correct_count: correct, wrong_count: wrong, unanswered_count: unanswered, removal_reason: reason || null, updated_at: new Date().toISOString() }).eq("id", attemptId).eq("status", "in_progress").select("*").maybeSingle();
  if (ue) throw ue;
  await db.from("ac_special_exam_events").insert({ special_exam_id: attempt.special_exam_id, attempt_id: attemptId, event_type: finalStatus === "removed" ? "removed" : "submitted", message: reason || (finalStatus === "removed" ? "Removed by administrator" : "Exam submitted") });
  return { alreadySubmitted: false, attempt: updated || attempt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!serviceKey) return json({ error: "Server is missing Supabase service credentials." }, 500);
    const action = req.method === "GET" ? new URL(req.url).searchParams.get("action") || "public-list" : String((await req.clone().json()).action || "");
    const body = req.method === "POST" ? await req.json() : {};

    if (req.method === "GET" && action === "verify-special-certificate") {
      const code = new URL(req.url).searchParams.get("code")?.trim() || "";
      if (!code) return json({ valid:false, error:"Enter a certificate number." }, 400);
      const { data, error } = await db.from("ac_special_exam_attempts").select("certificate_no,student_name,score,correct_count,wrong_count,unanswered_count,submitted_at,status,ac_special_exams(title)").eq("certificate_no", code).maybeSingle();
      if (error) throw error;
      if (!data || data.status === "removed") return json({ valid:false });
      return json({ valid:true, certificate:{ certificateNo:data.certificate_no, studentName:data.student_name, examTitle:data.ac_special_exams?.title || "Anowar Creation Special Exam", score:data.score, correctCount:data.correct_count, totalAnswered:Number(data.correct_count||0)+Number(data.wrong_count||0)+Number(data.unanswered_count||0), issuedAt:data.submitted_at } });
    }
    if (req.method === "GET" || action === "public-list") {
      const { data, error } = await db.from("ac_special_exams").select("id,title,exam_id,prize_amount,scheduled_start_at,scheduled_end_at,status,ac_exams(title,subject,duration_minutes)").in("status", ["scheduled", "live"]).order("scheduled_start_at", { ascending: true });
      if (error) throw error;
      return json({ exams: (data || []).map((e: any) => ({ id:e.id,title:e.title,prize_amount:e.prize_amount,scheduled_start_at:e.scheduled_start_at,scheduled_end_at:e.scheduled_end_at,status:e.status,exam_title:e.ac_exams?.title || "General Knowledge Special Exam",subject:e.ac_exams?.subject || "General Knowledge",duration_minutes:e.ac_exams?.duration_minutes || 30 })) });
    }

    if (action === "admin-list" || action === "create" || action === "start" || action === "end" || action === "admin-token" || action === "admin-action" || action === "declare-winner") {
      const user = await adminUser(req);
      if (action === "admin-list") {
        const { data: exams, error: ee } = await db.from("ac_special_exams").select("*,ac_exams(title,subject,duration_minutes)").order("created_at", { ascending: false }); if (ee) throw ee;
        const ids = (exams || []).map((x: any) => x.id);
        let attempts: any[] = [];
        if (ids.length) { const { data, error } = await db.from("ac_special_exam_attempts").select("*").in("special_exam_id", ids).order("created_at", { ascending: true }); if (error) throw error; attempts = data || []; }
        let events: any[] = [];
        if (ids.length) { const { data, error } = await db.from("ac_special_exam_events").select("*").in("special_exam_id", ids).order("created_at", { ascending: false }).limit(500); if (error) throw error; events = data || []; }
        return json({ exams, attempts, events });
      }
      if (action === "create") {
        const title = String(body.title || "").trim().slice(0, 140), examId = String(body.examId || "");
        const start = new Date(body.scheduledStartAt), end = new Date(body.scheduledEndAt), prize = Number(body.prizeAmount ?? 500);
        if (!title || !examId || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || !Number.isFinite(prize) || prize < 0 || prize > 500) return json({ error: "Enter a title, question set, valid date/time range, and prize up to ₹500." }, 400);
        const { data: exam, error: xe } = await db.from("ac_exams").select("id,title,is_published").eq("id", examId).maybeSingle(); if (xe) throw xe; if (!exam) return json({ error: "Selected question set was not found." }, 404);
        const room = `ac-special-${crypto.randomUUID()}`;
        const { data, error } = await db.from("ac_special_exams").insert({ title, exam_id: examId, prize_amount: prize, scheduled_start_at: start.toISOString(), scheduled_end_at: end.toISOString(), status: "scheduled", created_by: user.id, room_name: room }).select("*").single();
        if (error) throw error; return json({ success: true, exam: data });
      }
      const specialId = String(body.specialExamId || "");
      if (action === "start") {
        const { data: special, error } = await db.from("ac_special_exams").select("*").eq("id", specialId).single(); if (error) throw error;
        if (special.status !== "scheduled") return json({ error: "Only a scheduled Special Exam can be started." }, 409);
        if (Date.now() < new Date(special.scheduled_start_at).getTime()) return json({ error: "The scheduled start time has not arrived yet." }, 409);
        if (new Date(special.scheduled_end_at).getTime() <= Date.now()) return json({ error: "The scheduled end time has passed. Edit the schedule before starting." }, 409);
        const { data: updated, error: ue } = await db.from("ac_special_exams").update({ status:"live", actual_started_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq("id", specialId).select("*").single(); if (ue) throw ue;
        return json({ success:true, exam:updated });
      }
      if (action === "end") {
        const { error } = await db.from("ac_special_exams").update({ status:"ended", updated_at:new Date().toISOString() }).eq("id", specialId); if (error) throw error;
        const { data: active, error: ae } = await db.from("ac_special_exam_attempts").select("id").eq("special_exam_id", specialId).eq("status", "in_progress"); if (ae) throw ae;
        for (const a of active || []) await finishAttempt(a.id, "expired", "Exam ended by administrator");
        return json({ success:true, endedAttempts:(active || []).length });
      }
      if (action === "admin-token") {
        const { data: special, error } = await db.from("ac_special_exams").select("id,title,room_name,status").eq("id", specialId).single(); if (error) throw error;
        if (special.status !== "live") return json({ error:"Start the Special Exam before opening live monitoring." }, 409);
        return json({ livekitUrl, token: await livekitToken(`admin-${user.id}`, "Anowar Creation Admin", special.room_name, false) });
      }
      if (action === "admin-action") {
        const attemptId = String(body.attemptId || ""), kind = String(body.kind || ""), reason = String(body.reason || "Admin action").slice(0, 300);
        const { data: attempt, error } = await db.from("ac_special_exam_attempts").select("id,special_exam_id,status").eq("id", attemptId).maybeSingle(); if (error) throw error; if (!attempt) return json({ error:"Attempt not found." }, 404);
        if (kind === "warning") { if (attempt.status !== "in_progress") return json({ error:"This student is no longer in the exam." }, 409); const { error: ie } = await db.from("ac_special_exam_events").insert({ special_exam_id:attempt.special_exam_id, attempt_id:attemptId, event_type:"warning", message:reason || "Please follow the examination rules." }); if (ie) throw ie; return json({ success:true }); }
        if (kind === "remove") { const result = await finishAttempt(attemptId, "removed", reason || "Removed by administrator for suspected rule violation"); return json({ success:true, ...result }); }
        return json({ error:"Unknown admin action." }, 400);
      }
      if (action === "declare-winner") {
        const attemptId = String(body.attemptId || ""), note = String(body.note || "Admin verified result").slice(0, 500);
        const { data: attempt, error: ae } = await db.from("ac_special_exam_attempts").select("id,special_exam_id,status").eq("id", attemptId).maybeSingle(); if (ae) throw ae; if (!attempt || !["submitted","removed","expired"].includes(attempt.status)) return json({ error:"Winner must be selected from a finalized attempt." }, 409);
        if (attempt.status === "removed") return json({ error:"A removed student cannot be declared winner." }, 409);
        const { error } = await db.from("ac_special_exams").update({ winner_attempt_id:attemptId, winner_note:note, winner_announced_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq("id", attempt.special_exam_id); if (error) throw error;
        return json({ success:true });
      }
    }

    if (action === "student-start") {
      const studentId = String(body.studentId || "").trim().slice(0, 40), specialId = String(body.specialExamId || "");
      if (!studentId || !specialId || body.cameraReady !== true) return json({ error:"Enter your Student ID and allow camera access before starting." }, 400);
      const { data: special, error: se } = await db.from("ac_special_exams").select("*,ac_exams(id,title,subject,duration_minutes,positive_marks,negative_marks,pass_percentage,is_published)").eq("id", specialId).maybeSingle(); if (se) throw se; if (!special) return json({ error:"Special Exam not found." }, 404);
      if (special.status !== "live") return json({ error:"The administrator has not started this Special Exam yet." }, 403);
      if (Date.now() >= new Date(special.scheduled_end_at).getTime()) return json({ error:"The exam time has ended. Late entry is closed." }, 403);
      const { data: student, error: ste } = await db.from("ac_student_registry").select("student_id,full_name,phone").eq("student_id", studentId).maybeSingle(); if (ste) throw ste; if (!student) return json({ error:"Student ID not found. Register first or contact the administrator." }, 404);
      const { data: prior, error: pe } = await db.from("ac_special_exam_attempts").select("id,status").eq("special_exam_id", specialId).eq("student_id", studentId).maybeSingle(); if (pe) throw pe;
      if (prior && prior.status !== "in_progress") return json({ error:"You have already used your attempt for this Special Exam." }, 409);
      const { data: questions, error: qe } = await db.from("ac_exam_questions").select("id,question_text,options,chapter,sort_order").eq("exam_id", special.exam_id).order("sort_order", { ascending:true }); if (qe) throw qe; if (!questions?.length) return json({ error:"The selected question set has no questions." }, 409);
      let attempt: any;
      if (prior) {
        const { data: existing, error: re } = await db.from("ac_special_exam_attempts").select("id,student_id,student_name,status,started_at,answers,room_identity").eq("id", prior.id).single(); if (re) throw re; attempt = existing;
        await db.from("ac_special_exam_events").insert({ special_exam_id:specialId, attempt_id:prior.id, event_type:"connection_restored", message:"Student reconnected to the active attempt." });
      } else {
        const attemptId = crypto.randomUUID(), identity = `stu-${attemptId}`;
        const { data: created, error: ae } = await db.from("ac_special_exam_attempts").insert({ id:attemptId, special_exam_id:specialId, exam_id:special.exam_id, student_id:student.student_id, student_name:student.full_name, phone:student.phone || null, room_identity:identity, status:"in_progress" }).select("id,student_id,student_name,status,started_at,answers,room_identity").single(); if (ae) throw ae; attempt=created;
        const { error: ev } = await db.from("ac_special_exam_events").insert({ special_exam_id:specialId, attempt_id:attemptId, event_type:"camera_on", message:"Camera permission granted and exam started." }); if (ev) console.error(ev);
      }
      return json({ success:true, attempt, exam:{ id:special.id,title:special.title,subject:special.ac_exams?.subject || "General Knowledge",endAt:special.scheduled_end_at,prizeAmount:special.prize_amount }, questions, livekitUrl, livekitToken:await livekitToken(attempt.room_identity, student.full_name, special.room_name, true) });
    }

    if (action === "student-save") {
      const attemptId = String(body.attemptId || ""), studentId = String(body.studentId || "").trim(), answers = body.answers;
      if (!attemptId || !studentId || !answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error:"Invalid answer save request." }, 400);
      const { data: attempt, error } = await db.from("ac_special_exam_attempts").select("id,student_id,special_exam_id,status,exam_id").eq("id", attemptId).eq("student_id", studentId).maybeSingle(); if (error) throw error; if (!attempt) return json({ error:"Attempt not found." }, 404);
      if (attempt.status !== "in_progress") return json({ error:"Your attempt has been submitted or removed." }, 409);
      const { data: special, error: se } = await db.from("ac_special_exams").select("status,scheduled_end_at").eq("id", attempt.special_exam_id).single(); if (se) throw se;
      if (special.status !== "live" || Date.now() >= new Date(special.scheduled_end_at).getTime()) { await finishAttempt(attemptId, "expired", "Fixed exam end time reached"); return json({ error:"The exam has ended. Saved answers were submitted and locked." }, 403); }
      const { data: questions, error: qe } = await db.from("ac_exam_questions").select("id").eq("exam_id", attempt.exam_id); if (qe) throw qe;
      const allowed = new Set((questions || []).map((q:any)=>String(q.id))), clean: Record<string,number> = {};
      for (const [qid, raw] of Object.entries(answers as Record<string,unknown>)) { const opt=Number(raw); if (allowed.has(qid) && Number.isInteger(opt) && opt>=0 && opt<=3) clean[qid]=opt; }
      const { error: ue } = await db.from("ac_special_exam_attempts").update({ answers:clean, updated_at:new Date().toISOString() }).eq("id", attemptId).eq("status","in_progress"); if (ue) throw ue;
      return json({ success:true, saved:Object.keys(clean).length });
    }
    if (action === "student-submit") {
      const attemptId=String(body.attemptId||""), studentId=String(body.studentId||"").trim();
      const { data: attempt, error } = await db.from("ac_special_exam_attempts").select("id,student_id,status,special_exam_id").eq("id",attemptId).eq("student_id",studentId).maybeSingle(); if(error)throw error; if(!attempt)return json({error:"Attempt not found."},404);
      const result=await finishAttempt(attemptId,"submitted","Submitted by student or automatic timer"); return json({success:true,alreadySubmitted:result.alreadySubmitted,certificateNo:result.attempt?.certificate_no || null});
    }
    if (action === "student-poll" || action === "incident") {
      const attemptId=String(body.attemptId||""), studentId=String(body.studentId||"").trim();
      const { data: attempt, error } = await db.from("ac_special_exam_attempts").select("id,student_id,status,special_exam_id").eq("id",attemptId).eq("student_id",studentId).maybeSingle(); if(error)throw error; if(!attempt)return json({error:"Attempt not found."},404);
      if(action === "incident") { const kind=String(body.kind||""); if(!["camera_off","camera_on","tab_switch","fullscreen_exit","connection_lost","connection_restored"].includes(kind))return json({error:"Unknown incident."},400); const {error:ie}=await db.from("ac_special_exam_events").insert({special_exam_id:attempt.special_exam_id,attempt_id:attemptId,event_type:kind,message:String(body.message||kind).slice(0,240)});if(ie)throw ie; return json({success:true}); }
      const since=String(body.since||"1970-01-01T00:00:00.000Z"); const {data:events,error:ee}=await db.from("ac_special_exam_events").select("id,event_type,message,created_at").eq("attempt_id",attemptId).gt("created_at",since).order("created_at",{ascending:true});if(ee)throw ee;
      const {data:special,error:se}=await db.from("ac_special_exams").select("status,scheduled_end_at").eq("id",attempt.special_exam_id).single();if(se)throw se;
      let currentStatus=attempt.status, certificateNo=null;
      if(currentStatus === "in_progress" && (special.status !== "live" || Date.now() >= new Date(special.scheduled_end_at).getTime())) {
        const finalized=await finishAttempt(attemptId, "expired", special.status !== "live" ? "Exam ended by administrator" : "Fixed exam end time reached");
        currentStatus="expired"; certificateNo=finalized.attempt?.certificate_no || null;
      } else {
        const {data:latest}=await db.from("ac_special_exam_attempts").select("certificate_no").eq("id",attemptId).maybeSingle(); certificateNo=latest?.certificate_no || null;
      }
      return json({status:currentStatus,events:events||[],examStatus:special.status,endAt:special.scheduled_end_at,certificateNo});
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) { console.error("special-exam-api", error); return json({ error: error instanceof Error ? error.message : "Special Exam request failed." }, 500); }
});
