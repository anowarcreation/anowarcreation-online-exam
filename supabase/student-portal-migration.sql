-- Student registration and permanent Student ID portal migration
-- Existing attempts and exam data are not deleted or modified.
create table if not exists public.ac_student_registry (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  full_name text not null,
  dob date not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists ac_student_registry_lookup_idx on public.ac_student_registry (phone, dob);
alter table public.ac_student_registry enable row level security;
-- No public policies: all operations go through the student-portal Edge Function using server-side EXAM_SUPABASE_KEY.
grant select, insert, update on public.ac_student_registry to service_role;
