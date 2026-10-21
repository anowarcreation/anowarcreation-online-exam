(()=>{
"use strict";
const U="https://tlsrvyqyhonnrlcdmlzo.supabase.co",K="sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh",BUCKET="ac-exam-notice-images";
const c=window.supabase?.createClient(U,K);const $=id=>document.getElementById(id);
const safeUrl=v=>{try{const u=new URL(v);return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}};
const safeColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||""))?v:"#1267d8";
async function load(){if(!c)return;const {data,error}=await c.from("ac_exam_notice_board").select("image_url,click_url,button_enabled,ticker_text,ticker_color,updated_at").order("updated_at",{ascending:false}).limit(1).maybeSingle();if(error||!data)return;
const img=$("noticeImage"),a=$("noticeImageLink"),btn=$("noticeAction"),empty=$("noticeEmpty");
if(img&&a&&btn){img.src=data.image_url||"";a.href=data.image_url||"#";const actionUrl=safeUrl(data.click_url);if(actionUrl)btn.href=actionUrl;const showButton=data.button_enabled===true&&Boolean(actionUrl);btn.hidden=!showButton;btn.style.display=showButton?"flex":"none";img.addEventListener("error",()=>{a.hidden=true;if(empty)empty.hidden=false},{once:true});a.hidden=false;if(empty)empty.hidden=true;}
const ticker=$("homeAnnouncementTicker"),tickerText=$("homeAnnouncementText");const text=String(data.ticker_text||"").trim().slice(0,240);if(ticker&&tickerText&&text){tickerText.textContent=text;tickerText.style.color=safeColor(data.ticker_color);ticker.hidden=false;}else if(ticker){ticker.hidden=true;}
const status=$("noticeStatus");if(status)status.textContent="Updated "+new Date(data.updated_at).toLocaleDateString();
}load().catch(()=>{});
})();
