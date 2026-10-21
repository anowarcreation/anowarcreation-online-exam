# Fix for `Could not erase history: Admin permission required`

Your SQL screenshot confirms `admin_profiles.role = admin` for the configured owner UUID. The remaining error means the deployed Edge Function may be stale, deployed to another Supabase project, or checking a different signed-in user.

## Required deployment
1. In Supabase Dashboard, open the project `tlsrvyqyhonnrlcdmlzo`.
2. Open Edge Functions → `admin-erase-history` and deploy the code in `supabase/functions/admin-erase-history/index.ts` from this ZIP.
3. Ensure the function secrets are configured in that same project: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not put the service-role key in website files.
4. Sign out and sign back into the admin website, then test deleting one selected attempt first.

The function first checks `admin_profiles`. It also permits the exact configured owner UUID `d3334656-ab3b-4abd-b22e-d9e264888bda` as a fallback only after Supabase validates the signed-in JWT. It does not authorize other users.

If deletion then fails with a different error, inspect Edge Function logs. The role check is separate from table/foreign-key deletion errors.
