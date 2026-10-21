ANOWAR CREATION — SPECIAL EXAM PLACEMENT UPDATE

Changes
- Removed the Special Prize Exam promotional card from exam/enter.html.
- Added a Special Exam placement area beside “Choose an option to continue” on exam/portal.html.
- Added Admin controls on exam-admin/special-exam.html: ON shows “Enter Special Exam”; OFF shows the admin-written custom message (default: Coming Soon).
- Added RLS-protected settings table migration: special-exam-placement-migration.sql (also copied to supabase/).
- Regular exam entry remains in place.

DEPLOY STEPS
1. Back up the current repository before replacing files.
2. Apply special-exam-placement-migration.sql in the Supabase SQL Editor.
3. Upload/commit the changed files from this ZIP to the existing repository, preserving their folder paths.
4. Open Admin > Special Prize Exam and configure Student Portal Placement.
5. Test with the toggle OFF (custom message appears) and ON (button appears), and confirm exam/enter.html no longer contains the Special Prize Exam card.

This package is not deployed to the live website automatically.
