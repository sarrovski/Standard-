-- Security hardening pass driven by the Supabase advisor warnings.
--
-- Each section below documents WHY it's safe and what the trade-off is.
-- Re-runnable: every alteration is idempotent (drop+recreate / revoke).
--
-- =========================================================================
-- 1. public.set_updated_at(): pin search_path
-- =========================================================================
--
-- The function only reads / writes NEW.updated_at and calls now() (which
-- lives in pg_catalog and is implicitly available). It does not reference
-- any schema-qualified objects, so an empty search_path is the strictest
-- safe setting. This closes the "mutable search_path" advisor warning
-- without changing behavior.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- 2. public.handle_new_user(): revoke EXECUTE from anon / authenticated
-- =========================================================================
--
-- handle_new_user is invoked exclusively by the on_auth_user_created trigger
-- defined in 002_profiles_trigger.sql ("after insert on auth.users for each
-- row execute function public.handle_new_user()"). Triggers fire regardless
-- of the calling role's EXECUTE permission — the function attribute is
-- ignored at trigger dispatch — so revoking EXECUTE from public/anon/
-- authenticated does NOT break the signup flow.
--
-- Why we do NOT revoke from is_admin() / is_seller_owner(): both are called
-- from many RLS policies (e.g. `using (public.is_admin())`). Those calls
-- run as the session's role, so revoking EXECUTE would break every RLS
-- evaluation that references them. The functions are SECURITY DEFINER and
-- already pin search_path = public, so the remaining warning is acceptable.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- =========================================================================
-- 3. public.product_media policies: add explicit `to authenticated`
-- =========================================================================
--
-- 005_fix_product_media_rls.sql installed per-operation policies that gate
-- INSERT/UPDATE/DELETE on `is_seller_owner(p.seller_id) or is_admin()`.
-- Functionally that already prevents anon writes (auth.uid() is null →
-- is_seller_owner returns false → exists() returns false). The Supabase
-- advisor still flags policies without an explicit role filter as broadly
-- applicable, so we restate the same policies with `to authenticated` to
-- make the role boundary visible at the catalog level.
--
-- Behavior is unchanged for sellers and admins. Anonymous writes were
-- already blocked by the ownership check and remain blocked here.

drop policy if exists "product_media insert" on public.product_media;
create policy "product_media insert"
  on public.product_media
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_media.product_id
        and (
          public.is_seller_owner(p.seller_id)
          or public.is_admin()
        )
    )
  );

drop policy if exists "product_media update" on public.product_media;
create policy "product_media update"
  on public.product_media
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_media.product_id
        and (
          public.is_seller_owner(p.seller_id)
          or public.is_admin()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_media.product_id
        and (
          public.is_seller_owner(p.seller_id)
          or public.is_admin()
        )
    )
  );

drop policy if exists "product_media delete" on public.product_media;
create policy "product_media delete"
  on public.product_media
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_media.product_id
        and (
          public.is_seller_owner(p.seller_id)
          or public.is_admin()
        )
    )
  );

-- =========================================================================
-- 4. storage.objects (product-media bucket): tighten SELECT, keep CDN public
-- =========================================================================
--
-- The previous policy "product-media public read" allowed any caller —
-- including anon — to SELECT every row in storage.objects for this bucket.
-- That enables programmatic bucket listing (supabase.storage.from(...).list)
-- which leaks the full set of paths a seller has uploaded.
--
-- Public image rendering does NOT depend on this SELECT policy: the bucket
-- is marked public, so the Storage CDN serves
-- https://<project>.supabase.co/storage/v1/object/public/product-media/...
-- without consulting RLS. The codebase only ever reads media via
-- getPublicUrl() (CDN); there is no client-side list() call (see
-- src/lib/storage.ts, src/app/api/seller/products/[id]/media/route.ts).
--
-- Upload + delete continue to work because the API routes use the
-- service-role admin client (process.env.SUPABASE_SERVICE_ROLE_KEY), which
-- bypasses RLS entirely.
--
-- The new SELECT policy lets a seller list their own objects (for any
-- future dashboard "browse your uploads" surface) and lets admins list
-- everything. Anon cannot SELECT — public reads happen only via the CDN
-- using paths already stored in public.product_media (which RLS-gates
-- those rows to published products / owner / admin).

drop policy if exists "product-media public read" on storage.objects;
drop policy if exists "product-media owner select" on storage.objects;
create policy "product-media owner select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'product-media'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.sellers s
        where s.profile_id = auth.uid()
          and split_part(name, '/', 1) = 'sellers'
          and split_part(name, '/', 2) = s.id::text
      )
    )
  );

-- =========================================================================
-- 5. Leaked-password protection
-- =========================================================================
--
-- The Supabase advisor flags this when "Have I Been Pwned"-style password
-- breach checks are disabled. This setting cannot be toggled via SQL — it
-- lives in the Supabase dashboard under:
--
--   Authentication → Providers → Email → "Leaked Password Protection"
--
-- Enable it there. Once on, Supabase rejects sign-ups and password updates
-- that use known-breached passwords. No application changes are required;
-- the existing signup flow surfaces the error response from supabase.auth
-- as a normal validation failure.
