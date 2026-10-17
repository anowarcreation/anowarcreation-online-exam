# Student Portal Update — deployment notes

This package adds the Student Portal UI, permanent Student ID registration/recovery, admit-card generation, result lookup, and changes the exam-entry field from Roll Number to Student ID. Existing attempts are retained; the current `roll_number` database column stores the Student ID for backward compatibility with existing result/admin screens.

## Required deployment steps
1. Back up your repository branch and Supabase database first.
2. Run `student-portal-migration.sql` in the Supabase SQL Editor. It creates only `ac_student_registry`; it does not delete exam data.
3. Deploy the new Supabase Edge Function `student-portal` from `functions/student-portal/index.ts` (or the mirrored `supabase/functions/student-portal/index.ts`). It uses the existing server-side `SUPABASE_URL` and `EXAM_SUPABASE_KEY` secrets. Never put the service-role key in browser JavaScript.
4. Deploy the updated static files to the intended GitHub Pages branch.
5. Test registration, ID recovery, admit-card printing, exam entry, and result lookup with a test student before public release.

## Important compatibility note
This package changes the student-facing entry label and sends `studentId` to the exam-start function while retaining the existing `roll_number` database field to avoid destructive schema changes. The registration portal must be deployed alongside the SQL migration and Edge Function; the static page alone cannot access the registry. Admin dashboards that still label the column “Roll number” may need a separate display-label update.

## Security note
Phone + DOB are the requested recovery factors, but they are not strong authentication. Consider adding SMS OTP before exposing the portal widely. Configure Supabase rate limiting / abuse protection as appropriate.
