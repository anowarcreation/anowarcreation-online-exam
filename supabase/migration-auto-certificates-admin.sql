-- Anowar Creation Online Exam: migration for existing ac_* tables.
-- Review table/column names before running. Does not delete existing attempts or results.
create extension if not exists pgcrypto;

alter table public.ac_exams add column if not exists pass_percentage numeric not null default 40;
alter table public.ac_exams drop constraint if exists ac_exams_pass_percentage_check;
alter table public.ac_exams add constraint ac_exams_pass_percentage_check check (pass_percentage between 0 and 100);

create unique index if not exists ac_exam_certificates_attempt_id_uidx
  on public.ac_exam_certificates(attempt_id);
create unique index if not exists ac_exam_certificates_certificate_no_uidx
  on public.ac_exam_certificates(certificate_no);
create unique index if not exists ac_exam_attempts_certificate_no_uidx
  on public.ac_exam_attempts(certificate_no) where certificate_no is not null;

-- Service-role-only transactional finalizer. Locks attempt so repeat/concurrent submit cannot issue duplicate certificates.
create or replace function public.ac_finalize_exam_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_score numeric,
  p_correct_count integer,
  p_wrong_count integer,
  p_unanswered_count integer,
  p_pass_percentage numeric,
  p_candidate_certificate_no text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_attempt public.ac_exam_attempts%rowtype;
  v_exam public.ac_exams%rowtype;
  v_question_count integer;
  v_max_marks numeric;
  v_percentage numeric;
  v_pass boolean;
  v_cert_no text;
  v_item jsonb;
begin
  select * into v_attempt from public.ac_exam_attempts where id = p_attempt_id for update;
  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.status = 'submitted' or v_attempt.submitted_at is not null then
    select certificate_no into v_cert_no from public.ac_exam_certificates where attempt_id = p_attempt_id and revoked_at is null;
    return jsonb_build_object('already_submitted', true, 'certificate_no', v_cert_no, 'status', v_attempt.status);
  end if;
  select * into v_exam from public.ac_exams where id = v_attempt.exam_id;
  if not found then raise exception 'Exam not found'; end if;
  select count(*) into v_question_count from public.ac_exam_questions where exam_id = v_exam.id;
  v_max_marks := v_question_count * coalesce(v_exam.positive_marks, 4);
  v_percentage := case when v_max_marks > 0 then greatest(0, p_score) / v_max_marks * 100 else 0 end;
  v_pass := v_percentage >= coalesce(p_pass_percentage, v_exam.pass_percentage, 40);

  if jsonb_typeof(coalesce(p_answers, '[]'::jsonb)) <> 'array' then raise exception 'Answers must be an array'; end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    insert into public.ac_exam_answers(attempt_id, question_id, selected_option)
    values (p_attempt_id, (v_item->>'question_id')::uuid, (v_item->>'selected_option')::smallint)
    on conflict do nothing;
  end loop;

  update public.ac_exam_attempts set
    submitted_at = now(), status = 'submitted', score = p_score,
    correct_count = p_correct_count, wrong_count = p_wrong_count,
    unanswered_count = p_unanswered_count
  where id = p_attempt_id;

  if v_pass then
    v_cert_no := coalesce(nullif(v_attempt.certificate_no, ''), p_candidate_certificate_no);
    insert into public.ac_exam_certificates(certificate_no, attempt_id, issued_at, revoked_at)
    values (v_cert_no, p_attempt_id, now(), null)
    on conflict (attempt_id) do update set certificate_no = public.ac_exam_certificates.certificate_no
    returning certificate_no into v_cert_no;
    update public.ac_exam_attempts set certificate_no = v_cert_no where id = p_attempt_id;
  end if;
  return jsonb_build_object('already_submitted', false, 'passed', v_pass, 'percentage', v_percentage, 'certificate_no', v_cert_no, 'status', 'submitted');
end;
$$;
revoke all on function public.ac_finalize_exam_attempt(uuid,jsonb,numeric,integer,integer,integer,numeric,text) from public, anon, authenticated;
grant execute on function public.ac_finalize_exam_attempt(uuid,jsonb,numeric,integer,integer,integer,numeric,text) to service_role;

-- Admin read policies for existing ac_* tables. Admin identity is checked via admin_profiles.
do $$ declare t text; begin
  foreach t in array array['ac_exams','ac_exam_questions','ac_exam_attempts','ac_exam_answers','ac_exam_certificates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.role in (''admin'',''exam_manager'')))', t || '_admin_read', t);
  end loop;
end $$;
