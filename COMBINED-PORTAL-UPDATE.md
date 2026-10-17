# Combined Student + Admin portal update

## Student portal UI
- Original Anowar Creation logo, hero headline, metrics (Questions, Duration, Max marks, Exam mode), and Biology illustration retained.
- Five clickable cards; no service form is open initially. Clicking one opens only that section; Back returns to cards.
- Registration includes Find Unique ID inside the same section.
- Student ID field is used by the exam entry page.

## Admin
- Separate Admin Login remains at `exam-admin/index.html`.
- Dark dashboard stylesheet, existing exam control/results/export, and test-history erase UI are included.
- Erase requires deploying `admin-erase-history` and is destructive. Test on a non-production attempt first.
- Question bank bulk import/CRUD still requires table-specific wiring and should not be assumed live from this UI package.

## Supabase
- Student portal uses `functions/student-portal/index.ts`; deploy with `supabase functions deploy student-portal`.
- Test-history erase uses `functions/admin-erase-history/index.ts`; deploy with `supabase functions deploy admin-erase-history`.
- Existing `exam-start`, `exam-submit`, and `verify-certificate` functions are included; deploy only if their source changed relative to the deployed version.
- Review `student-portal-migration.sql` against your current schema and take a backup before applying. Do not run `schema.sql` or `replace-biology-question-bank.sql` on the live database as a blanket update.

## Publish
1. Backup Supabase and branch.
2. Apply only required additive migration(s).
3. Deploy the two functions above.
4. Publish this folder to `online-exam-system` branch.
5. Test registration, find ID, admit card, exam start/submit, result history, certificate validation, admin login and erase on a test attempt.
