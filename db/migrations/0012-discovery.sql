-- Sharing overrides are separate from page title/cover; indexing is never access control.
alter table pages
 add column sharing_title text check(char_length(sharing_title) <= 200),
 add column sharing_description text check(char_length(sharing_description) <= 2000),
 add column sharing_cover_photo_id uuid references media_photos(id),
 add column allow_indexing boolean not null default true;
-- Preserve every exact media key for current and historical documents.
create or replace function garden_photo_ids(document jsonb) returns setof uuid language plpgsql immutable as $$
declare entry record; item jsonb; candidate text;
begin
 if jsonb_typeof(document)='object' then
  for entry in select * from jsonb_each(document) loop
   if entry.key in ('photoId','coverPhotoId','sharingCoverPhotoId','cover_photo_id','sharing_cover_photo_id') and jsonb_typeof(entry.value)='string' then
    candidate:=entry.value #>> '{}';
    if candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return next candidate::uuid; end if;
   elsif entry.key='photoIds' and jsonb_typeof(entry.value)='array' then
    for item in select * from jsonb_array_elements(entry.value) loop
     candidate:=item #>> '{}';
     if candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return next candidate::uuid; end if;
    end loop;
   else return query select * from garden_photo_ids(entry.value);
   end if;
  end loop;
 elsif jsonb_typeof(document)='array' then
  for item in select * from jsonb_array_elements(document) loop return query select * from garden_photo_ids(item); end loop;
 end if;
end $$;
