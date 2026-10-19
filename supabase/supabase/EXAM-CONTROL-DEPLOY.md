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


## Student duration and open/close switch update

This update makes the student landing-page duration/max-marks cards load from the latest exam record through `GET /functions/v1/exam-start`. The same function returns the validated exam code with the exam-start payload so certificates can display it. The server still rejects new starts when `is_published = false`.

Admin dashboard now has a visible ON/OFF switch; click it and then click **Save exam settings**. The switch only takes effect after saving. Deploy the updated `supabase/functions/exam-start/index.ts` function as `exam-start` after the migration has been applied.

Certificate score denominator is now maximum marks (`question_count × positive_marks`), so a 30-question, +4 exam displays scores such as `60 / 120`, not `60 / 30`.
