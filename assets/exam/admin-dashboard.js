(() => {
  "use strict";
  const SUPABASE_URL = "https://tlsrvyqyhonnrlcdmlzo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";
  const $ = (id) => document.getElementById(id);
  const client = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let exportRows = [];
  let attemptsCache = [];
  let examsCache = [];
  function message(id, text) { const el = $(id); if (el) el.textContent = text; }
  function csvDownload(rows) {
    if (!rows.length) { message("resultStatus", "There are no submitted result records to export."); return; }
    const cols = ["student_name", "roll_number", "exam_title", "score", "percentage", "result", "status", "certificate_no", "submitted_at"];
    const quote = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const content = [cols.join(","), ...rows.map(r => cols.map(c => quote(r[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([content], {type:"text/csv;charset=utf-8;"}));
    const a = document.createElement("a"); a.href = url; a.download = "anowar-creation-exam-results.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function getExamMeta(exam) {
    const total = Number(exam?.question_count ?? exam?.total_questions ?? 30);
    const positive = Number(exam?.positive_marks ?? 4);
    const pass = Number(exam?.pass_percentage ?? 40);
    return { max: Math.max(0, total * positive), pass };
  }
  function normalizeAttempt(a) {
    const exam = a.ac_exams || {};
    const {max, pass} = getExamMeta(exam);
    const score = a.score == null ? null : Number(a.score);
    const percentage = score == null || !max ? null : Math.max(0, score) / max * 100;
    const submitted = a.status === "submitted";
    const result = !submitted ? "IN PROGRESS" : percentage == null ? "RESULT PENDING" : percentage >= pass ? "PASS" : "FAIL";
    const certNo = a.certificate_no || a.certificates?.certificate_no || "";
    return {...a, exam_title:exam.title || "—", max_marks:max, percentage, result, certificate_no:certNo};
  }
  function populateExamControl(exams) {
    const select = $("controlExam"); if (!select) return;
    select.innerHTML = exams.length ? exams.map(e => `<option value="${esc(e.id)}">${esc(e.title)} (${e.is_published ? "Open" : "Closed"})</option>`).join("") : '<option value="">No exams found</option>';
    if (exams.length) fillExamControl(exams[0].id);
    const qsel = $("questionExam"); if (qsel) qsel.innerHTML = exams.length ? exams.map(e => `<option value="${esc(e.id)}">${esc(e.subject)} — ${esc(e.title)}</option>`).join("") : '<option value="">Create an exam first</option>';
  }
  function fillExamControl(id) {
    const e = examsCache.find(x => x.id === id); if (!e) return;
    $("controlCode").value = e.exam_code || "";
    $("controlDuration").value = e.duration_minutes || 30;
    $("controlInstructions").value = e.instructions || "";
    $("controlPublished").checked = Boolean(e.is_published);
    syncPublishedToggle();
    message("controlStatus", "Changes are not saved yet.");
  }
  function syncPublishedToggle() {
    const checkbox = $("controlPublished"), button = $("controlPublishedToggle"), label = $("controlPublishedLabel");
    if (!checkbox || !button) return;
    const on = checkbox.checked;
    button.classList.toggle("on", on); button.classList.toggle("off", !on);
    button.textContent = on ? "ON · Accepting attempts" : "OFF · Closed";
    button.setAttribute("aria-pressed", String(on));
    if (label) label.textContent = on ? "Students can start new attempts." : "New attempts are blocked.";
  }
  $("controlPublishedToggle")?.addEventListener("click", () => {
    const checkbox = $("controlPublished"); if (checkbox) checkbox.checked = !checkbox.checked;
    syncPublishedToggle();
    message("controlStatus", "Toggle changed. Click Save exam settings to apply it.");
  });
  async function sha256(text) {
    const bytes = new TextEncoder().encode(text.trim());
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
  }
  async function init() {
    if (!client) { message("examStatus", "Unable to load the authentication service. Refresh the page and try again."); return; }
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) { location.replace("index.html"); return; }
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) { location.replace("index.html"); return; }
    const { data: profile, error: profileError } = await client.from("admin_profiles").select("role").eq("user_id", userData.user.id).maybeSingle();
    if (profileError || !profile || !["admin", "exam_manager"].includes(profile.role)) { await client.auth.signOut(); location.replace("index.html"); return; }
    await loadData();
    await loadRegisteredStudents();
  }
  async function loadData() {
    const [examsResult, attemptsResult] = await Promise.all([
      client.from("ac_exams").select("id,title,subject,set_number,exam_code,duration_minutes,instructions,positive_marks,negative_marks,pass_percentage,is_published,created_at").order("created_at", {ascending:false}),
      client.from("ac_exam_attempts").select("id,exam_id,student_name,roll_number,score,status,submitted_at,started_at,created_at,certificate_no,correct_count,wrong_count,unanswered_count,ac_exams(title,subject,duration_minutes,positive_marks,negative_marks,pass_percentage)").order("created_at", {ascending:false}).limit(500)
    ]);
    if (examsResult.error) {
      message("examStatus", "Exam records could not be loaded. Check the exams table and admin RLS policies.");
      $("adminExamRows").innerHTML = '<tr><td colspan="5">No exam data available.</td></tr>';
      $("examCount").textContent = "—";
    } else {
      const exams = examsResult.data || [];
      examsCache = exams; populateExamControl(exams);
      $("examCount").textContent = String(exams.length);
      $("adminExamRows").innerHTML = exams.length ? exams.map(e => `<tr><td>${esc(e.title)}</td><td>${esc(e.subject)} · Set ${esc(e.set_number||1)}</td><td>${e.exam_code ? esc(e.exam_code) : "Set in control panel"}</td><td>${esc(e.duration_minutes)} min</td><td>${e.is_published ? "Accepting attempts" : "Closed"}</td><td><button type="button" class="edit-exam" data-id="${esc(e.id)}" onclick="location.href='edit-exam.html?id=${encodeURIComponent(e.id)}'">Edit</button></td></tr>`).join("") : '<tr><td colspan="5">No examinations have been created yet.</td></tr>';
      message("examStatus", exams.length ? `${exams.length} examination record(s) loaded.` : "No examination records are available yet.");
    }
    if (attemptsResult.error) {
      message("resultStatus", "Student results could not be loaded. Check the attempts table and admin RLS policies.");
      $("adminStudentRows").innerHTML = '<tr><td colspan="8">No result data available.</td></tr>';
      $("attemptCount").textContent = "—"; $("submittedCount").textContent = "—"; exportRows = []; attemptsCache = [];
      return;
    }
    const questionCountsResult = await client.from("ac_exam_questions").select("exam_id");
    const questionCounts = {};
    if (!questionCountsResult.error) for (const q of (questionCountsResult.data || [])) questionCounts[q.exam_id] = (questionCounts[q.exam_id] || 0) + 1;
    attemptsCache = (attemptsResult.data || []).map(a => {
      const normalized = normalizeAttempt(a);
      const total = questionCounts[a.exam_id] || 0;
      const max = total * Number((a.ac_exams || {}).positive_marks ?? 4);
      const percentage = a.score == null || !max ? null : Math.max(0, Number(a.score)) / max * 100;
      const pass = Number((a.ac_exams || {}).pass_percentage ?? 40);
      const submitted = a.status === "submitted";
      return {...normalized, max_marks:max, percentage, result:!submitted ? "IN PROGRESS" : percentage == null ? "RESULT PENDING" : percentage >= pass ? "PASS" : "FAIL"};
    });
    const submitted = attemptsCache.filter(a => a.status === "submitted");
    $("attemptCount").textContent = String(attemptsCache.length);
    $("submittedCount").textContent = String(submitted.length);
    exportRows = submitted.map(a => ({student_name:a.student_name,roll_number:a.roll_number,exam_title:a.exam_title,score:a.score,percentage:a.percentage == null ? "" : `${a.percentage.toFixed(1)}%`,result:a.result,status:a.status,certificate_no:a.certificate_no,submitted_at:a.submitted_at}));
    $("adminStudentRows").innerHTML = attemptsCache.length ? attemptsCache.map(a => {
      const passed = a.result === "PASS";
      const certReady = passed && Boolean(a.certificate_no);
      const resultPill = a.result === "PASS" ? '<span class="tag correct">PASS</span>' : a.result === "FAIL" ? '<span class="tag wrong">FAIL</span>' : `<span class="tag unanswered">${esc(a.result)}</span>`;
      const certificate = certReady ? `<a class="btn secondary admin-cert-link" href="certificate-admin.html?attempt=${encodeURIComponent(a.id)}">View certificate</a>` : passed ? '<span class="muted small">Awaiting server issue</span>' : '<span class="muted small">Not eligible</span>';
      return `<tr><td><input class="attempt-select" type="checkbox" value="${esc(a.id)}" aria-label="Select attempt ${esc(a.id)}"></td><td>${esc(a.student_name)}</td><td>${esc(a.roll_number)}</td><td>${esc(a.exam_title)}</td><td>${a.score == null ? "—" : `${esc(a.score)} / ${esc(a.max_marks || "—")}`}</td><td>${a.percentage == null ? "—" : `${a.percentage.toFixed(1)}%`}</td><td>${resultPill}</td><td>${certificate}</td><td>${esc(a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "Not submitted")}</td></tr>`;
    }).join("") : '<tr><td colspan="9">No student attempts have been recorded yet.</td></tr>';
    message("resultStatus", `${attemptsCache.length} attempt(s) loaded; ${submitted.length} submitted. Pass/fail is calculated from the exam pass threshold and available marks data.`);
  }
  $("controlExam")?.addEventListener("change", e => fillExamControl(e.target.value));
  $("examControlForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("controlExam").value, code = $("controlCode").value.trim(), duration = Number($("controlDuration").value);
    if (!id || !code || !Number.isInteger(duration) || duration < 1 || duration > 600) { message("controlStatus", "Enter a valid exam code and duration (1–600 minutes)."); return; }
    const button = e.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; message("controlStatus", "Saving exam settings…");
    try {
      const codeHash = await sha256(code);
      const payload = { exam_code: code, exam_code_hash: codeHash, duration_minutes: duration, instructions: $("controlInstructions").value.trim(), is_published: $("controlPublished").checked };
      const { error } = await client.from("ac_exams").update(payload).eq("id", id);
      if (error) throw error;
      message("controlStatus", "Saved. Refreshing dashboard…"); await loadData(); fillExamControl(id);
      message("controlStatus", "Saved. New attempts and student duration overview now use these settings after the updated exam-start function is deployed.");
    } catch (err) { message("controlStatus", `Could not save settings: ${err.message || "check SQL migration and admin update RLS policy"}`); }
    finally { button.disabled = false; }
  });

  $("createExamForm")?.addEventListener("submit", async e => {
    e.preventDefault(); const form=e.currentTarget; message("createExamStatus", "Creating examination…");
    const title=$("newExamTitle").value.trim(), subject=$("newExamSubject").value.trim(), code=$("newExamCode").value.trim();
    const duration=Number($("newExamDuration").value), set_number=Number($("newExamSetNumber")?.value||1), positive=Number($("newExamPositive").value), negative=Number($("newExamNegative").value), pass=Number($("newExamPass").value);
    if(!title||!subject||!code||!Number.isInteger(set_number)||set_number<1||set_number>99||!Number.isInteger(duration)||duration<1||duration>600||pass<0||pass>100){message("createExamStatus","Check the required fields and values.");return;}
    try { const codeHash=await sha256(code); const {error}=await client.from("ac_exams").insert({title,subject,set_number,exam_code:code,exam_code_hash:codeHash,duration_minutes:duration,positive_marks:positive,negative_marks:negative,pass_percentage:pass,is_published:false}); if(error)throw error; message("createExamStatus","Exam / question set created and left CLOSED. Add questions, then publish it from exam controls."); form.reset(); if($("newExamSetNumber")) $("newExamSetNumber").value="1"; await loadData(); }
    catch(err){message("createExamStatus",`Could not create exam: ${err.message||"Check ac_exams columns and admin INSERT RLS policy."}`);}
  });
  $("addQuestionForm")?.addEventListener("submit", async e => {
    e.preventDefault(); const form=e.currentTarget; message("addQuestionStatus","Adding question…");
    const exam_id=$("questionExam").value, question_text=$("questionText").value.trim(), options=[0,1,2,3].map(i=>$("questionOption"+i).value.trim()), correct_option=Number($("correctOption").value), chapter=$("questionChapter").value.trim(), explanation=$("questionExplanation").value.trim();
    if(!exam_id||!question_text||options.some(x=>!x)){message("addQuestionStatus","Choose an exam and complete the question and all four options.");return;}
    try { const {data:existing,error:ce}=await client.from("ac_exam_questions").select("sort_order").eq("exam_id",exam_id).order("sort_order",{ascending:false}).limit(1);if(ce)throw ce;const sort_order=(existing?.[0]?.sort_order??0)+1;const {error}=await client.from("ac_exam_questions").insert({exam_id,question_text,options,correct_option,chapter,explanation,sort_order});if(error)throw error;message("addQuestionStatus","Question added successfully to this set.");form.reset(); await loadQuestionList(); }
    catch(err){message("addQuestionStatus",`Could not add question: ${err.message||"Check ac_exam_questions columns and admin INSERT RLS policy."}`);}
  });

  function selectedAttemptIds() { return [...document.querySelectorAll(".attempt-select:checked")].map(x => x.value); }
  $("selectAllAttempts")?.addEventListener("change", e => { document.querySelectorAll(".attempt-select").forEach(x => x.checked = e.target.checked); });
  async function eraseHistory(ids, all=false) {
    const confirmed = confirm(`Confirm permanent deletion of ${all ? "ALL test history" : `${ids.length} selected attempt(s)`}?

Their saved answers and linked certificates will also be deleted. Student registrations, Student IDs, exams and questions will remain. This cannot be undone.`);
    if (!confirmed) { message("eraseStatus", "Erase cancelled. No records were changed."); return; }
    const {data:{session}} = await client.auth.getSession();
    if (!session?.access_token) { message("eraseStatus", "Admin session expired. Sign in again."); return; }
    const btns = [$("eraseSelected"), $("eraseAll")].filter(Boolean); btns.forEach(b => b.disabled = true);
    message("eraseStatus", "Deleting test history securely…");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-erase-history`, {method:"POST", headers:{"Content-Type":"application/json", "Authorization":`Bearer ${session.access_token}`, "apikey":SUPABASE_KEY}, body:JSON.stringify({all, attemptIds:ids})});
      const result = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
      message("eraseStatus", `Deleted ${result.deletedAttempts} attempt(s), ${result.deletedAnswers} answer(s), and ${result.deletedCertificates} certificate record(s). Student registrations and question bank were preserved.`);
      if ($("selectAllAttempts")) $("selectAllAttempts").checked = false;
      await loadData();
    } catch (err) { message("eraseStatus", `Could not erase history: ${err.message || "check Edge Function deployment and admin permissions"}`); }
    finally { btns.forEach(b => b.disabled = false); }
  }
  $("eraseSelected")?.addEventListener("click", () => { const ids = selectedAttemptIds(); if (!ids.length) { message("eraseStatus", "Select at least one attempt first."); return; } eraseHistory(ids, false); });
  $("eraseAll")?.addEventListener("click", () => eraseHistory([], true));

  $("adminLogout")?.addEventListener("click", async () => { await client?.auth.signOut(); location.replace("index.html"); });
  $("exportResults")?.addEventListener("click", () => csvDownload(exportRows));

  // Menu views: each sidebar item opens a focused page-like view via ?view=.
  const adminView = new URLSearchParams(location.search).get("view") || "dashboard";
  const viewTitles = {dashboard:"Dashboard",exams:"Exam Management",questions:"Question Bank",students:"All Students",results:"Results",certificates:"Certificates"};
  document.querySelectorAll("[data-admin-view]").forEach(el=>{el.hidden = el.dataset.adminView !== adminView;});
  document.querySelectorAll("[data-view-link]").forEach(a=>{if(a.dataset.viewLink===adminView)a.classList.add("active");});
  const pageTitle=document.querySelector("[data-admin-view=dashboard] h1");
  if(pageTitle && adminView!=="dashboard") pageTitle.textContent=viewTitles[adminView]||"Admin Dashboard";
  async function loadRegisteredStudents(){
    const body=$("registeredStudentRows"); if(!body)return;
    try{const {data,error}=await client.from("ac_student_registry").select("id,student_id,full_name,dob,phone,created_at").order("created_at",{ascending:false}).limit(1000);
      if(error)throw error; window.__acStudents=data||[]; renderRegisteredStudents(); message("studentRegistryStatus",`${window.__acStudents.length} registered student(s).`);
    }catch(err){body.innerHTML='<tr><td colspan="6">Student registry is not accessible to this admin session. Check the admin RLS policy for ac_student_registry.</td></tr>';message("studentRegistryStatus",err.message||"Could not load registered students.");}
    try{const {data,error}=await client.from("ac_exam_attempts").select("id,student_name,roll_number,submitted_at,ac_exams(title)").order("created_at",{ascending:false}).limit(500);if(error)throw error;const legacy=(data||[]).filter(a=>!a.roll_number||!/^ACSTU-/i.test(a.roll_number));$("legacyAttemptRows").innerHTML=legacy.length?legacy.map(a=>`<tr><td>${esc(a.student_name||"—")}</td><td>${esc(a.ac_exams?.title||"—")}</td><td>${esc(a.submitted_at?new Date(a.submitted_at).toLocaleString():"—")}</td><td>${esc(a.roll_number||"—")}</td><td><select class="legacy-student-select" data-attempt="${esc(a.id)}"><option value="">Choose registered student</option>${(window.__acStudents||[]).map(s=>`<option value="${esc(s.student_id)}">${esc(s.full_name)} — ${esc(s.student_id)}</option>`).join("")}</select> <button type="button" class="assign-student-id" data-attempt="${esc(a.id)}">Assign</button></td></tr>`).join(""):'<tr><td colspan="5">No unmatched legacy attempts found.</td></tr>'; }catch(e){$("legacyAttemptRows").innerHTML='<tr><td colspan="5">Could not load legacy attempts.</td></tr>'; }
  }
  async function loadOneStudentHistory(student){
    let panel=$("studentDetailsPanel"); if(!panel){panel=document.createElement("section");panel.id="studentDetailsPanel";panel.className="card student-details-panel";$("studentEditForm").before(panel);}
    panel.hidden=false; panel.innerHTML=`<div class="section-heading-row"><div><h3>${esc(student.full_name)} — Student Details</h3><p class="muted small">Complete registered profile and examination history</p></div><button type="button" id="editStudentTopButton">Edit Details</button></div><div class="student-profile-grid"><p><b>Name</b><br>${esc(student.full_name)}</p><p><b>Student ID</b><br>${esc(student.student_id)}</p><p><b>Date of Birth</b><br>${esc(student.dob)}</p><p><b>Registered Phone</b><br>${esc(student.phone)}</p></div><h4>Exam History</h4><p>Loading history…</p>`;
    $("editStudentTopButton").addEventListener("click",()=>$("editStudentName").focus());
    try{const {data,error}=await client.from("ac_exam_attempts").select("id,student_name,roll_number,score,status,started_at,submitted_at,certificate_no,ac_exams(title,subject)").eq("roll_number",student.student_id).order("created_at",{ascending:false}).limit(300);if(error)throw error;panel.querySelector("h4").insertAdjacentHTML("afterend",(data||[]).length?`<div class="tablewrap"><table><thead><tr><th>Exam</th><th>Subject</th><th>Exam Date</th><th>Score</th><th>Status</th><th>Certificate</th></tr></thead><tbody>${data.map(a=>`<tr><td>${esc(a.ac_exams?.title||"—")}</td><td>${esc(a.ac_exams?.subject||"—")}</td><td>${esc(a.submitted_at?new Date(a.submitted_at).toLocaleString():a.started_at?new Date(a.started_at).toLocaleString():"—")}</td><td>${esc(a.score??"—")}</td><td>${esc(a.status||"—")}</td><td>${esc(a.certificate_no||"—")}</td></tr>`).join("")}</tbody></table></div>`:'<p>No exam history found for this Student ID.</p>');panel.querySelector("p.muted.small").textContent=`Registered ${student.created_at?new Date(student.created_at).toLocaleDateString():"date unavailable"}. History is matched using the Student ID.`;}
    catch(err){panel.querySelector("h4").insertAdjacentHTML("afterend",`<p class="error">Could not load exam history: ${esc(err.message)}</p>`);}
  }
  function renderRegisteredStudents(){const q=($("studentSearch")?.value||"").toLowerCase();const list=(window.__acStudents||[]).filter(s=>[s.full_name,s.student_id,s.phone].some(v=>String(v||"").toLowerCase().includes(q)));$("registeredStudentRows").innerHTML=list.length?list.map(s=>`<tr><td>${esc(s.full_name)}</td><td>${esc(s.student_id)}</td><td>${esc(s.dob)}</td><td>${esc(s.phone)}</td><td>${esc(s.created_at?new Date(s.created_at).toLocaleDateString():"—")}</td><td><button type="button" class="edit-student" data-id="${esc(s.id)}">View / Edit</button></td></tr>`).join(""):'<tr><td colspan="6">No registered students found.</td></tr>';document.querySelectorAll(".edit-student").forEach(b=>b.addEventListener("click",()=>{const s=(window.__acStudents||[]).find(x=>x.id===b.dataset.id);if(!s)return;$("editStudentRowId").value=s.id;$("editStudentName").value=s.full_name;$("editStudentId").value=s.student_id;$("editStudentDob").value=s.dob;$("editStudentPhone").value=s.phone;message("studentEditStatus","Editing "+s.full_name);loadOneStudentHistory(s);}));}
  // Delegate assignment clicks: legacy rows are rendered after the registered-student table.
  document.addEventListener("click", async event => {
    const button = event.target.closest(".assign-student-id");
    if (!button) return;
    const id = button.dataset.attempt;
    const row = button.closest("tr");
    const select = row?.querySelector(".legacy-student-select");
    const studentId = select?.value;
    if (!studentId) { alert("Choose a registered student first."); return; }
    const student = (window.__acStudents || []).find(s => s.student_id === studentId);
    if (!student) { alert("Selected registered student could not be found. Refresh the page and try again."); return; }
    if (!confirm(`Assign ${student.full_name} (${student.student_id}) to this exam attempt?`)) return;
    button.disabled = true;
    try {
      const { data, error } = await client.from("ac_exam_attempts")
        .update({ roll_number: student.student_id, student_name: student.full_name })
        .eq("id", id).select("id,roll_number,student_name").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No attempt was updated. Check the admin UPDATE policy for ac_exam_attempts.");
      message("studentRegistryStatus", `Assigned ${student.student_id} to the selected attempt.`);
      await loadData();
      await loadRegisteredStudents();
    } catch (err) {
      alert("Could not assign Student ID: " + (err.message || "Check Supabase permissions."));
    } finally { button.disabled = false; }
  });
  $("studentSearch")?.addEventListener("input",renderRegisteredStudents);
  $("cancelStudentEdit")?.addEventListener("click",()=>{$("studentEditForm").reset();$("editStudentRowId").value="";message("studentEditStatus","");});
  $("studentEditForm")?.addEventListener("submit",async e=>{e.preventDefault();const id=$("editStudentRowId").value;if(!id){message("studentEditStatus","Select a student using View / Edit first.");return;}const payload={full_name:$("editStudentName").value.trim(),student_id:$("editStudentId").value.trim(),dob:$("editStudentDob").value,phone:$("editStudentPhone").value.trim()};try{const {error}=await client.from("ac_student_registry").update(payload).eq("id",id);if(error)throw error;message("studentEditStatus","Student details updated.");await loadRegisteredStudents();}catch(err){message("studentEditStatus",err.message||"Update failed. Check admin RLS permissions.");}});
  $("importQuestionsBtn")?.addEventListener("click", async () => {
    const file=$("bulkQuestionFile")?.files?.[0], exam_id=$("questionExam")?.value;
    if(!file){message("bulkImportStatus","Choose an Excel or CSV file first.");return;} if(!exam_id){message("bulkImportStatus","Choose the Subject / Question Set first.");return;} if(!window.XLSX){message("bulkImportStatus","Excel reader could not load. Refresh and try again.");return;}
    const btn=$("importQuestionsBtn");btn.disabled=true;message("bulkImportStatus","Reading file…");
    try{const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:"array"});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});if(!rows.length)throw Error("No question rows found in the first sheet.");
      const pick=(r,keys)=>{const k=Object.keys(r).find(x=>keys.includes(x.toLowerCase().replace(/[^a-z0-9]/g,"")));return k===undefined?"":r[k];};
      const {data:last,error:le}=await client.from("ac_exam_questions").select("sort_order").eq("exam_id",exam_id).order("sort_order",{ascending:false}).limit(1);if(le)throw le;let order=(last?.[0]?.sort_order??0)+1;
      const payload=rows.map((r,i)=>{const question_text=String(pick(r,["question","questiontext","questionname"])).trim();const options=[pick(r,["optiona","a"]),pick(r,["optionb","b"]),pick(r,["optionc","c"]),pick(r,["optiond","d"])].map(x=>String(x).trim());let c=String(pick(r,["correctoption","correctanswer","answer","correct"])).trim().toUpperCase();const map={A:0,B:1,C:2,D:3,"0":0,"1":1,"2":2,"3":3};if(!question_text||options.some(x=>!x)||map[c]===undefined)throw Error(`Row ${i+2}: missing question/options or invalid Correct Option.`);return {exam_id,question_text,options,correct_option:map[c],chapter:String(pick(r,["chapter","topic"])).trim(),explanation:String(pick(r,["explanation","solution"])).trim(),sort_order:order++};});
      for(let i=0;i<payload.length;i+=100){const {error}=await client.from("ac_exam_questions").insert(payload.slice(i,i+100));if(error)throw error;}message("bulkImportStatus",`${payload.length} question(s) imported into the selected set.`,true); await loadQuestionList();
    }catch(err){message("bulkImportStatus",`Import failed: ${err.message||"Check file columns and question table permissions."}`);}finally{btn.disabled=false;}
  });

  async function loadQuestionList(){
    const examId=$("questionExam")?.value, body=$("questionListRows"); if(!body)return; if(!examId){body.innerHTML='<tr><td colspan="5">Choose a question set.</td></tr>';return;}
    message("questionListStatus","Loading questions…");
    try{const {data,error}=await client.from("ac_exam_questions").select("id,question_text,options,correct_option,chapter,explanation,sort_order").eq("exam_id",examId).order("sort_order",{ascending:true});if(error)throw error;body.innerHTML=(data||[]).length?data.map((q,i)=>`<tr><td>${i+1}</td><td>${esc(q.question_text)}</td><td>${esc(q.chapter||"—")}</td><td>${["A","B","C","D"][Number(q.correct_option)]||esc(q.correct_option)}</td><td><button type="button" class="edit-question" data-id="${esc(q.id)}">Edit</button> <button type="button" class="delete-question danger-button" data-id="${esc(q.id)}">Delete</button></td></tr>`).join(""):'<tr><td colspan="5">No questions in this set yet.</td></tr>';message("questionListStatus",`${(data||[]).length} question(s) in selected set.`);}catch(err){body.innerHTML='<tr><td colspan="5">Could not load questions.</td></tr>';message("questionListStatus",err.message||"Question list unavailable.");}
  }
  $("questionExam")?.addEventListener("change",loadQuestionList);
  document.addEventListener("click",async event=>{
    const editExam=event.target.closest(".edit-exam"); if(editExam){location.href=`edit-exam.html?id=${encodeURIComponent(editExam.dataset.id)}`;return;}
    const eq=event.target.closest(".edit-question");if(eq){location.href=`edit-question.html?id=${encodeURIComponent(eq.dataset.id)}`;return;}
    const dq=event.target.closest(".delete-question");if(dq){if(!confirm("Delete this question permanently?"))return;try{const {error}=await client.from("ac_exam_questions").delete().eq("id",dq.dataset.id);if(error)throw error;await loadQuestionList();}catch(err){alert("Could not delete question: "+err.message);}}
  });
  document.addEventListener("click",event=>{if(event.target.closest(".edit-exam"))return;});
  init().then(()=>loadQuestionList()).catch(() => { message("examStatus", "Unable to load the dashboard. Please sign in again or check the database permissions."); });
})();
