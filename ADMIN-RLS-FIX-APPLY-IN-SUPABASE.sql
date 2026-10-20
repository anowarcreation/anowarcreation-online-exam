-- Run in Supabase SQL Editor after checking your existing policies.
-- Non-destructive to records: this changes access policies only.
-- The admin UI checks admin_profiles.role = admin or exam_manager.

DO $$ BEGIN
  IF to_regclass('public.admin_profiles') IS NULL THEN RAISE EXCEPTION 'Missing public.admin_profiles'; END IF;
  IF to_regclass('public.ac_exams') IS NULL THEN RAISE EXCEPTION 'Missing public.ac_exams'; END IF;
  IF to_regclass('public.ac_exam_questions') IS NULL THEN RAISE EXCEPTION 'Missing public.ac_exam_questions'; END IF;
  IF to_regclass('public.ac_exam_attempts') IS NULL THEN RAISE EXCEPTION 'Missing public.ac_exam_attempts'; END IF;
  IF to_regclass('public.ac_exam_answers') IS NULL THEN RAISE EXCEPTION 'Missing public.ac_exam_answers'; END IF;
END $$;

-- Shared admin-role predicate is repeated in policies to avoid requiring a custom SQL function.
ALTER TABLE public.ac_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ac_admin_manage_exams ON public.ac_exams;
CREATE POLICY ac_admin_manage_exams ON public.ac_exams FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ac_exams TO authenticated;

ALTER TABLE public.ac_exam_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ac_admin_manage_questions ON public.ac_exam_questions;
CREATE POLICY ac_admin_manage_questions ON public.ac_exam_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ac_exam_questions TO authenticated;

ALTER TABLE public.ac_exam_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ac_admin_manage_attempts ON public.ac_exam_attempts;
CREATE POLICY ac_admin_manage_attempts ON public.ac_exam_attempts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')));
GRANT SELECT, UPDATE, DELETE ON public.ac_exam_attempts TO authenticated;

ALTER TABLE public.ac_exam_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ac_admin_manage_answers ON public.ac_exam_answers;
CREATE POLICY ac_admin_manage_answers ON public.ac_exam_answers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')));
GRANT SELECT, DELETE ON public.ac_exam_answers TO authenticated;

-- Certificate table is optional in some deployments. Apply only if present.
DO $$ BEGIN
 IF to_regclass('public.ac_exam_certificates') IS NOT NULL THEN
  EXECUTE 'ALTER TABLE public.ac_exam_certificates ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS ac_admin_manage_certificates ON public.ac_exam_certificates';
  EXECUTE $p$CREATE POLICY ac_admin_manage_certificates ON public.ac_exam_certificates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager'))) WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.role IN ('admin','exam_manager')))$p$;
  EXECUTE 'GRANT SELECT, DELETE ON public.ac_exam_certificates TO authenticated';
 END IF;
END $$;
