-- Anowar Creation: Notice Board independent publish buttons + announcement colour fix
-- Safe/idempotent. Run once in Supabase SQL Editor.
alter table public.ac_exam_notice_board
  add column if not exists ticker_text text not null default '',
  add column if not exists ticker_color text not null default '#1267d8',
  add column if not exists button_enabled boolean not null default false;

-- Allow publishing a scrolling announcement before/without a notice image.
alter table public.ac_exam_notice_board alter column image_url drop not null;
alter table public.ac_exam_notice_board alter column click_url drop not null;

alter table public.ac_exam_notice_board drop constraint if exists ac_exam_notice_board_ticker_color_check;
alter table public.ac_exam_notice_board add constraint ac_exam_notice_board_ticker_color_check
  check (ticker_color ~ '^#[0-9A-Fa-f]{6}$');

grant select on public.ac_exam_notice_board to anon, authenticated;
grant insert, update, delete on public.ac_exam_notice_board to authenticated;
notify pgrst, 'reload schema';
