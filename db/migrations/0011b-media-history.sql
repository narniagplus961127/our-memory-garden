-- Full OLD snapshots are retained by 0009. They protect bytes without making
-- archived public visibility a public-access grant.
create view garden_media_usages as
 select distinct refs.photo_id,p.id as page_id,p.title,p.visibility,(p.deleted_at is not null) as deleted,false as history
 from pages p cross join lateral garden_photo_ids(to_jsonb(p)) refs(photo_id)
 union
 select distinct refs.photo_id,p.id as page_id,p.title,p.visibility,(p.deleted_at is not null) as deleted,true as history
 from page_versions v join pages p on p.id=v.page_id cross join lateral garden_photo_ids(v.snapshot) refs(photo_id);
revoke all on garden_media_usages from public;
create trigger garden_history_photo_guard before insert or update on page_versions for each row execute function garden_guard_photo_references();
create function garden_protect_referenced_photo() returns trigger language plpgsql as $$
begin
 if TG_OP='DELETE' or (OLD.status='ready' and NEW.status<>'ready') then
  if exists(select 1 from garden_media_usages where photo_id=OLD.id) then
   raise exception 'This photo is in use. Remove its page and history references before deleting it.' using errcode='23503';
  end if;
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 return NEW;
end $$;
create trigger garden_photo_retention before delete or update of status on media_photos for each row execute function garden_protect_referenced_photo();
revoke all on function garden_guard_photo_references(),garden_protect_referenced_photo() from public;
