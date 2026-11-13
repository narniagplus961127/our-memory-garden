-- Page snapshots hold a grid ID and revision. Entry rows are shared by every
-- revision during which their photo, text and position remain the same.
create table photo_grids (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  block_id text not null,
  revision integer not null default 1 check (revision > 0)
);
create index photo_grids_page on photo_grids(page_id);
create table photo_grid_entries (
  grid_id uuid not null references photo_grids(id) on delete cascade,
  entry_id uuid not null,
  photo_id uuid not null,
  position numeric not null,
  alt text not null default '' check (length(alt) <= 1000),
  caption text not null default '' check (length(caption) <= 2000),
  first_revision integer not null check (first_revision > 0),
  end_revision integer check (end_revision > first_revision),
  primary key (grid_id, entry_id, first_revision)
);
create unique index photo_grid_entries_current on photo_grid_entries(grid_id, entry_id) where end_revision is null;
create index photo_grid_entries_order on photo_grid_entries(grid_id, position, entry_id);
create index photo_grid_entries_photo on photo_grid_entries(photo_id, grid_id);
create table photo_grid_requests (
  grid_id uuid not null references photo_grids(id) on delete cascade,
  request_id uuid not null,
  primary key (grid_id, request_id)
);
revoke all on photo_grids, photo_grid_entries, photo_grid_requests from public;

create function garden_grid_refs(document jsonb)
returns table(grid_id uuid, revision integer)
language sql immutable parallel safe as $$
  select (item->>'gridId')::uuid, (item->>'gridRevision')::integer
  from jsonb_path_query(document, 'strict $.** ? (@.type == "PhotoGrid").props') item
  where item->>'gridId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and item->>'gridRevision' ~ '^[1-9][0-9]{0,8}$'
$$;

create or replace view garden_media_usages as
  select distinct refs.photo_id, p.id as page_id, p.title, p.visibility, (p.deleted_at is not null) as deleted, false as history
  from pages p cross join lateral garden_photo_ids(to_jsonb(p)) refs(photo_id)
  union
  select distinct refs.photo_id, p.id, p.title, p.visibility, (p.deleted_at is not null), true
  from page_versions v join pages p on p.id=v.page_id cross join lateral garden_photo_ids(v.snapshot) refs(photo_id)
  union
  select distinct entry.photo_id, p.id, p.title, p.visibility, (p.deleted_at is not null), false
  from photo_grid_entries entry join photo_grids g on g.id=entry.grid_id join pages p on p.id=g.page_id
  join lateral garden_grid_refs(p.content) ref on ref.grid_id=g.id
    and entry.first_revision<=ref.revision and (entry.end_revision is null or entry.end_revision>ref.revision);
revoke all on function garden_grid_refs(jsonb) from public;
