-- Standard v21 / Batch 10
-- Fix product_media RLS so authenticated sellers can INSERT/UPDATE/DELETE
-- rows for products they own.
--
-- Background:
--   001_initial_schema.sql declared a single FOR ALL policy named
--   "product media seller manage" plus a public SELECT policy. In practice,
--   sellers got "new row violates row-level security policy" when uploading
--   media even though their session was authenticated and they owned the
--   target product.
--
--   FOR ALL policies are valid Postgres but the Supabase team recommends
--   per-operation policies (one per SELECT, INSERT, UPDATE, DELETE) so that
--   client tooling, dashboard explainers, and PostgREST all reason about
--   them consistently. We adopt that pattern here.
--
-- This migration:
--   1. Drops the old SELECT and FOR ALL policies on public.product_media.
--   2. Recreates them as explicit per-operation policies.
--   3. Public SELECT remains scoped to product.status = 'published' (or the
--      caller is the owning seller / an admin).
--   4. Sellers can INSERT/UPDATE/DELETE rows whose product they own.
--   5. Admins can manage everything.
--
-- Idempotent: every CREATE is preceded by DROP IF EXISTS, so re-running is
-- a no-op once applied.

-- 1. Drop the old policies.
drop policy if exists "product media public read for published products" on public.product_media;
drop policy if exists "product media seller manage" on public.product_media;

-- 2. Recreate with explicit per-operation policies.

-- 2a. Public SELECT — anyone can fetch product_media for a published
-- product. Sellers can also see their own draft/archived product media,
-- and admins can see everything.
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

-- 2b. INSERT — only the owning seller (or an admin) can attach media to a
-- product. The check is made on the row being inserted, so we re-resolve
-- the owning seller from product_id.
create policy "product_media insert"
  on public.product_media
  for insert
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

-- 2c. UPDATE — same ownership rule. We keep the using and with check the
-- same so admins / sellers can't modify a row to point at someone else's
-- product.
create policy "product_media update"
  on public.product_media
  for update
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

-- 2d. DELETE — owning seller or admin.
create policy "product_media delete"
  on public.product_media
  for delete
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
