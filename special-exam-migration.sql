-- Anowar Creation Special Prize Exam (additive migration)
-- This creates separate tables; it does not alter or delete regular exam attempts.
create table if not exists public.ac_special_exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  exam_id uuid not null references public.ac_exams(id) on delete restrict,
  prize_amount numeric(10,2) not null default 500 check (prize_amount >= 0 and prize_amount <= 500),
  room_name text not null unique,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  actual_started_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  winner_attempt_id uuid,
  winner_note text not null default '',
  winner_announced_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ac_special_exam_time_order check (scheduled_end_at > scheduled_start_at)
);

create table if not exists public.ac_special_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  special_exam_id uuid not null references public.ac_special_exams(id) on delete cascade,
  exam_id uuid not null references public.ac_exams(id) on delete restrict,
  student_id text not null,
  student_name text not null,
  phone text,
  room_identity text not null unique,
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  certificate_no text unique,
  correct_count integer,
  wrong_count integer,
  unanswered_count integer,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','removed','expired')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  removal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (special_exam_id, student_id)
);

create table if not exists public.ac_special_exam_events (
  id bigint generated always as identity primary key,
  special_exam_id uuid not null references public.ac_special_exams(id) on delete cascade,
  attempt_id uuid not null references public.ac_special_exam_attempts(id) on delete cascade,
  event_type text not null check (event_type in ('warning','removed','camera_off','camera_on','tab_switch','fullscreen_exit','connection_lost','connection_restored','submitted')),
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ac_special_exams_status_idx on public.ac_special_exams(status, scheduled_end_at);
create index if not exists ac_special_attempts_exam_idx on public.ac_special_exam_attempts(special_exam_id, status, created_at);
create index if not exists ac_special_events_attempt_idx on public.ac_special_exam_events(attempt_id, created_at);

alter table public.ac_special_exams enable row level security;
alter table public.ac_special_exam_attempts enable row level security;
alter table public.ac_special_exam_events enable row level security;

-- No direct public access. The special-exam-api Edge Function uses server-side
-- credentials and explicitly validates admin role / student identity per action.
revoke all on public.ac_special_exams from anon, authenticated;
revoke all on public.ac_special_exam_attempts from anon, authenticated;
revoke all on public.ac_special_exam_events from anon, authenticated;

comment on table public.ac_special_exams is 'Special prize exams, separate from regular exam scheduling.';
comment on table public.ac_special_exam_attempts is 'Isolated attempts for proctored special exams.';
comment on table public.ac_special_exam_events is 'Proctoring incidents and admin warning/removal audit log.';


-- Anowar Creation Exam Notice Board
-- Run once in Supabase SQL Editor. This is separate from regular exam records.
create table if not exists public.ac_exam_notice_board (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  click_url text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
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
