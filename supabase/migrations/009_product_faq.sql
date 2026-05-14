-- Per-product seller-authored FAQ.
--
-- Each entry is { q: string, a: string }. Google rewards rich FAQ
-- content on product pages, and sellers can answer the same six or
-- seven questions buyers always ask (delivery time, refunds, support,
-- payment methods, etc.) once on their own product instead of in DMs.
--
-- Stored as jsonb so the seller can add / remove / reorder entries
-- without us inventing a child table. Default is an empty array so
-- the public page handles the "no FAQ yet" state cleanly.

alter table public.products
  add column if not exists faq jsonb not null default '[]'::jsonb;
