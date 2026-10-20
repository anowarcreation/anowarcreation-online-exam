-- Fixes "Could not erase history: Admin permission required" for the configured admin.
-- Run in Supabase SQL Editor while signed in to the intended project.
-- This UUID is the admin UUID used in this project's setup notes. Verify it matches
-- Authentication > Users before running. If it differs, replace it with the actual admin user's UUID.
insert into public.admin_profiles (user_id, role)
select id, 'admin'
from auth.users
where id = 'd3334656-ab3b-4abd-b22e-d9e264888bda'::uuid
on conflict (user_id) do update set role = 'admin';

-- Confirm the resulting authorized profile:
select p.user_id, p.role, u.email
from public.admin_profiles p
join auth.users u on u.id = p.user_id
where p.user_id = 'd3334656-ab3b-4abd-b22e-d9e264888bda'::uuid;
