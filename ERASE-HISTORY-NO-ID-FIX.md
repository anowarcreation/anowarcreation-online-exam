# Erase History fix: ac_exam_answers has no `id` column

The admin-erase-history Edge Function was calling `.select("id")` after deleting from `ac_exam_answers`, but that table's schema does not contain an `id` column. The function now counts matching rows using `attempt_id`, deletes dependent answer/certificate rows without selecting a nonexistent `id`, then deletes attempts. Both `supabase/functions/admin-erase-history/index.ts` and `functions/admin-erase-history/index.ts` are synchronized.

## Deploy
1. Supabase Dashboard → Edge Functions → `admin-erase-history`.
2. Replace the function source with `supabase/functions/admin-erase-history/index.ts` from this ZIP and deploy.
3. Test Erase Selected with one disposable/in-progress test attempt first. Erasing history is irreversible.

No database migration is required for this specific `id`-column error. This package does not change the student registrations, exams, or question bank schema.
