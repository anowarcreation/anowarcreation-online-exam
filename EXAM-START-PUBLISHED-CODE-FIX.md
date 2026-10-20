# Exam start fix: published Physics exam still rejected

The screenshot shows several duplicate Physics exam records sharing the same code, including closed records and one open record. The previous `exam-start` function used `.maybeSingle()` for the exam-code hash; multiple matching rows make Supabase return an error, which surfaced as “Unable to start exam”.

## Deploy
1. In Supabase, open Edge Functions and redeploy `exam-start` using `supabase/functions/exam-start/index.ts` from this ZIP.
2. Ensure the `EXAM_SUPABASE_KEY` secret is configured.
3. In Admin → Exam Management, publish the intended Physics Subject + Set. Prefer unique exam codes per published set.
4. Test with that exact code.

The function now fetches matching records as a list, selects the newest published record, and falls back to exact exam-code matching for older rows whose hash is missing/stale. It does not change or delete existing exams/questions/results.
