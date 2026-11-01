alter table media_photos drop constraint media_photos_status_check;
alter table media_photos add constraint media_photos_status_check check(status in ('pending','ready','deleting'));
alter table media_photos add column deletion_error text;
-- Serialize page attachment and deletion using the same media row. FOR SHARE conflicts
-- with the explicit FOR UPDATE deletion claim, including non-key status changes.
create function garden_guard_photo_references() returns trigger language plpgsql as $$
declare photo_id uuid; photo_status text;
begin
 for photo_id in select distinct garden_photo_ids(to_jsonb(new)) order by 1 loop
  select status into photo_status from media_photos where id=photo_id for share;
  if photo_status is distinct from 'ready' then
   raise exception 'Choose a ready photo from the shared library.' using errcode='23503';
  end if;
 end loop;
 return new;
end $$;
create trigger garden_pages_photo_guard before insert or update on pages for each row execute function garden_guard_photo_references();
create table garden_exports (
 id uuid primary key default gen_random_uuid(),
 status text not null default 'pending' check(status in ('pending','ready','error')),
 created_by text not null references garden_administrators(user_id),
 created_at timestamptz not null default now(),
 snapshot_at timestamptz,
 expires_at timestamptz not null default now()+interval '24 hours',
 filename text not null,
 object_key text not null unique,
 bytes bigint,
 error text
);
revoke all on garden_exports from public;
create unique index garden_exports_one_pending on garden_exports(status) where status='pending';
