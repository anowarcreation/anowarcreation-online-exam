-- Anowar Creation Exam Notice Board (safe upgrade for existing installations)
-- Run in Supabase SQL Editor. This migration preserves existing notice rows.
create table if not exists public.ac_exam_notice_board (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  click_url text,
  button_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Upgrade a table created by the previous Notice Board migration.
alter table public.ac_exam_notice_board add column if not exists button_enabled boolean not null default false;
alter table public.ac_exam_notice_board alter column click_url drop not null;

alter table public.ac_exam_notice_board enable row level security;
drop policy if exists "Public can view exam notice" on public.ac_exam_notice_board;
create policy "Public can view exam notice" on public.ac_exam_notice_board for select to anon, authenticated using (true);
drop policy if exists "Exam admins manage exam notice" on public.ac_exam_notice_board;
create policy "Exam admins manage exam notice" on public.ac_exam_notice_board for all to authenticated using (exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager'))) with check (exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager')));
grant select on public.ac_exam_notice_board to anon, authenticated;
grant insert, update, delete on public.ac_exam_notice_board to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ac-exam-notice-images','ac-exam-notice-images',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/png','image/jpeg','image/webp'];
drop policy if exists "Public can view exam notice images" on storage.objects;
create policy "Public can view exam notice images" on storage.objects for select to anon, authenticated using (bucket_id = 'ac-exam-notice-images');
drop policy if exists "Exam admins upload notice images" on storage.objects;
create policy "Exam admins upload notice images" on storage.objects for insert to authenticated with check (bucket_id = 'ac-exam-notice-images' and exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager')));
drop policy if exists "Exam admins update notice images" on storage.objects;
create policy "Exam admins update notice images" on storage.objects for update to authenticated using (bucket_id = 'ac-exam-notice-images' and exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager'))) with check (bucket_id = 'ac-exam-notice-images' and exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager')));
drop policy if exists "Exam admins delete notice images" on storage.objects;
create policy "Exam admins delete notice images" on storage.objects for delete to authenticated using (bucket_id = 'ac-exam-notice-images' and exists (select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.role in ('admin','exam_manager')));
