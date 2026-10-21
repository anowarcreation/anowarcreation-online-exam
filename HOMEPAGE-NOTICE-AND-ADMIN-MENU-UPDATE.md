# Anowar Creation homepage / Notice Board update

## Changes
- Special Prize Exam placement is shown only in the homepage chooser area. The Enter Examination page has no Special Exam card.
- Homepage logo is smaller and paired with a clear Anowar Creation / Online Examination Portal heading.
- Notice Board admin can publish a single-line scrolling announcement and choose its text colour.
- The Notice Board image can be retained while changing announcement text, colour, or button settings.
- The student-facing `Click here` button is hidden unless `button_enabled = true` and a valid HTTP(S) destination URL is saved. The hidden state is also enforced in CSS so the button cannot appear because of a display rule.
- Admin dashboard navigation items use consistent icon and label alignment, padding, and row heights.

## Deploy
1. Back up the current repository and keep a copy of the previous deploy.
2. Run `home-announcement-ticker-migration.sql` in Supabase SQL Editor.
3. Upload the updated repository files while preserving the existing folder structure.
4. Test the Notice Board with the button toggle OFF, then ON with a valid link.
5. Test announcement text and colour changes without uploading a new image.
6. Confirm Special Prize Exam appears only in the homepage chooser area when enabled, and is absent from `exam/enter.html`.
7. Check admin menu alignment on desktop and mobile.

The code package does not deploy itself. Changes become live only after the migration and repository deploy are completed.
