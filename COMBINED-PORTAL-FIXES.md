# Student Portal corrections (based on uploaded working project)

## Included
- Preserved existing portal logo, header, hero, metrics, Biology illustration and footer.
- Desktop portal cards display in a five-card row; forms are collapsed by default and open one at a time.
- Registration card is named “Registration & Student ID”; boxed “Find Student ID” opens a separate page.
- Removed auto-population of Student ID/DOB/phone between registration, find-ID, admit-card and result forms.
- Forms/results are cleared when leaving a card; reopening starts fresh.
- Certificate validation card links directly to the certificate number form.
- `exam-start` now checks the registered Student ID and requires the entered name to match before creating an attempt.

## Required deployment
1. Upload the changed static files to the existing GitHub Pages branch, preserving other files.
2. Deploy the changed `exam-start` Edge Function from the repository root with `supabase functions deploy exam-start`.
3. Ensure the existing `EXAM_SUPABASE_KEY` secret is set for `exam-start` and `student-portal`. Do not expose it in frontend files.
4. Certificate verification uses the existing `verify-certificate` function. If it is not currently deployed, deploy it with `supabase functions deploy verify-certificate`.
5. No new SQL is required by these UI and validation changes, provided `ac_student_registry` already exists and `student-portal` registration is working.

## Tests to run
- On portal load, all five cards are collapsed; no form is visible.
- Clicking Enter Examination goes directly to the entry form.
- Clicking Find Student ID opens its own page.
- Registration and Find ID do not populate other cards.
- A random/unregistered Student ID with a valid exam code is rejected by `exam-start`.
- A registered Student ID with the wrong name is rejected.
- Certificate number form opens directly; verify returns valid/invalid or an explicit service error.
- Print/save from admit card prints only the admit card.
