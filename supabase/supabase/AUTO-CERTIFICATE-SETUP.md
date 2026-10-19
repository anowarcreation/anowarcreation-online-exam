# Anowar Creation Online Exam — consolidated update

This package is prepared for the existing Supabase project and `ac_*` tables shown in the user's screenshots. It has **not** been deployed to the live project by this package.

## What this package changes
- `exam-submit` calculates marks on the server, atomically finalizes the attempt through `ac_finalize_exam_attempt`, returns answer-review data, and creates a certificate record when the configured pass percentage is met.
- `verify-certificate` checks that the certificate exists, is not revoked, and belongs to a submitted passing attempt.
- `replace-biology-question-bank.sql` now preserves the old exam/questions/answers/attempts by archiving the currently published `Biology Demo Exam` and creating a new published exam with the same exam code hash and 30 new questions. It does not delete the old question rows.
- The frontend displays `answerReview` returned by the updated `exam-submit` function and shows the certificate number/QR link when the server confirms issuance.
- Admin dashboard reads existing `ac_*` exam and attempt tables (requires authenticated admin RLS policies).

## Deployment steps (follow in order)
1. **Backup first.** In Supabase, export the relevant tables or take a database backup.
2. Run `migration-auto-certificates-admin.sql` in Supabase SQL Editor. If it has already succeeded, do not rerun the question replacement as a substitute for this migration.
3. In Supabase Edge Functions, replace the entire `exam-submit` function source with `functions/exam-submit/index.ts` and deploy it. The function expects `SUPABASE_URL` and `EXAM_SUPABASE_KEY` secrets. `EXAM_SUPABASE_KEY` must be a privileged server-side key stored only in Edge Function secrets, never in frontend code.
4. Create/deploy `verify-certificate` using `functions/verify-certificate/index.ts` and the same secrets.
5. Only after backup and after confirming the currently published exam title/code is the intended Biology exam, run `replace-biology-question-bank.sql`. It preserves the old exam rows for historical attempts and makes a new published exam using the existing exam code. If multiple published rows use the same title or your code hash has a unique constraint that prevents this sequence, stop and inspect the error instead of retrying.
6. Commit the frontend files to the GitHub Pages repository root, preserving the `exam/`, `exam-admin/`, `assets/`, and `supabase/` paths.
7. Hard refresh the site (`Ctrl+Shift+R`) and test with a fresh test attempt: submit, confirm Answer Review appears, confirm a passing attempt has a row in `ac_exam_certificates`, open its certificate, then scan the QR and confirm the verification page says VERIFIED. Also test a failing attempt: it must not receive a certificate.

## Important schema details
- The code uses `ac_exams.pass_percentage` (0–100), not `pass_marks`, to determine PASS. The migration sets a default of 40%. An extra `pass_marks` column is not used by this function.
- The finalizer RPC locks the attempt row and prevents concurrent duplicate certificate issuance. It needs the unique index on `ac_exam_certificates.attempt_id` created by the migration.
- The QR contains the actual verification page URL. The QR image is fetched from `api.qrserver.com`; verification data itself comes from the deployed Supabase `verify-certificate` function.
- GitHub upload alone does not deploy Supabase Edge Functions. Both function deployments and the SQL migration are required.
- Do not expose service-role keys in browser code, screenshots, or GitHub.
