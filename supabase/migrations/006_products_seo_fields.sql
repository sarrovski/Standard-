-- Standard / Batch 16
-- Add SEO metadata fields to products.
--
-- Both nullable, both free-form text. The frontend falls back to
-- product.name / product.summary when these are empty, so existing rows
-- (no values yet) keep working without any backfill.
--
-- This is intentionally minimal: no triggers, no RLS changes, no constraints
-- beyond "nullable text". A separate batch can add length checks if we ever
-- find them necessary; in practice the frontend caps these to ~60 / ~160
-- chars at the input.
--
-- Idempotent: re-runs safely thanks to add column if not exists.

alter table public.products
  add column if not exists meta_title text,
  add column if not exists meta_description text;

comment on column public.products.meta_title is
  'SEO <title> override. Falls back to products.name if null.';
comment on column public.products.meta_description is
  'SEO meta description and OpenGraph description override. Falls back to products.summary if null.';
