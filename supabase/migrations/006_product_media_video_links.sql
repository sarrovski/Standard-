-- Product media video links
--
-- Existing product_media rows are uploaded images. This migration extends the
-- table so a row can also represent a seller-provided YouTube link. YouTube
-- rows intentionally do not need a storage object.

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

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_media_image_storage_check'
      and conrelid = 'public.product_media'::regclass
  ) then
    alter table public.product_media
      add constraint product_media_image_storage_check
      check (
        media_type <> 'image'
        or storage_path is not null
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_media_youtube_fields_check'
      and conrelid = 'public.product_media'::regclass
  ) then
    alter table public.product_media
      add constraint product_media_youtube_fields_check
      check (
        media_type <> 'youtube'
        or (
          storage_path is null
          and provider = 'youtube'
          and video_id is not null
          and external_url is not null
          and thumbnail_url is not null
        )
      );
  end if;
end $$;

create index if not exists product_media_product_sort_idx
  on public.product_media(product_id, sort_order);

create index if not exists product_media_youtube_video_idx
  on public.product_media(provider, video_id)
  where media_type = 'youtube';
