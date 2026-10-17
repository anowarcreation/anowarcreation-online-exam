# Admin erase test history deployment

1. Back up the Supabase project before enabling permanent deletion.
2. From the repository root, deploy the new Edge Function:

   ```bash
   supabase functions deploy admin-erase-history
   ```

3. Confirm Supabase Function secrets include `SUPABASE_URL` and `EXAM_SUPABASE_KEY`. The latter must be the privileged server key, stored only as a server secret.
4. Publish the updated `exam-admin/dashboard.html`, `assets/exam/admin-dashboard.js`, and `assets/exam/admin-dark.css` to the same GitHub Pages branch as the existing site.
5. Sign in as the existing admin. Test `Erase selected` on a disposable practice attempt first.

## Exact behavior
- `Erase selected`: deletes the selected attempt rows and associated `ac_exam_answers` and `ac_exam_certificates` rows.
- `Erase all test history`: deletes all attempt rows and their associated answers/certificates, up to 9,999 attempts per operation. At 10,000 or more it refuses to run; use selected deletion in batches.
- Both require typing `ERASE SELECTED` or `ERASE ALL`, then a second confirmation.
- Student registrations/IDs, exams, and questions are preserved.
- Deleted certificate verification records are not retained. This is permanent and cannot be undone.
- No SQL migration is needed for this feature, assuming the listed `ac_exam_*` tables already exist as in this project.

The function checks the Supabase JWT and `admin_profiles.role` server-side. Do not replace it with direct browser-side deletes and do not expose `EXAM_SUPABASE_KEY` in HTML/JS.
