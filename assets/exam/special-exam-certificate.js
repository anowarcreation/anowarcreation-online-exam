(() => {
 const API="https://tlsrvyqyhonnrlcdmlzo.supabase.co/functions/v1/special-exam-api",KEY="sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";
 const $=id=>document.getElementById(id);const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function load(){const code=new URLSearchParams(location.search).get("code")||"";if(!code){$("certStatus").textContent="No certificate number was provided.";return;}try{const r=await fetch(`${API}?action=verify-special-certificate&code=${encodeURIComponent(code)}`,{headers:{apikey:KEY}});const d=await r.json();if(!r.ok||!d.valid)throw new Error("Certificate not found or not valid.");const c=d.certificate;$("certStatus").hidden=true;$("certCard").hidden=false;$("certName").textContent=c.studentName;$("certExam").textContent=c.examTitle;$("certScore").textContent=c.score??"—";$("certCode").textContent=c.certificateNo;$("certDate").textContent=c.issuedAt?new Date(c.issuedAt).toLocaleDateString():"—";}catch(e){$("certStatus").textContent=e.message;}}
 $("certPrint").addEventListener("click",()=>window.print());$("certYear").textContent=new Date().getFullYear();load();
})();
