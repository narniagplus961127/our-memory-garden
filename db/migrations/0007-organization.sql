create table page_categories (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(btrim(name)) between 1 and 100),
 created_by text not null references garden_administrators(user_id)
);
create unique index page_categories_name_idx on page_categories(lower(name));
revoke all on page_categories from public;
alter table pages add column page_date date,
 add column category_id uuid references page_categories(id),
 add column cover_photo_id uuid references media_photos(id),
 add column metadata_version integer not null default 0;
create index pages_category_idx on pages(category_id) where deleted_at is null;
