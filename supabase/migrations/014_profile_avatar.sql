-- Add a nullable avatar_url to profiles. Stored as the full public URL
-- returned by Supabase Storage so the account menu and account header
-- can render the avatar directly via <img src=...>.
--
-- The image itself lives in the existing product-media bucket under
-- users/{user_id}/avatar-{timestamp}.{ext}. Uploads go through the
-- /api/account/avatar route using the service-role admin client, so no
-- new RLS policies are needed — the API enforces ownership of the path
-- before writing.
--
-- Re-runnable via `add column if not exists`.

alter table public.profiles
  add column if not exists avatar_url text;
