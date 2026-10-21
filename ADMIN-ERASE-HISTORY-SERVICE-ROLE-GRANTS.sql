-- Run in Supabase SQL Editor as project owner.
-- Grants only server-side service_role permissions needed by admin-erase-history.
-- Do NOT grant these privileges to anon or authenticated users.
GRANT SELECT, DELETE ON TABLE public.ac_exam_answers TO service_role;
GRANT SELECT, DELETE ON TABLE public.ac_exam_attempts TO service_role;
GRANT SELECT, DELETE ON TABLE public.ac_exam_certificates TO service_role;
