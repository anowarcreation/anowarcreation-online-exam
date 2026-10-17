# Exam control deployment

This update adds Admin Portal controls for exam code, duration, instructions and accepting/closing new attempts. It also makes the certificate read the visible `exam_code` field.

## 1. Database migration
Run `supabase/admin-exam-control-migration.sql` once in Supabase SQL Editor. It adds columns and a role-checked UPDATE policy; it does not delete exam data.

## 2. Set each exam's current code
After migration, open Admin Portal → Exam control, select the exam, enter the exact code you want students to use, set duration/instructions and choose whether it is accepting new attempts. Save.

## 3. Deploy Edge Function
Deploy `supabase/functions/exam-start/index.ts` as the `exam-start` function. Ensure the Edge Function secret `EXAM_SUPABASE_KEY` is a service-role key stored only in Supabase secrets, never in browser code. This function validates SHA-256 exam code hash and rejects new attempts when `is_published` is false.

## 4. Countdown and instructions
The instructions page displays duration, question count, maximum marks, positive/negative marks and pass threshold from the exam data returned by `exam-start`. The timer already reads `duration_minutes` from the started exam. Custom instructions entered in Exam control are shown before the standard rules.

## 5. Important limitation
Closing an exam prevents *new* attempts when the deployed `exam-start` function is updated. Existing in-progress attempts are not force-submitted by this change. Duration changes apply to new attempts; for already-started attempts the submit function may use the current duration, depending on the deployed version.
