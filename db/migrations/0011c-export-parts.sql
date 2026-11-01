alter table garden_exports add column cleaned_at timestamptz;
alter table garden_exports add column activity_at timestamptz not null default now();
create table garden_export_parts (
 id uuid primary key default gen_random_uuid(),
 export_id uuid not null references garden_exports(id) on delete cascade,
 number integer not null,
 kind text not null check(kind in ('content','originals')),
 status text not null default 'pending' check(status in ('pending','ready','error')),
 filename text not null,
 object_key text not null unique,
 bytes bigint,
 error text,
 unique(export_id,number)
);
create table garden_export_records (
 id bigint generated always as identity primary key,
 export_id uuid not null references garden_exports(id) on delete cascade,
 part_id uuid references garden_export_parts(id) on delete cascade,
 kind text not null,
 document jsonb not null
);
create index garden_export_records_part on garden_export_records(part_id,id);
create table garden_export_items (
 export_id uuid not null references garden_exports(id) on delete cascade,
 source_photo_id uuid not null,
 photo_id uuid references media_photos(id) on delete set null,
 part_id uuid not null references garden_export_parts(id) on delete cascade,
 original_key text not null,
 original_type text not null,
 original_bytes integer not null,
 primary key(export_id,source_photo_id)
);
create index garden_export_items_part on garden_export_items(part_id,source_photo_id);
create index garden_export_items_pins on garden_export_items(photo_id) where photo_id is not null;
revoke all on garden_export_parts,garden_export_records,garden_export_items from public;
create function garden_guard_export_pin() returns trigger language plpgsql as $$
declare photo_status text;
begin
 if NEW.photo_id is not null then
  select status into photo_status from media_photos where id=NEW.photo_id for share;
  if photo_status is distinct from 'ready' then raise exception 'Choose a ready photo from the shared library.' using errcode='23503'; end if;
 end if;
 return NEW;
end $$;
create trigger garden_export_pin_guard before insert or update of photo_id on garden_export_items for each row execute function garden_guard_export_pin();
create or replace function garden_protect_referenced_photo() returns trigger language plpgsql as $$
begin
 if TG_OP='DELETE' or (OLD.status='ready' and NEW.status<>'ready') then
  if exists(select 1 from garden_media_usages where photo_id=OLD.id) then
   raise exception 'This photo is in use. Remove its page and history references before deleting it.' using errcode='23503';
  end if;
  if exists(select 1 from garden_export_items i join garden_exports e on e.id=i.export_id where i.photo_id=OLD.id and e.expires_at>now()) then
   raise exception 'This photo is being prepared for a backup. Finish or cancel the export before deleting it.' using errcode='23503';
  end if;
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 return NEW;
end $$;
revoke all on function garden_guard_export_pin(),garden_protect_referenced_photo() from public;
-- No production exports predate this versioned format. Legacy local jobs are
-- explicitly unavailable; maintenance also removes their recorded object_key.
update garden_exports set status='error',error='This older export format is unavailable. Create a fresh export.',expires_at=now() where not exists(select 1 from garden_export_parts where export_id=garden_exports.id);
