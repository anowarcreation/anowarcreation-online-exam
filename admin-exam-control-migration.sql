-- Anowar Creation: exam control fields and admin update access.
-- Run once in Supabase SQL Editor. Does not delete attempts, answers, questions, or certificates.
ALTER TABLE public.ac_exams ADD COLUMN IF NOT EXISTS exam_code text;
ALTER TABLE public.ac_exams ADD COLUMN IF NOT EXISTS instructions text NOT NULL DEFAULT '';

-- Fill the visible exam code manually in Admin Portal after this migration.
-- Existing exam_code_hash values remain unchanged until the admin saves a new code.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.ac_exams TO authenticated;

DROP POLICY IF EXISTS ac_exams_admin_update ON public.ac_exams;
CREATE POLICY ac_exams_admin_update ON public.ac_exams
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.admin_profiles ap
  WHERE ap.user_id = (SELECT auth.uid()) AND ap.role IN ('admin','exam_manager')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_profiles ap
  WHERE ap.user_id = (SELECT auth.uid()) AND ap.role IN ('admin','exam_manager')
));
