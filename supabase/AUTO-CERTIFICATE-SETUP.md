# Automatic certificate + Admin results setup

This package is aligned to the existing `ac_exams`, `ac_exam_questions`, `ac_exam_attempts`, `ac_exam_answers`, and `ac_exam_certificates` tables. It does not alter/delete existing attempts.

## 1. Backup first
Export your current Supabase schema/data before applying the migration. Confirm the five table names and columns match the screenshots.

## 2. Run migration
Supabase Dashboard → SQL Editor → run `migration-auto-certificates-admin.sql`. It adds `pass_percentage` (default 40), creates a transactional finalizer RPC, unique certificate indexes, and admin read policies. If your `ac_exam_answers` column names differ, stop and adjust the migration first.

## 3. Deploy Edge Functions
Deploy the included `functions/exam-submit/index.ts` to the existing function name `exam-submit`, and `functions/verify-certificate/index.ts` as `verify-certificate`. Keep `EXAM_SUPABASE_KEY` set to the privileged server key in Edge Function secrets only; never put it in browser code.

## 4. Existing exam-start
Keep the current `exam-start` function for now. It already returns question IDs/text/options without answer keys. Verify `started_at` has a database default of `now()`.

## 5. Replace question bank (optional but requested)
After backup, review and run `replace-biology-question-bank.sql` only if the exact target exam title is `Biology Demo Exam`. It deletes/replaces only that exam’s question rows. Existing attempts/results remain in place, but do not change questions during an active exam.

## 6. Publish frontend
Replace the repository contents with this package and push to the existing GitHub Pages branch. The admin dashboard/certificate page now query `ac_*` tables.

## Important
The migration and functions are prepared from the columns shown in the screenshots and the code shared in chat, but they have not been executed against your live Supabase project. Test with a non-production test exam first.
