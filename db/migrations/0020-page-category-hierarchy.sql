alter table page_categories add column parent_id uuid references page_categories(id) on delete set null;
alter table page_categories add constraint page_categories_parent_not_self check (id <> parent_id);
create index page_categories_parent_idx on page_categories(parent_id);

alter table pages add column category_ids uuid[] not null default '{}';
update pages set category_ids = array[category_id] where category_id is not null;
create index pages_category_ids_idx on pages using gin(category_ids);

-- Keep the old scalar addressable during a rolling release and retain full
-- memberships in the existing row-based History and export snapshots.
create function garden_sync_page_categories() returns trigger language plpgsql as $$
declare assigned uuid;
begin
  if (TG_OP = 'INSERT' and cardinality(NEW.category_ids) = 0 and NEW.category_id is not null)
    or (TG_OP = 'UPDATE' and NEW.category_ids = OLD.category_ids
        and NEW.category_id is distinct from OLD.category_id) then
    NEW.category_ids := array_remove(array[NEW.category_id], null);
  end if;
  select array(select distinct item from unnest(NEW.category_ids) item where item is not null order by item)
    into NEW.category_ids;
  foreach assigned in array NEW.category_ids loop
    if TG_OP = 'UPDATE' and assigned = any(OLD.category_ids) then continue; end if;
    perform id from page_categories where id = assigned for key share;
    if not found then
      raise exception 'Choose an existing category.' using errcode = '23503', constraint = 'pages_category_ids_fkey';
    end if;
  end loop;
  NEW.category_id := NEW.category_ids[1];
  return NEW;
end $$;
create trigger garden_sync_page_categories before insert or update of category_id, category_ids on pages
  for each row execute function garden_sync_page_categories();

create function garden_require_unused_category() returns trigger language plpgsql as $$
begin
  if exists(select 1 from pages where category_ids @> array[OLD.id]) then
    raise exception 'Remove the category from its pages before deleting it.' using errcode = '23503', constraint = 'pages_category_ids_fkey';
  end if;
  return OLD;
end $$;
create trigger garden_require_unused_category before delete on page_categories
  for each row execute function garden_require_unused_category();
