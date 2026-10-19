-- Admin-only access for the student registry. Does not delete or modify existing records.
alter table public.ac_student_registry enable row level security;
drop policy if exists "admin_read_student_registry" on public.ac_student_registry;
drop policy if exists "admin_update_student_registry" on public.ac_student_registry;
create policy "admin_read_student_registry" on public.ac_student_registry
for select to authenticated using (exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager')));
create policy "admin_update_student_registry" on public.ac_student_registry
for update to authenticated using (exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager')))
with check (exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager')));
grant select, update on public.ac_student_registry to authenticated;
