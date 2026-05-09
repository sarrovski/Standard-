-- Batch 16: allow product media rows to represent uploaded images or
-- seller-provided YouTube links. Existing rows remain images.

alter table public.product_media
  add column if not exists media_type text not null default 'image',
  add column if not exists external_url text,
  add column if not exists provider text,
  add column if not exists video_id text,
  add column if not exists thumbnail_url text,
  add column if not exists title text;

alter table public.product_media
  alter column storage_path drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_media_media_type_check'
      and conrelid = 'public.product_media'::regclass
  ) then
    alter table public.product_media
      add constraint product_media_media_type_check
      check (media_type in ('image', 'youtube'));
  end if;
end $$;

create index if not exists product_media_product_sort_idx
  on public.product_media(product_id, sort_order);
