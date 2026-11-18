alter table media_photos
  add column thumbnails_ready boolean not null default false;

create index media_photos_thumbnail_backfill_idx on media_photos (id)
  where status = 'ready' and not thumbnails_ready;
