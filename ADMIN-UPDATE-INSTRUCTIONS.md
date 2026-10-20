# Admin feature update

1. Back up the repository and database before updating.
2. In Supabase SQL Editor, run `admin-question-sets-edit-migration.sql` first. This adds `set_number` without deleting existing exams; old exams default to Set 1.
3. Deploy the Edge Function folder `supabase/functions/admin-erase-history` as `admin-erase-history`. Supabase Edge Functions must have the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets configured by the platform. Never expose the service-role key in browser code.
4. Verify RLS allows the authorized admin role to SELECT/INSERT/UPDATE/DELETE `ac_exams` and `ac_exam_questions`, and SELECT/UPDATE `ac_exam_attempts`; the Edge Function validates `admin_profiles` before deleting history.
5. Commit and publish the site files to GitHub Pages.

## Excel import headers
`Question`, `Option A`, `Option B`, `Option C`, `Option D`, `Correct Option`, `Chapter`, `Explanation`.

Question-set model: each exam/question set is a row in `ac_exams`; the subject plus `set_number` identifies a set. Example: Biology Set 1, Biology Set 2, ... Biology Set 7. Create a distinct exam code for each set if students will start them independently.

Editing exam name/subject/set and question content uses Supabase UPDATE policies. If the UI reports permission denied, apply/fix the admin RLS policies in Supabase; the browser cannot safely bypass them.
