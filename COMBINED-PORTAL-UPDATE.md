# Combined Student + Admin update package

## Student Portal
- Main `/exam/` route opens the Student Portal dashboard.
- Five services: Enter Examination, Registration & Unique ID (Find Unique ID nested inside), Get Admit Card, Result & History, Certificate Validation.
- Exam entry form preserved at `exam/enter.html`, with Student ID label and existing exam flow.
- Registration, ID recovery, admit card and result lookup call the server-side `student-portal` Edge Function.

## Admin Panel
- Separate Admin Login remains at `/exam-admin/`.
- Dark theme is scoped to admin pages.
- Existing exam control, attempts/results view, CSV export, and certificate admin remain in place.
- Single existing Supabase admin profile flow is preserved.

## Important deployment requirements
- This is a deploy-ready code package, not a live deployment.
- Run `student-portal-migration.sql` once in Supabase before enabling registration/ID lookup. It adds `ac_student_registry` and does not delete existing exam records.
- Deploy `functions/student-portal/index.ts` using existing server-side secrets `SUPABASE_URL` and `EXAM_SUPABASE_KEY`.
- Test on a staging branch and test registration, ID recovery, admit card, exam start, result history, admin login, results export and certificate validation before production.
- Existing Admin functionality is retained; full question-bank CRUD/bulk import and full student management screens are not yet wired into this package and must not be considered live features.
- No question bank replacement SQL should be run automatically; existing question/answer history is preserved.

## Admin: erase test history (added)
- Admin dashboard now has checkboxes per attempt, `Erase selected`, and `Erase all test history` controls.
- Both actions require typing an explicit confirmation phrase and a second confirmation.
- The `admin-erase-history` Edge Function validates the caller's Supabase session and `admin_profiles.role` before deleting.
- It deletes associated `ac_exam_answers`, `ac_exam_certificates`, and `ac_exam_attempts` in that order. It does NOT delete student registrations, permanent Student IDs, exams, or questions.
- This is irreversible. If a certificate is deleted, its old verification record will no longer be available.
- No additional SQL migration is required for this feature; it uses existing `ac_exam_*` tables. Deploy the function before using the controls.

Deploy from the repository root using the Supabase CLI linked to the correct project:

```bash
supabase functions deploy admin-erase-history
```

Ensure `EXAM_SUPABASE_KEY` is configured as a server-side secret containing the privileged key. Never put it in browser files. Test deleting one practice attempt on a staging project first.
