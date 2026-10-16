# Anowar Creation — Online Examination System

A multi-page online examination project for WBCHSE Class 11 Biology, with a student entry flow, timed MCQ interface, result page, certificate view and Supabase-authenticated administration pages.

## Pages
- `exam/index.html` — student entry (name, roll and exam code; no student account required)
- `exam/instructions.html` — examination rules
- `exam/test.html` — timed MCQ interface
- `exam/result.html` — score and answer-review area
- `exam/certificate.html` — certificate view (requires a server-issued certificate number)
- `exam-admin/index.html` — administrator sign-in
- `exam-admin/dashboard.html` — database-backed exam and result listing
- `assets/exam/` — styles, scripts and the supplied Anowar Creation logo
- `supabase/schema.sql` — starter database schema

## Important deployment requirements
This repository contains the browser frontend and a database schema, but the secure Edge Function implementations for `exam-start` and `exam-submit` are not included yet. Student exam start/submission will not work as a live service until those functions are implemented and deployed. The admin dashboard requires the `admin_profiles`, `exams`, and `attempts` tables plus correct Row Level Security policies for authorized admins.

Do not treat a removed warning or a polished UI as proof that backend validation exists. Do not publish a Supabase `service_role` key in browser code. The publishable key may be used in the browser only with restrictive RLS and server-side validation. Never expose answer keys to students before submission.

## Question bank
`assets/exam/questions.js` contains 30 Biology MCQs aligned to the listed Class 11 topics. For a secure live exam, move question delivery and answer-key access to the server; do not rely on a client-side answer key for official scoring. Review all questions against the current WBCHSE syllabus before formal use.

## Exam rules currently shown
- 30 questions, 30 minutes
- Correct: +4; incorrect: −1; unanswered: 0
- Maximum score: 120
- Displayed pass threshold: 40%

## Deploy
Upload the repository contents to the GitHub repository/branch used by GitHub Pages. Deploy the Supabase schema and Edge Functions separately. Verify admin RLS, exam code validation, scoring, result storage and certificate verification before using this for an official examination.


## Consolidated certificate / answer-review update
See `supabase/AUTO-CERTIFICATE-SETUP.md` for the exact deployment order. GitHub Pages deployment does not deploy Supabase Edge Functions; deploy `exam-submit` and `verify-certificate` separately after the SQL migration. The Biology question-bank SQL preserves the previous exam/questions/answers by archiving the old published exam and creating a fresh published exam with the same exam-code hash. Back up first.
