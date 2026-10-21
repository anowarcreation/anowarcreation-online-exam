(() => {
  "use strict";
  const SUPABASE_URL = "https://tlsrvyqyhonnrlcdmlzo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";
  const API = `${SUPABASE_URL}/functions/v1/special-exam-api`;
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = v => v ? new Date(v).toLocaleString([], {dateStyle:"medium",timeStyle:"short"}) : "—";
  let session=null, exams=[], attempts=[], events=[], selectedId="", liveRoom=null, refreshTimer=null;
  const msg=(id,text)=>{if($(id))$(id).textContent=text;};
  async function api(action, payload={}) {
    const headers={"Content-Type":"application/json","apikey":SUPABASE_KEY};
    if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;
    const r=await fetch(API,{method:"POST",headers,body:JSON.stringify({action,...payload})});
    const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`); return d;
  }
  async function init(){
    if(!client){msg("spControlMsg","Supabase failed to load.");return;}
    const {data:{session:s}}=await client.auth.getSession(); session=s;
    if(!session){location.replace("index.html");return;}
    const {data:{user},error:ue}=await client.auth.getUser();
    if(ue||!user){location.replace("index.html");return;}
    const {data:profile,error:pe}=await client.from("admin_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(pe||!profile||!["admin","exam_manager"].includes(profile.role)){await client.auth.signOut();location.replace("index.html");return;}
    const {data:sets,error}=await client.from("ac_exams").select("id,title,subject,set_number,duration_minutes,is_published").order("created_at",{ascending:false});
    if(error)throw error;
    $("spQuestionSet").innerHTML=(sets||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.title)} · ${esc(x.subject)} · Set ${Number(x.set_number||1)}${x.is_published?" · Published":" · Closed"}</option>`).join("")||'<option value="">Create a question set first</option>';
    const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;$("spStart").value=today;$("spEndDate").value=today;
    await load();
    refreshTimer=setInterval(()=>load().catch(e=>msg("spControlMsg",e.message)),5000);
  }
  async function load(){
    const d=await api("admin-list"); exams=d.exams||[];attempts=d.attempts||[];events=d.events||[];
    if(!selectedId && exams.length)selectedId=exams.find(x=>x.status==="live")?.id||exams[0].id;
    renderExams();renderSelected();
  }
  function renderExams(){
    $("spExamRows").innerHTML=exams.length?exams.map(e=>`<tr><td><strong>${esc(e.title)}</strong><br><small>${esc(e.ac_exams?.title||e.ac_exams?.subject||"")}</small></td><td>${fmt(e.scheduled_start_at)}<br>to ${fmt(e.scheduled_end_at)}</td><td>₹${Number(e.prize_amount||0).toLocaleString("en-IN")}</td><td><span class="sp-status ${esc(e.status)}">${esc(e.status.toUpperCase())}</span></td><td><div class="sp-actions"><button data-select="${esc(e.id)}" class="secondary">Select</button>${e.status==="scheduled"?`<button data-start="${esc(e.id)}">Start Exam</button>`:""}${e.status==="live"?`<button data-monitor="${esc(e.id)}">Monitor</button><button class="sp-danger" data-end="${esc(e.id)}">End Now</button>`:""}</div></td></tr>`).join(""):'<tr><td colspan="5">No Special Exams yet. Create one above.</td></tr>';
  }
  function renderSelected(){
    const e=exams.find(x=>x.id===selectedId);
    if(!e){$("spCurrentSummary").textContent="Create or select a Special Exam.";$("spConnectMonitor").disabled=true;$("spEndNow").disabled=true;return;}
    $("spCurrentSummary").innerHTML=`<strong>${esc(e.title)}</strong><br>Status: <b>${esc(e.status.toUpperCase())}</b><br>Start: ${fmt(e.scheduled_start_at)}<br>Fixed end: ${fmt(e.scheduled_end_at)}<br>Prize: ₹${Number(e.prize_amount||0)}<br><span class="sp-muted">Students who enter late receive only the time remaining until the fixed end.</span>`;
    $("spConnectMonitor").disabled=e.status!=="live";$("spEndNow").disabled=e.status!=="live";
    const aa=attempts.filter(a=>a.special_exam_id===selectedId);
    $("spAttemptRows").innerHTML=aa.length?aa.map(a=>{const ee=events.filter(x=>x.attempt_id===a.id);const latest=ee.slice(0,3).map(x=>`${x.event_type}: ${x.message}`).join(" · ")||"—";return `<tr><td><strong>${esc(a.student_name)}</strong></td><td>${esc(a.student_id)}</td><td>${a.score==null?"—":esc(a.score)}</td><td><span class="sp-status ${a.status==="in_progress"?"live":a.status==="removed"?"ended":""}">${esc(a.status)}</span></td><td>${esc(latest)}</td><td><div class="sp-actions">${a.status==="in_progress"?`<button class="secondary" data-warn="${esc(a.id)}">Send Warning</button><button class="sp-danger" data-remove="${esc(a.id)}">Remove &amp; Submit</button>`:"Finalized"}</div></td></tr>`}).join(""):'<tr><td colspan="6">No students have started this Special Exam.</td></tr>';
    const eligible=aa.filter(a=>["submitted","expired"].includes(a.status));
    $("spWinnerAttempt").innerHTML='<option value="">Choose a completed attempt</option>'+eligible.map(a=>`<option value="${esc(a.id)}">${esc(a.student_name)} · ${esc(a.student_id)} · Score ${esc(a.score??"—")}</option>`).join("");
    const ev=events.filter(x=>x.special_exam_id===selectedId).slice(0,100);
    $("spIncidentRows").innerHTML=ev.length?ev.map(x=>{const a=aa.find(y=>y.id===x.attempt_id);return `<tr><td>${fmt(x.created_at)}</td><td>${esc(a?.student_id||"—")}</td><td>${esc(x.event_type)}</td><td>${esc(x.message)}</td></tr>`}).join(""):'<tr><td colspan="4">No incidents recorded yet.</td></tr>';
  }
  $("spCreateForm").addEventListener("submit",async e=>{e.preventDefault();const btn=$("spCreateBtn");btn.disabled=true;msg("spCreateMsg","Creating Special Exam…");try{const start=new Date(`${$("spStart").value}T${$("spStartTime").value}`),end=new Date(`${$("spEndDate").value}T${$("spEndTime").value}`);const d=await api("create",{title:$("spTitle").value.trim(),examId:$("spQuestionSet").value,scheduledStartAt:start.toISOString(),scheduledEndAt:end.toISOString(),prizeAmount:Number($("spPrize").value)});selectedId=d.exam.id;msg("spCreateMsg","Special Exam created. Start it from the controls when ready.");await load();}catch(err){msg("spCreateMsg",err.message)}finally{btn.disabled=false}});
  async function startExam(id){selectedId=id;const e=exams.find(x=>x.id===id);if(!confirm(`Start “${e?.title||"Special Exam"}” now? Students can enter after this, and all timers end at the fixed scheduled end time.`))return;try{await api("start",{specialExamId:id});msg("spControlMsg","Special Exam is LIVE.");await load();}catch(err){msg("spControlMsg",err.message)}}
  async function endExam(id){selectedId=id;if(!confirm("End this Special Exam now? Active attempts will be finalized using the answers saved on the server."))return;try{const d=await api("end",{specialExamId:id});msg("spControlMsg",`Exam ended. Finalized ${d.endedAttempts||0} active attempt(s).`);await load();}catch(err){msg("spControlMsg",err.message)}}
  async function connectMonitor(id){selectedId=id;await load();try{if(liveRoom){liveRoom.disconnect();liveRoom=null;}const d=await api("admin-token",{specialExamId:id});const LK=await import("https://cdn.jsdelivr.net/npm/livekit-client@2.9.6/+esm");const room=new LK.Room({adaptiveStream:true,dynacast:true});liveRoom=room;const mount=(track,publication,participant)=>{if(track.kind!=="video")return;if($("spFeeds").querySelector(`[data-identity="${CSS.escape(participant.identity)}"]`))return;const box=document.createElement("div");box.className="sp-feed";box.dataset.identity=participant.identity;const video=track.attach();box.appendChild(video);const attemptId=participant.identity.replace(/^stu-/ ,"");const a=attempts.find(x=>x.id===attemptId);const label=document.createElement("span");label.textContent=`${a?.student_name||participant.name||"Student"} · ${a?.student_id||attemptId.slice(0,8)}`;box.appendChild(label);$("spFeeds").appendChild(box);};room.on(LK.RoomEvent.TrackSubscribed,mount);room.on(LK.RoomEvent.TrackUnsubscribed,(track)=>{track.detach().forEach(el=>el.remove());});room.on(LK.RoomEvent.ParticipantDisconnected,p=>{const el=$("spFeeds").querySelector(`[data-identity="${CSS.escape(p.identity)}"]`);el?.remove();});$("spFeeds").innerHTML="";await room.connect(d.livekitUrl,d.token);for(const p of room.remoteParticipants.values())for(const pub of p.trackPublications.values())if(pub.track)mount(pub.track,pub,p);msg("spControlMsg","Live monitoring connected.");}catch(err){$("spFeeds").innerHTML=`<div class="sp-note">Could not connect live video: ${esc(err.message)}. Check LiveKit secrets and deployment settings.</div>`;msg("spControlMsg",err.message)}}
  document.addEventListener("click",async e=>{const t=e.target.closest("button");if(!t)return;if(t.dataset.select){selectedId=t.dataset.select;renderSelected();return;}if(t.dataset.start)return startExam(t.dataset.start);if(t.dataset.end)return endExam(t.dataset.end);if(t.dataset.monitor)return connectMonitor(t.dataset.monitor);if(t.dataset.warn||t.dataset.remove){const remove=Boolean(t.dataset.remove),attemptId=t.dataset.warn||t.dataset.remove;const reason=remove?prompt("Removal reason (shown in the audit log):","Suspected violation of exam rules") : prompt("Warning message to show the student:","Official Warning: Please follow the examination rules. Repeated violations may lead to removal.");if(reason===null)return;try{await api("admin-action",{attemptId,kind:remove?"remove":"warning",reason});msg("spControlMsg",remove?"Student removed and saved answers submitted.":"Warning sent to the student.");await load();}catch(err){msg("spControlMsg",err.message)}}});
  $("spRefresh").addEventListener("click",()=>load().catch(e=>msg("spControlMsg",e.message)));
  $("spConnectMonitor").addEventListener("click",()=>connectMonitor(selectedId));
  $("spEndNow").addEventListener("click",()=>endExam(selectedId));
  $("spWinnerForm").addEventListener("submit",async e=>{e.preventDefault();const attemptId=$("spWinnerAttempt").value;if(!attemptId){msg("spWinnerMsg","Choose a finalized attempt first.");return;}if(!confirm("Declare this student as the Special Exam cash-prize winner? This will record the admin decision."))return;try{await api("declare-winner",{attemptId,note:$("spWinnerNote").value.trim()});msg("spWinnerMsg","Winner declaration saved.");await load();}catch(err){msg("spWinnerMsg",err.message)}});
  $("spLogout").addEventListener("click",async()=>{if(liveRoom)liveRoom.disconnect();if(refreshTimer)clearInterval(refreshTimer);await client?.auth.signOut();location.replace("index.html")});
  init().catch(err=>msg("spControlMsg",err.message||"Could not initialize Special Exam admin."));
})();
