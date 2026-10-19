# Anowar Creation Online Exam — source update

## Included in this update
- Student homepage uses five dedicated service cards. Registration, admit card, result/history, and certificate validation are opened as separate pages.
- Homepage hero and stats are subject-neutral; exams remain driven by published Supabase exams.
- Added dedicated `exam/registration.html`, `exam/admit-card.html`, and `exam/result-history.html` pages.
- Admin dashboard has reference-inspired dark sidebar navigation, quick action cards, summary cards, and existing exam/question controls remain in place.
- Added an admin Student Registry table with search/edit for registered student records.
- `exam-start` now validates the Student ID against `ac_student_registry` before creating an attempt and takes the registered student's name as canonical.

## Required deployment steps
1. Back up the currently deployed GitHub repository and Supabase database.
2. Deploy the frontend files to GitHub Pages.
3. Apply `student-portal-migration.sql` if `ac_student_registry` does not already exist.
4. Deploy the updated `exam-start` and `student-portal` Supabase Edge Functions.
5. Verify admin RLS policies permit the authenticated admin role to select/update `ac_student_registry`; the migration intentionally grants service-role access only, so admin UI direct edits require an admin RLS policy before they can save. Do not enable public write access.
6. Test with one registered student and one deliberately invalid Student ID before opening exams.

## Not claimed as live-tested
This archive was source-edited and structurally checked locally. It has not been deployed to GitHub/Supabase, and no live end-to-end browser/database test was performed in this environment. Existing records were not deleted.
