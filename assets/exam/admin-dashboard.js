(() => {
  "use strict";
  const SUPABASE_URL = "https://tlsrvyqyhonnrlcdmlzo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";
  const $ = (id) => document.getElementById(id);
  const client = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let exportRows = [];
  function message(id, text) { const el = $(id); if (el) el.textContent = text; }
  function csvDownload(rows) {
    if (!rows.length) { message("resultStatus", "There are no result records to export."); return; }
    const cols = ["student_name", "roll_number", "exam_title", "score", "status", "submitted_at"];
    const quote = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const content = [cols.join(","), ...rows.map(r => cols.map(c => quote(r[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([content], {type:"text/csv;charset=utf-8;"}));
    const a = document.createElement("a"); a.href = url; a.download = "anowar-creation-exam-results.csv"; a.click(); URL.revokeObjectURL(url);
  }
  async function init() {
    if (!client) { message("examStatus", "Unable to load the authentication service. Refresh the page and try again."); return; }
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) { location.replace("index.html"); return; }
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) { location.replace("index.html"); return; }
    const { data: profile, error: profileError } = await client.from("admin_profiles").select("role").eq("user_id", userData.user.id).maybeSingle();
    if (profileError || !profile || !["admin", "exam_manager"].includes(profile.role)) {
      await client.auth.signOut(); location.replace("index.html"); return;
    }
    await loadData();
  }
  async function loadData() {
    const [examsResult, attemptsResult] = await Promise.all([
      client.from("exams").select("id,title,subject,duration_minutes,is_published,created_at").order("created_at", {ascending:false}),
      client.from("attempts").select("id,exam_id,student_name,roll_number,score,status,submitted_at,created_at,exams(title)").order("created_at", {ascending:false}).limit(500)
    ]);
    if (examsResult.error) {
      message("examStatus", "Exam records could not be loaded. Check the exams table permissions and admin RLS policies.");
      $("adminExamRows").innerHTML = '<tr><td colspan="5">No exam data available.</td></tr>';
      $("examCount").textContent = "—";
    } else {
      const exams = examsResult.data || [];
      $("examCount").textContent = String(exams.length);
      $("adminExamRows").innerHTML = exams.length ? exams.map(e => `<tr><td>${esc(e.title)}</td><td>${esc(e.subject)}</td><td>Stored securely</td><td>${esc(e.duration_minutes)} min</td><td>${e.is_published ? "Published" : "Unpublished"}</td></tr>`).join("") : '<tr><td colspan="5">No examinations have been created yet.</td></tr>';
      message("examStatus", exams.length ? `${exams.length} examination record(s) loaded.` : "No examination records are available yet.");
    }
    if (attemptsResult.error) {
      message("resultStatus", "Student results could not be loaded. Check the attempts table permissions and admin RLS policies.");
      $("adminStudentRows").innerHTML = '<tr><td colspan="6">No result data available.</td></tr>';
      $("attemptCount").textContent = "—"; $("submittedCount").textContent = "—";
      exportRows = [];
    } else {
      const attempts = attemptsResult.data || [];
      const submitted = attempts.filter(a => a.status === "submitted");
      $("attemptCount").textContent = String(attempts.length);
      $("submittedCount").textContent = String(submitted.length);
      exportRows = submitted.map(a => ({student_name:a.student_name,roll_number:a.roll_number,exam_title:a.exams?.title || "",score:a.score,status:a.status,submitted_at:a.submitted_at}));
      $("adminStudentRows").innerHTML = attempts.length ? attempts.map(a => `<tr><td>${esc(a.student_name)}</td><td>${esc(a.roll_number)}</td><td>${esc(a.exams?.title || "—")}</td><td>${a.score == null ? "—" : esc(a.score)}</td><td>${esc(a.status)}</td><td>${esc(a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "Not submitted")}</td></tr>`).join("") : '<tr><td colspan="6">No student attempts have been recorded yet.</td></tr>';
      message("resultStatus", `${attempts.length} attempt record(s) loaded; ${submitted.length} submitted.`);
    }
  }
  $("adminLogout")?.addEventListener("click", async () => { await client?.auth.signOut(); location.replace("index.html"); });
  $("exportResults")?.addEventListener("click", () => csvDownload(exportRows));
  init().catch(() => { message("examStatus", "Unable to load the dashboard. Please sign in again or check the database permissions."); });
})();
