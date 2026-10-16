# Required secure Edge Functions (not deployed by this ZIP)

Implement and deploy these Supabase Edge Functions before using this as a live exam:

1. `start-exam`
   - Accepts student name, roll number and exam code.
   - Hash/verify exam code server-side; check publication and schedule.
   - Creates attempt with server timestamp.
   - Returns only question IDs, text and options. Never return `correct_option` or explanation.

2. `submit-exam`
   - Accepts attempt ID and selected options.
   - Verify attempt exists, is still active, and server time is within duration.
   - Fetch answer keys on server, calculate +4 / -1 / 0 and chapter-wise scores.
   - Store result and certificate number atomically; reject duplicate/late submissions.

3. `admin-exams` / `admin-analytics`
   - Verify Supabase JWT and admin role on every request.
   - Create/edit exams, set pass percentage, manage questions and query analytics.
   - Never trust a role supplied in the request body.

4. `verify-certificate`
   - Return limited public validity fields for a certificate number.
   - Do not expose student data beyond what is required to verify authenticity.

5. `issue-certificate`
   - Only issue if the server-calculated result meets the current pass threshold.

Use environment secrets for privileged keys. Never embed `service_role` in client-side JavaScript. Keep RLS enabled and test policies with a non-admin user.

## Admin result and certificate behavior in this update

- The Admin Dashboard now displays PASS/FAIL from the attempt score, exam maximum marks, and `pass_percentage` where those fields are available. The current UI assumes 30 questions when the database does not expose a question count; align this with the deployed exam configuration before production use.
- A certificate preview link appears only for a submitted passing attempt with a server-issued `certificate_no`.
- `exam-admin/certificate-admin.html` uses the original uploaded logo and creates a QR code pointing to `exam/verify-certificate.html`.
- `exam/verify-certificate.html` calls the `verify-certificate` Edge Function. That function must be implemented and deployed before QR verification can be considered live. Until then the page explicitly says verification is unavailable.
- The deployed submit function must issue `certificate_no` only after server-side grading and passing eligibility checks. Do not create certificate numbers in the browser.


## Deploy updated functions
From a terminal with Supabase CLI linked to the correct project:

```bash
supabase functions deploy exam-submit
supabase functions deploy verify-certificate
```

Before deploying, ensure the project secret `EXAM_SUPABASE_KEY` is set to the privileged server key. Never put it in client-side files. Also run `supabase/migration-auto-certificates-admin.sql` in SQL Editor before deploying.
