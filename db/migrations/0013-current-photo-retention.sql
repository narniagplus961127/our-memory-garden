-- Historical snapshots describe past content; only current page references retain bytes.
-- The existing page/history attachment guard and media row locks remain in force.
create or replace function garden_protect_referenced_photo() returns trigger language plpgsql as $$
begin
 if TG_OP='DELETE' or (OLD.status='ready' and NEW.status<>'ready') then
  if exists(select 1 from garden_media_usages where photo_id=OLD.id and not history) then
   raise exception 'This photo is in use. Remove it from current pages and covers before deleting it.' using errcode='23503';
  end if;
  if exists(select 1 from garden_export_items i join garden_exports e on e.id=i.export_id where i.photo_id=OLD.id and e.expires_at>now()) then
   raise exception 'This photo is being prepared for a backup. Finish or cancel the export before deleting it.' using errcode='23503';
  end if;
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 return NEW;
end $$;
revoke all on function garden_protect_referenced_photo() from public;
