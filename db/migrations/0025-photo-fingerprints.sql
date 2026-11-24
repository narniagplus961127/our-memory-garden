-- Only completed originals are fingerprinted. Existing originals are deliberately
-- left unindexed: populating them requires a separate, potentially large read.
alter table media_photos add column original_sha256 text
  check (original_sha256 is null or original_sha256 ~ '^[0-9a-f]{64}$');
create index media_photos_fingerprint_idx
  on media_photos(original_sha256, original_bytes, created_at, id)
  where status='ready' and original_sha256 is not null;
