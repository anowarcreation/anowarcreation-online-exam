# Result / History and student detail update

## Changes
- Student Result action now matches the `result` action and validates Student ID + Exam Code.
- Student Exam History action now matches `history` and validates Student ID + registered phone + DOB.
- Both responses include question-by-question answers, correct answers, status, marks, explanation, exam code and set number for the existing student portal display.
- Admin All Students history now displays Set number and Exam Code and provides a per-attempt Details toggle with each question, four options, selected answer, correct answer, status and marks.
- Existing student portal cards and overall page structure have not been intentionally changed.

## Deployment note
Deploy the updated `supabase/functions/student-portal` Edge Function. Ensure the deployed function uses the existing `EXAM_SUPABASE_KEY` secret. The live backend cannot be tested from this source bundle; if the database schema does not have `ac_exams.set_number`, apply the set-number migration included with the project before deploying.
