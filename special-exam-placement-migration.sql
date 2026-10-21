-- Anowar Creation Special Exam placement on Student Portal
-- Safe additive migration. Does not modify regular exams or existing notice-board records.
create table if not exists public.ac_special_exam_placement (
  id integer primary key check (id = 1),
  enabled boolean not null default false,
  disabled_message text not null default 'Coming Soon' check (char_length(disabled_message) <= 120),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.ac_special_exam_placement enable row level security;
drop policy if exists "Public can view Special Exam placement" on public.ac_special_exam_placement;
create policy "Public can view Special Exam placement" on public.ac_special_exam_placement for select to anon, authenticated using (true);
drop policy if exists "Exam admins manage Special Exam placement" on public.ac_special_exam_placement;
create policy "Exam admins manage Special Exam placement" on public.ac_special_exam_placement for all to authenticated using (exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager'))) with check (exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager')));
grant select on public.ac_special_exam_placement to anon, authenticated;
grant insert, update, delete on public.ac_special_exam_placement to authenticated;
insert into public.ac_special_exam_placement (id, enabled, disabled_message) values (1, false, 'Coming Soon') on conflict (id) do nothing;
