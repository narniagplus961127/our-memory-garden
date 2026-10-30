create table media_photos (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 1 and 200),
 status text not null default 'pending' check(status in ('pending','ready')),
 expected_bytes integer not null check(expected_bytes between 1 and 26214400),
 original_bytes integer,
 display_bytes integer,
 width integer,
 height integer,
 original_type text,
 staging_key text not null unique,
 staging_cleaned_at timestamptz,
 original_key text not null unique,
 display_key text not null unique,
 created_by text not null references garden_administrators(user_id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '15 minutes'
);
revoke all on media_photos from public;
create index media_photos_ready_idx on media_photos(created_at desc) where status='ready';
-- Recursively discover explicit media references, including nested slots and future galleries/covers.
create function garden_photo_ids(document jsonb) returns setof uuid language plpgsql immutable as $$
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
