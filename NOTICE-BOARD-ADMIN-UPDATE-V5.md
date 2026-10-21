# Anowar Creation Notice Board/Admin Update v5

## Changes
- Notice image has its own `Publish Notice Image` button.
- Scrolling announcement text and colour have a separate `Publish Announcement` button.
- Fixed missing `ticker_color` / PostgREST schema-cache issue with an idempotent SQL migration and schema reload notification.
- Notice image column can be null so announcement-only publishing is supported.
- Added a Light/Dark theme toggle to all pages in `exam-admin`; choice is saved in that browser and reused across admin pages.
- Improved contrast/readability on the Notice Board page.

## Deployment
1. Back up current repository and Supabase schema.
2. Upload the contents preserving folder paths.
3. Run `notice-board-migration-v5.sql` in Supabase SQL Editor.
4. Hard-refresh admin pages (Ctrl+F5).
5. Test image publishing and announcement publishing separately, then test both Light and Dark themes.
