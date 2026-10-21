-- Anowar Creation: homepage scrolling announcement and configurable notice button
-- Safe additive migration. Preserves existing notice images, URLs and settings.

alter table public.ac_exam_notice_board
  add column if not exists ticker_text text not null default '',
  add column if not exists ticker_color text not null default '#1267d8';

-- Keep the admin-selected text colour in a safe #RRGGBB format.
alter table public.ac_exam_notice_board
  drop constraint if exists ac_exam_notice_board_ticker_color_check;
alter table public.ac_exam_notice_board
  add constraint ac_exam_notice_board_ticker_color_check
  check (ticker_color ~ '^#[0-9A-Fa-f]{6}$');

-- Public visitors can read the current notice, while existing admin-only write policies remain unchanged.
grant select on public.ac_exam_notice_board to anon, authenticated;
grant insert, update, delete on public.ac_exam_notice_board to authenticated;
