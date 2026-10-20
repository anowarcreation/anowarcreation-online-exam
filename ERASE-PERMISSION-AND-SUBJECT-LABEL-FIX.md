# Subject label and erase-history permission fix

## Exam subject label
`assets/exam/app.js` now sets the exam page's top pill and browser title from the selected exam's `subject` field (fallback: exam title). This prevents a Physics/PSC exam from displaying a hard-coded Biology label.

## Erase history permission
The Edge Function deliberately requires a signed-in user with `admin_profiles.role` set to `admin` or `exam_manager`. The SQL file `ADMIN-ERASE-PERMISSION-FIX.sql` adds/repairs the configured admin profile using the project admin UUID noted in the project context. Verify the UUID against Supabase Authentication > Users before running. If your current admin login has a different UUID, replace the UUID in the SQL with the actual admin user's UUID.

After running the SQL, redeploy `supabase/functions/admin-erase-history` if that function has not already been deployed. The function uses `SUPABASE_SERVICE_ROLE_KEY` server-side; never put this secret in frontend files.
