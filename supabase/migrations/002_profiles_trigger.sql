-- Standard v21 / Batch 3
-- Auto-create a public.profiles row whenever a new auth.users row is inserted.
--
-- Notes:
--   - SECURITY DEFINER lets this function insert into public.profiles even when
--     the calling context is the auth schema. We pin search_path to public so
--     the function can't be hijacked by a malicious schema on the search_path.
--   - We resolve display_name from raw_user_meta_data ('display_name' or
--     'name'), falling back to the local-part of the email, then to 'New user'.
--   - The role defaults to 'user' (public.user_role enum from migration 001).
--   - On conflict (id) we DO NOTHING so re-running the migration or any race
--     condition is safe.
--   - We drop the trigger first to make this migration re-runnable.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_display_name text;
  email_local_part text;
  resolved_display_name text;
begin
  meta_display_name := nullif(
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name'
    ),
    ''
  );

  email_local_part := nullif(split_part(coalesce(new.email, ''), '@', 1), '');

  resolved_display_name := coalesce(
    meta_display_name,
    email_local_part,
    'New user'
  );

  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, resolved_display_name, 'user')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
