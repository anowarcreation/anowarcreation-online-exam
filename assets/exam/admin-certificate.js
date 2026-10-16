(() => {
  "use strict";
  const URL = "https://tlsrvyqyhonnrlcdmlzo.supabase.co";
  const KEY = "sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";
  const client = window.supabase?.createClient ? window.supabase.createClient(URL, KEY) : null;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const setStatus = s => { $("certStatus").textContent = s; };
  async function init(){
    if(!client){setStatus("Authentication service unavailable.");return;}
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError||!session){location.replace("index.html");return;}
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user){location.replace("index.html");return;}
    const {data:profile,error:profileError}=await client.from("admin_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(profileError||!profile||!["admin","exam_manager"].includes(profile.role)){await client.auth.signOut();location.replace("index.html");return;}
    const attemptId=new URLSearchParams(location.search).get("attempt");
    if(!attemptId){setStatus("No attempt was selected.");$("certificateRoot").innerHTML="<p>Open a certificate from the Admin Dashboard.</p>";return;}
    const {data:a,error}=await client.from("ac_exam_attempts").select("id,exam_id,student_name,roll_number,score,status,submitted_at,certificate_no,ac_exams(title,subject,positive_marks,pass_percentage)").eq("id",attemptId).maybeSingle();
    if(error||!a){setStatus("Certificate record could not be loaded. Check database permissions.");$("certificateRoot").innerHTML="<h2>Certificate unavailable</h2><p>This attempt could not be retrieved from the secured database.</p>";return;}
    const exam=a.ac_exams||{}; const {count:questionCount,error:countError}=await client.from("ac_exam_questions").select("id",{count:"exact",head:true}).eq("exam_id",a.exam_id);
    const total=(!countError&&questionCount)||0; const max=total*Number(exam.positive_marks||4); const score=Number(a.score||0); const pct=max?Math.max(0,score)/max*100:0; const pass=pct>=Number(exam.pass_percentage??40); const certNo=a.certificate_no||"";
    if(a.status!=="submitted"||!pass||!certNo){setStatus(pass?"Passed, but the server has not issued a certificate number yet.":"This student did not pass; no certificate is available.");$("certificateRoot").innerHTML=`<h2>Certificate unavailable</h2><p>Student: ${esc(a.student_name)}</p><p>Result: <strong>${pass?"PASS":"FAIL"}</strong> · Score: ${esc(a.score??"—")} / ${max} (${pct.toFixed(1)}%)</p><p>A certificate is shown only for a submitted passing attempt with a certificate number issued by the exam backend.</p>`;return;}
    const date=a.submitted_at?new Date(a.submitted_at):new Date(); const dateText=date.toLocaleDateString("en-IN");
    const verifyUrl=`${location.origin}${location.pathname.replace(/exam-admin\/certificate-admin\.html$/,"exam/verify-certificate.html")}?certificate=${encodeURIComponent(certNo)}`;
    $("certificateRoot").innerHTML=`<section class="certificate-sheet" aria-label="Anowar Creation certificate"><div class="cert-field cert-id">${esc(certNo)}</div><div class="cert-field cert-student-name">${esc(a.student_name||"Student")}</div><div class="cert-field cert-exam-name">${esc(exam.title||"Online Examination")}</div><div class="cert-field cert-exam-code">—</div><div class="cert-field cert-score">${esc(a.score)} / ${total}</div><div class="cert-field cert-percentage">${pct.toFixed(1)}%</div><div class="cert-field cert-result">PASS</div><div id="certQr" class="cert-qr" role="img" aria-label="Certificate verification QR code"></div><a id="verifyCertLink" class="cert-verify-link" href="${esc(verifyUrl)}" target="_blank" rel="noopener" aria-label="Verify certificate"></a><div class="cert-field cert-issue-date">${esc(dateText)}</div></section>`;
    // The QR encodes the verification URL; the verification page still requires its secure Edge Function to be deployed.
    const qr=$('certQr'); if(window.QRCode){qr.innerHTML="";new QRCode(qr,{text:verifyUrl,width:100,height:100,colorDark:"#071b3d",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});}else{qr.textContent="QR unavailable";}
    setStatus("Certificate loaded. Deploy the verify-certificate Edge Function to activate online verification.");
  }
  $("printCertificate")?.addEventListener("click",()=>window.print());
  init().catch(()=>{setStatus("Could not load certificate. Check login and database permissions.");});
})();
