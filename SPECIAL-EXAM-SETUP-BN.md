# Anowar Creation — Special Prize Exam (পরীক্ষামূলক সংযোজন)

এই আপডেটটি বিদ্যমান Exam System-এর পাশে আলাদা Special Prize Exam যোগ করে। সাধারণ পরীক্ষার টেবিল/attempt-এ কোনো পরিবর্তন বা deletion করে না।

## এই প্যাকেজে যা যোগ হয়েছে

- Admin Panel-এর sidebar-এ **Special Prize Exam** link
- Admin থেকে existing question set বেছে নতুন Special Exam schedule করা
- Admin Start/End control; সবার জন্য একই `scheduled_end_at` deadline
- Student portal থেকে Enter Examination gateway দিয়ে Special Exam-এ প্রবেশ (হোমপেজে আলাদা Special Exam card নেই)
- Camera permission, LiveKit video publishing এবং Admin live monitoring UI
- Server-side autosave ও time-up submission
- Admin warning, Remove & Submit, incident log, manual winner declaration (cash prize up to ₹500)
- Regular exam থেকে আলাদা tables ও Edge Function
- Completed/expired (but not removed) attempts-এর জন্য participation e-certificate ও public verification page
- রঙিন student portal, সব exam page-এর consistent visual theme এবং admin-uploaded Notice Board image + destination link

## 1. Supabase SQL

Supabase Dashboard → SQL Editor → New query-তে `special-exam-migration.sql`-এর সম্পূর্ণ SQL রান করুন। এটি নতুন তিনটি table তৈরি করে:

- `ac_special_exams`
- `ac_special_exam_attempts`
- `ac_special_exam_events`

কোনো regular attempt মুছে ফেলা হয় না।

## 2. LiveKit account ও secrets

Live video চালু করতে LiveKit Cloud (বা নিজস্ব LiveKit server) লাগবে। LiveKit project থেকে WebSocket URL, API Key ও API Secret নিন। এগুলো browser code-এ লিখবেন না।

Supabase Dashboard → Edge Functions → Secrets-এ সেট করুন:

- `SUPABASE_SERVICE_ROLE_KEY` = project-এর service-role key (শুধু server secret হিসেবে)
- `LIVEKIT_URL` = LiveKit project URL, সাধারণত `wss://...`
- `LIVEKIT_API_KEY` = LiveKit API key
- `LIVEKIT_API_SECRET` = LiveKit API secret

কোনো secret HTML/JavaScript/GitHub-এ commit করবেন না।

## 3. Edge Function deploy

এই ফোল্ডার `supabase/functions/special-exam-api/index.ts`-কে `special-exam-api` নামে deploy করুন। Function-এ JWT verification বন্ধ রাখতে হবে, কারণ student actions public request দিয়ে আসে; কিন্তু admin actions function-এর ভেতরেই Supabase JWT ও `admin_profiles.role` দিয়ে যাচাই হয়।

Supabase CLI ব্যবহার করলে:

```bash
supabase functions deploy special-exam-api --no-verify-jwt
```

Deploy শেষে Function Logs-এ import/runtime error আছে কি না দেখুন।

## 5. Website files upload

ZIP extract করুন। ZIP-এর ভিতরে `anowarcreation-online-exam-main/` ফোল্ডারের contents-গুলো বিদ্যমান `anowarcreation-online-exam` GitHub repository-এর root-এ আপলোড করুন, একই নামের ফাইল replace করুন, তারপর commit/publish করুন। শুধু ZIP-টি repository-তে আপলোড করবেন না।

## Notice Board সেটআপ

`notice-board-migration.sql` রান করুন (অথবা উপরের `special-exam-migration.sql`-এর পুরো SQL একবারে রান করুন, যদি আগে special-exam tables তৈরি না হয়ে থাকে)। Admin Dashboard → Notice Board থেকে PNG/JPG/WEBP image upload করুন এবং button destination URL দিন। Student portal-এ image এবং “Click here” button দেখা যাবে।

## 6. প্রথমে test করুন

1. Admin login করে `Special Prize Exam` খুলুন।
2. Existing GK question set তৈরি/নির্বাচন করুন; সেটিতে প্রশ্ন থাকতে হবে।
3. তারিখ, শুরু ও শেষের সময় ঠিক করে Special Exam তৈরি করুন।
4. LiveKit secrets ও function ঠিক থাকলে `Start Exam` চাপুন।
5. আলাদা browser/device-এ registered Student ID দিয়ে camera allow করে join করুন।
6. Admin monitoring-এ video feed দেখা যায় কি না পরীক্ষা করুন।
7. Warning, Remove & Submit, end-time auto-submit, refresh/reconnect এবং winner declaration test করুন।

## গুরুত্বপূর্ণ সীমাবদ্ধতা / production checklist

- এটি **source-code update**; live website-এ deploy করা হয়নি এবং Supabase project-এ SQL/Function চালানো হয়নি।
- Live video কাজ করার জন্য LiveKit account/secrets ও Edge Function deployment আবশ্যক।
- Special Exam-এর participation e-certificate আলাদা certificate page-এ তৈরি হয়; এটি regular certificate table থেকে আলাদা এবং public verification endpoint দিয়ে যাচাই হয়। Deployment-এর পরে বাস্তব student দিয়ে verify করতে হবে।
- Browser tab switching/camera events audit log-এ যায়, কিন্তু এগুলো একা cheating প্রমাণ করে না। Admin review করেই ব্যবস্থা নেবেন।
- Admin Remove করলে server-এ শেষবার saved answers grade করে finalize হয়। খুব সাম্প্রতিক answer network save হওয়ার আগে remove হলে তা অন্তর্ভুক্ত নাও হতে পারে; তাই student-side autosave পরীক্ষা করুন।
- পরীক্ষার্থীদের camera monitoring, incident logging এবং retention policy আগে স্পষ্টভাবে জানাতে হবে।
