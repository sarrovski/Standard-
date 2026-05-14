-- Grouped product features ("named feature categories").
--
-- Sellers used to enter a flat list of features (products.features text[]).
-- That's still useful as a denormalized view for marketplace cards, but it
-- doesn't let a seller organize features under named buckets like "Aimbot",
-- "Visuals", "Movement", which is how cheat-tool product pages typically
-- explain themselves.
--
-- features_grouped stores the structured shape:
--   [
--     { "name": "Aimbot",   "features": ["Smooth aim", "Prediction"] },
--     { "name": "Visuals",  "features": ["Player ESP", "Loot ESP"] }
--   ]
--
-- products.features (text[]) stays as the flattened backward-compat view.
-- The API writes both on every create/update so existing renderers keep
-- working without round-tripping JSON.
--
-- Existing rows: backfill features_grouped from the flat features array by
-- putting everything into a single "Features" group, so the new editor
-- isn't empty when a seller opens a product they created before.

alter table public.products
  add column if not exists features_grouped jsonb not null default '[]'::jsonb;

update public.products
set features_grouped = jsonb_build_array(
  jsonb_build_object(
    'name', 'Features',
    'features', to_jsonb(features)
  )
)
where features_grouped = '[]'::jsonb
  and features is not null
  and cardinality(features) > 0;
