-- Apply in Supabase SQL Editor before using numbered question sets and edit actions.
-- Existing exams are preserved; existing records become Set 1 within their subject.
ALTER TABLE public.ac_exams ADD COLUMN IF NOT EXISTS set_number integer NOT NULL DEFAULT 1;
UPDATE public.ac_exams SET set_number = 1 WHERE set_number IS NULL OR set_number < 1;
CREATE INDEX IF NOT EXISTS ac_exams_subject_set_idx ON public.ac_exams (lower(subject), set_number);

-- Admin access is expected to be controlled by admin_profiles and existing RLS policies.
-- Do not disable RLS globally. Ensure your authorized admin role has SELECT/INSERT/UPDATE/DELETE
-- policies for ac_exams and ac_exam_questions, and SELECT/UPDATE for ac_exam_attempts.
