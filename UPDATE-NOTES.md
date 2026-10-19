# Anowar Creation Online Exam — requested updates

## Included in this source update
- `functions/exam-start/index.ts`: server-side lookup of the permanent Student ID in `ac_student_registry`; registered name is used instead of trusting the browser-supplied name. Deploy this Edge Function to block arbitrary IDs.
- `functions/student-portal/index.ts`: separate `result` and `history` actions. A single result requires Student ID + exam code. History requires Student ID + registered phone + DOB. Both return stored question/answer review details.
- `exam/portal.html` and `assets/exam/student-portal.js`: split Result and Exam History into separate options; show summary/details and a per-exam Details button on history; stop cross-filling forms; replace Biology-only hero caption with ALL SUBJECTS.
- `assets/exam/style.css`: styling for the result/details view.
- `exam-admin/dashboard.html` and `assets/exam/admin-dashboard.js`: admin forms to create exams by subject (each exam is a separate question set) and add questions with four options, correct option, topic, and optional explanation. New exams are created closed by default.

## Deployment checklist
1. Back up the current GitHub repository before replacing files.
2. Deploy the updated `exam-start` and `student-portal` Supabase Edge Functions. Ensure `EXAM_SUPABASE_KEY` is set as a server-side secret.
3. Confirm tables `ac_student_registry`, `ac_exams`, `ac_exam_questions`, `ac_exam_attempts`, and `ac_exam_answers` match the existing application schema. This patch intentionally does not drop or recreate tables.
4. Test with a real registered Student ID and an invalid random ID. The random ID must be rejected even with a valid exam code.
5. Test Result with a correct and incorrect exam code; test History with correct and incorrect phone/DOB; verify saved question and answer data exists before expecting full review details.

## Admin subjects and question sets
The added interface supports creating exams/question sets and adding questions one at a time. Bulk question import, question edit/delete, and subject editing after creation are not included in this update. The live `ac_*` table columns and admin INSERT RLS policies must match the payloads; the UI will show a database/policy error if they do not. Existing exams and questions are preserved.


Student Portal card navigation correction (2026-10-20): dashboard now shows five navigation cards only; forms are moved to separate page URLs (registration.html, admit-card.html, result-history.html, certificate-portal.html). Existing form IDs and student-portal.js retained on each service page to preserve existing behavior. Home hero subtitle is now subject-neutral.
