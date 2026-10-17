# Anowar Creation Online Exam — Final Requirements

## Page structure
- Student Portal: one landing page with five options: Enter Examination; Registration & Unique ID (Find Unique ID nested in the same card); Get Admit Card; Result & History; Certificate Validation.
- Admin Login: separate page; after sign-in, retain the existing admin dashboard and certificate management.

## Admin scope (all)
- Dashboard statistics and recent activity where data exists.
- Exam management: create/edit/publish exams, subject, exam code, instructions, duration, marks and attempt availability.
- Question bank: manual MCQ entry and safe bulk CSV/Excel import with preview/validation.
- Student management: permanent unique Student ID, registration details, lookup and status.
- Results/history: view and export only; no manual score-edit feature. Preserve server-calculated marks.
- Admit cards, certificate issuance/validation and download where supported by the backend.
- Settings, maintenance/access controls, and audit log for admin changes.

## Chosen settings
- Scope: all features.
- Question management: manual + bulk upload.
- Result control: view/export; no edit.
- Admin access: single existing admin account.
- Theme: dark professional dashboard.

## Student ID flow
- One permanent ID per student. Registration collects name, DOB and phone.
- Find Unique ID accepts registered phone + DOB and returns the existing ID only after a secure server-side match. Do not query student records directly from public client code.
- Admit card shows name, DOB, Student ID, subject, configured exam code and instructions.
- Result/history verifies the student before revealing records.

## Data safety / deployment notes
- Existing exam tables and attempt/result history must be preserved. Do not drop tables or delete question/answer rows to replace a question bank.
- Keep the existing Supabase schema unless a migration is demonstrably necessary; any migration must be additive and backward-compatible.
- The dark stylesheet is a presentation-only change. Student Portal and Supabase functions still require end-to-end testing in a staging branch before production deployment.
- Verify edge-function secrets and permissions in Supabase; never commit service-role keys to this repository.
