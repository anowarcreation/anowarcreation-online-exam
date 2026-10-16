(() => {
  const SUPABASE_URL = "https://tlsrvyqyhonnrlcdmlzo.supabase.co";
  const KEY = "sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";
  const certificate = new URLSearchParams(location.search).get("certificate");
  const status = document.getElementById("verifyStatus");
  const result = document.getElementById("verifyResult");
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function run(){
    if(!certificate){status.textContent="No certificate ID was provided.";return;}
    try{
      const response=await fetch(`${SUPABASE_URL}/functions/v1/verify-certificate`,{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY},body:JSON.stringify({certificate_no:certificate})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||"Verification service is not available.");
      if(!data.valid){status.textContent="Certificate not verified.";result.innerHTML='<div class="verify-mark invalid">NOT VERIFIED</div><p>The certificate could not be confirmed as valid.</p>';return;}
      status.textContent="Certificate successfully verified.";
      result.innerHTML=`<div class="verify-mark">VERIFIED</div><p><strong>Certificate ID:</strong> ${esc(data.certificate_no||certificate)}</p><p><strong>Student:</strong> ${esc(data.student_name||"Not provided")}</p><p><strong>Examination:</strong> ${esc(data.exam_title||"Not provided")}</p><p><strong>Result:</strong> ${esc(data.result||"PASS")}</p><p><strong>Issued:</strong> ${esc(data.issued_at?new Date(data.issued_at).toLocaleDateString("en-IN"):"—")}</p>`;
    }catch(e){status.textContent="Online verification is not configured yet.";result.innerHTML='<div class="note">The verification endpoint has not been deployed or is unavailable. Do not treat this certificate as independently verified until the server-side verification function is active.</div>';}
  }
  run();
})();
