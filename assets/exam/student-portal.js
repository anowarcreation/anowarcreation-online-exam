(() => {
"use strict";
const $=id=>document.getElementById(id);
const API="https://tlsrvyqyhonnrlcdmlzo.supabase.co/functions/v1/student-portal";
const KEY="sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function call(body){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed. Please try again.");return d;}
function message(id,text,ok=false){const el=$(id);el.textContent=text;el.style.color=ok?"#126443":"#b42332";}
// Cards are collapsed initially. Opening a card clears its previous form state; the
// Find Student ID action is a separate page and never expands inside Registration.
const serviceCards=[...document.querySelectorAll(".clickable-service")];
function clearCard(card){
  card.querySelectorAll("form").forEach(f=>f.reset());
  card.querySelectorAll(".portal-msg,.error").forEach(el=>{el.textContent="";});
  card.querySelectorAll(".portal-result,#resultList").forEach(el=>{el.innerHTML="";el.classList.add("hidden");});
  card.querySelectorAll(".service-detail-hidden").forEach(el=>el.classList.add("service-detail-hidden"));
}
function setCard(card,open){
  card.classList.toggle("service-open",open);card.setAttribute("aria-expanded",String(open));
  card.querySelectorAll("form,.service-detail-hidden,#resultList").forEach(el=>el.classList.toggle("service-detail-hidden",!open));
  if(!open)clearCard(card);
}
serviceCards.forEach(card=>{
  setCard(card,false);
  const activate=e=>{
    if(e.target.closest("a,button,input,select,textarea,label,form"))return;
    if(card.classList.contains("portal-home-card")){location.href="enter.html#student-entry";return;}
    const open=!card.classList.contains("service-open");
    serviceCards.forEach(other=>{if(other!==card)setCard(other,false);});
    if(open){clearCard(card);setCard(card,true);}else setCard(card,false);
  };
  card.addEventListener("click",activate);
  card.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target===card){e.preventDefault();activate(e);}});
});

function phone(v){return v.replace(/\s+/g,"").trim();}
$("registerForm").addEventListener("submit",async e=>{e.preventDefault();message("registerMsg","Registering…",true);try{const d=await call({action:"register",name:$('regName').value.trim(),dob:$('regDob').value,phone:phone($('regPhone').value)});message("registerMsg","Registration successful. Save or print your Student ID confirmation below.",true);const receipt=$("registrationReceipt");receipt.innerHTML=`<h3>ANOWAR CREATION — STUDENT REGISTRATION</h3><p>Your registration is successful. Keep these details safe.</p><dl><dt>Full Name</dt><dd>${safe($("regName").value.trim())}</dd><dt>Date of Birth</dt><dd>${safe($("regDob").value)}</dd><dt>Phone Number</dt><dd>${safe(phone($("regPhone").value))}</dd><dt>Permanent Student ID</dt><dd><strong>${safe(d.studentId)}</strong></dd></dl><p>Use this Student ID for all future examinations.</p><div class="admit-actions no-print"><button type="button" id="saveRegistrationPdf">Print / Save as PDF</button></div>`;receipt.classList.remove("hidden");$("saveRegistrationPdf").addEventListener("click",()=>{document.body.classList.add("print-registration");window.print();});}catch(err){message("registerMsg",err.message);}});
$("findForm").addEventListener("submit",async e=>{e.preventDefault();message("findMsg","Searching…",true);try{const d=await call({action:"find-id",dob:$('findDob').value,phone:phone($('findPhone').value)});message("findMsg",`Your Student ID: ${d.studentId}. Keep this ID for all future exams.`,true);}catch(err){message("findMsg",err.message);}});
async function loadExams(){try{const d=await call({action:"list-exams"});const sel=$('admitSubject');sel.innerHTML='<option value="">Select examination</option>';for(const x of d.exams||[]){const o=document.createElement('option');o.value=x.id;o.textContent=x.subject||x.title;o.dataset.title=x.title||x.subject;o.dataset.subject=x.subject||x.title;sel.appendChild(o);}if(!d.exams?.length)sel.innerHTML='<option value="">No published exams available</option>';}catch(_){$('admitSubject').innerHTML='<option value="">Could not load exams</option>';}}
$('admitForm').addEventListener('submit',async e=>{e.preventDefault();const box=$('admitResult');box.classList.add('hidden');try{const d=await call({action:'admit-card',studentId:$('admitId').value.trim(),dob:$('admitDob').value,examId:$('admitSubject').value});const a=d.admitCard;box.innerHTML=`<h3>ANOWAR CREATION — ADMIT CARD</h3><dl><dt>Name</dt><dd>${safe(a.name)}</dd><dt>Date of Birth</dt><dd>${safe(a.dob)}</dd><dt>Student ID</dt><dd>${safe(a.studentId)}</dd><dt>Subject</dt><dd>${safe(a.subject)}</dd><dt>Exam Code</dt><dd><strong>${safe(a.examCode)}</strong></dd></dl><h4>Examination Instructions</h4><p>${safe(a.instructions||'Reach the examination page on time. Enter the Student ID and Exam Code shown above. Do not refresh or close the exam while attempting it.')}</p><div class="admit-actions"><button type="button" id="printAdmit">Print / Save PDF</button></div>`;box.classList.remove('hidden');$('printAdmit').addEventListener('click',()=>{document.body.classList.add('print-admit');window.print();document.body.classList.remove('print-admit');});}catch(err){box.innerHTML=`<p class="error">${safe(err.message)}</p>`;box.classList.remove('hidden');}});
$('resultForm').addEventListener('submit',async e=>{e.preventDefault();message('resultMsg','Searching…',true);$('resultList').innerHTML='';try{const d=await call({action:'results',studentId:$('resultId').value.trim(),phone:phone($('resultPhone').value),dob:$('resultDob').value});if(!d.results?.length){message('resultMsg','No exam records found.',true);return;}message('resultMsg','Exam history found.',true);$('resultList').innerHTML=d.results.map(r=>`<div class="portal-result"><strong>${safe(r.subject||r.title||'Examination')}</strong><p>Date: ${safe(r.date||'—')}<br>Score: ${safe(r.score??'Pending')}<br>Status: ${safe(r.status||'—')}<br>Certificate: ${safe(r.certificateNo||'Not issued')}</p></div>`).join('');}catch(err){message('resultMsg',err.message);}});
window.addEventListener("afterprint",()=>document.body.classList.remove("print-registration","print-admit"));
loadExams();
})();