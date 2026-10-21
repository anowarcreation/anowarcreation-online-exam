# Erase History permission fix

1. Deploy `supabase/functions/admin-erase-history/index.ts` as the `admin-erase-history` Edge Function.
2. In Supabase Edge Function Secrets, set `SUPABASE_SERVICE_ROLE_KEY` to the project's **service_role secret key**. If you use the existing `EXAM_SUPABASE_KEY` instead, it must also be the service_role key, not the publishable/anon key. Never put this secret in frontend code or commit it to GitHub.
3. Run `ADMIN-ERASE-HISTORY-SERVICE-ROLE-GRANTS.sql` in Supabase SQL Editor as project owner.
4. Sign out and back into the admin panel, then test with one selected attempt first.

The function validates the caller's Supabase session and admin profile/owner UUID before using the server-side key. The service key is only used inside the Edge Function. This has not been tested against the live project database.
