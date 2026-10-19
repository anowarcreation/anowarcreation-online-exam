-- Admin-only policies for the Student Management screen. Public users still have no direct access.
GRANT SELECT, UPDATE ON TABLE public.ac_student_registry TO authenticated;
DROP POLICY IF EXISTS ac_student_registry_admin_select ON public.ac_student_registry;
CREATE POLICY ac_student_registry_admin_select ON public.ac_student_registry FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id=(SELECT auth.uid()) AND ap.role IN ('admin','exam_manager')));
DROP POLICY IF EXISTS ac_student_registry_admin_update ON public.ac_student_registry;
CREATE POLICY ac_student_registry_admin_update ON public.ac_student_registry FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id=(SELECT auth.uid()) AND ap.role IN ('admin','exam_manager'))) WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id=(SELECT auth.uid()) AND ap.role IN ('admin','exam_manager')));

GRANT SELECT, UPDATE ON TABLE public.ac_exam_attempts TO authenticated;
DROP POLICY IF EXISTS ac_exam_attempts_admin_update ON public.ac_exam_attempts;
CREATE POLICY ac_exam_attempts_admin_update ON public.ac_exam_attempts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id=(SELECT auth.uid()) AND ap.role IN ('admin','exam_manager'))) WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id=(SELECT auth.uid()) AND ap.role IN ('admin','exam_manager')));
