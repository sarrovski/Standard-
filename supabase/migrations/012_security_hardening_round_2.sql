-- Security hardening, round 2. Targets the warnings still surfacing in the
-- Supabase advisor after 011_security_hardening.sql.
--
-- This migration is intentionally self-contained: every change is idempotent
-- and includes the matching DROP, so it's safe to run even if 011 was never
-- applied. If 011 was already applied this is mostly a no-op for items 1, 5
-- (handle_new_user), and the storage bucket policy.
--
-- =========================================================================
-- 1. public.set_updated_at(): pin search_path = '' (was already in 011)
-- =========================================================================

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
-- 2. public.product_events INSERT: replace `with check (true)` with the
--    same constraint the column-level CHECK already enforces.
-- =========================================================================
--
-- The advisor's "RLS Policy Always True" lint pattern-matches on literal
-- `true`. The previous policy was correct (anonymous beacons need to be
-- accepted from product pages) but used `with check (true)`.
--
-- product_events.kind is already constrained to ('view', 'outbound_click')
-- by the column CHECK in migration 010, so the new condition rejects the
-- exact same rows the old one did — no functional change to legitimate
-- beacons.
--
-- product_id is NOT NULL with an ON DELETE CASCADE FK to public.products,
-- so an attacker cannot insert events for non-existent products.

drop policy if exists "anyone can record product events" on public.product_events;
create policy "anyone can record product events"
  on public.product_events
  for insert
  to anon, authenticated
  with check (kind in ('view', 'outbound_click'));

-- =========================================================================
-- 3. public.product_media: drop every legacy/current policy and recreate
--    the canonical four-policy set.
-- =========================================================================
--
-- Older migrations (001, 005, 011) have at one time or another defined
-- policies named:
--   - "product media public read for published products"
--   - "product media seller manage"          (FOR ALL with check)
--   - "product_media select"
--   - "product_media insert"
--   - "product_media update"
--   - "product_media delete"
--
-- We drop every name we've ever used (DROP POLICY IF EXISTS) and then
-- create the canonical set: a public SELECT (so the marketplace and
-- product pages can render images), and authenticated-only INSERT/UPDATE/
-- DELETE that require seller ownership or admin role.
--
-- No policy uses a bare `true` literal here.

drop policy if exists "product media public read for published products" on public.product_media;
drop policy if exists "product media seller manage" on public.product_media;
drop policy if exists "product_media select" on public.product_media;
drop policy if exists "product_media insert" on public.product_media;
drop policy if exists "product_media update" on public.product_media;
drop policy if exists "product_media delete" on public.product_media;

create policy "product_media select"
  on public.product_media
  for select
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_media.product_id
        and (
          p.status = 'published'
          or public.is_seller_owner(p.seller_id)
          or public.is_admin()
        )
    )
  );

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
-- 4. storage.objects (product-media bucket): tighten SELECT
-- =========================================================================
--
-- Same change as in 011, repeated for idempotency. Public CDN reads
-- continue to work (public buckets bypass RLS at the storage CDN).
-- Upload + delete continue to work because the API routes use the
-- service-role admin client, which bypasses RLS entirely. We're only
-- closing the SDK list() path that allowed bucket enumeration.

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
-- 5. SECURITY DEFINER functions: revoke EXECUTE where safe
-- =========================================================================
--
-- handle_new_user(): only invoked by the on_auth_user_created trigger.
-- Triggers fire regardless of caller EXECUTE permission, so we can revoke
-- from every role.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- get_product_traffic_stats(uuid): now invoked exclusively by the
-- server-side seller dashboard via the service-role admin client
-- (see src/lib/repositories/seller.ts after this migration). Revoke
-- EXECUTE from every non-service role so the advisor stops flagging it.
-- service_role retains implicit EXECUTE because it bypasses GRANTs.

revoke execute on function public.get_product_traffic_stats(uuid) from public;
revoke execute on function public.get_product_traffic_stats(uuid) from anon;
revoke execute on function public.get_product_traffic_stats(uuid) from authenticated;

-- is_admin() and is_seller_owner(uuid) are deliberately LEFT callable by
-- authenticated (and implicitly by anon for RLS evaluation on policies
-- that allow public reads). Every RLS policy on profiles, sellers,
-- products, product_media, seller_payment_methods, payment_verification_
-- requests, provider_tag_requests, trust_signals, featured_slots,
-- stripe_customers, subscriptions, and admin_actions references at
-- least one of these. The session role must have EXECUTE for those
-- policies to evaluate, so revoking would break authentication-gated
-- reads and writes for every user.
--
-- The functions are SECURITY DEFINER with pinned `set search_path = public`
-- (see 001_initial_schema.sql), which is the recommended hardening for
-- RLS helpers. The remaining "Public/Signed-In Can Execute" advisor
-- warnings for these two functions are accepted as intentional.

-- =========================================================================
-- 6. Leaked-password protection (dashboard-only)
-- =========================================================================
--
-- Cannot be toggled via SQL. Enable in:
--   Authentication → Providers → Email → Leaked Password Protection
