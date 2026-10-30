-- Exact revisions are retained; display grouping never discards a trusted base.
alter table pages add column edit_group_id uuid not null default gen_random_uuid();
alter table pages add column editor_session_id text;
alter table pages add column edit_reason text not null default 'edit';
create table page_versions (
  page_id uuid not null references pages(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  updated_at timestamptz not null,
  updated_by text not null,
  group_id uuid not null,
  reason text not null,
  archived_at timestamptz not null default now(),
  primary key (page_id, version)
);
create index page_versions_page_time on page_versions(page_id, updated_at desc);
revoke all on page_versions from public;
create function garden_archive_page() returns trigger language plpgsql as $$
begin
  if NEW.version <> OLD.version or NEW.content is distinct from OLD.content
    or NEW.title is distinct from OLD.title or NEW.visibility is distinct from OLD.visibility
    or NEW.deleted_at is distinct from OLD.deleted_at then
    -- Cover every content/metadata writer, including older callers.
    NEW.version := OLD.version + 1;
    insert into page_versions(page_id,version,snapshot,updated_at,updated_by,group_id,reason)
      values(OLD.id,OLD.version,to_jsonb(OLD),OLD.updated_at,OLD.updated_by,OLD.edit_group_id,OLD.edit_reason);
  end if;
  return NEW;
end;
$$;
create trigger garden_page_revision before update on pages
for each row execute function garden_archive_page();
revoke all on function garden_archive_page() from public;

