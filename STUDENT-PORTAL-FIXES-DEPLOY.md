# Student Portal fixes and deployment

This update preserves the existing logo/branding and hero statistics (30 Questions, 30 min, 120 Max marks, CBT Exam mode) and biology illustration. The five student-service cards start collapsed; clicking a card opens only that service. Registration is labelled “Registration & Student ID”, with a small blue boxed “Find Student ID” control in the card's top corner. Enter Examination goes directly to the page containing Name, Student ID and Exam Code. Admit-card/registration print styling is intended to print only the generated document.

## Deploy frontend
1. Merge/copy the files from this package into the same paths in your `online-exam-system` branch; do not replace unrelated project files.
2. Commit and push, then hard refresh the GitHub Pages site (`Ctrl+Shift+R`).

## Certificate validation backend
The frontend calls the existing `verify-certificate` Edge Function. If that function is not deployed yet, deploy it from the project root:

```bash
supabase functions deploy verify-certificate --no-verify-jwt
```

Only use `--no-verify-jwt` if the function is intended to be publicly callable. The included function performs a read-only lookup of certificate number and validates certificate/attempt status using the server-side `EXAM_SUPABASE_KEY` secret. Confirm that secret is configured in Supabase Function secrets; never put it in browser code. Review rate limiting/abuse protection before public production use.

If the function already exists and JWT verification is enabled, the browser request using a publishable key will not satisfy user-JWT verification; either configure a safe public verification endpoint or implement authenticated access before deploying. Do not disable verification for privileged admin functions.

## Data safety
No SQL migration is needed for these front-end/navigation fixes. This package does not erase registrations, questions, attempts, or certificates. Test the portal and certificate lookup on the staging branch before promoting to production.
