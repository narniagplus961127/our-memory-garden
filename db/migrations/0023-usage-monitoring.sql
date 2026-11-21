create table garden_usage_hourly (
 bucket timestamptz not null,
 kind text not null check(kind in ('thumbnail','display','original','backup','other')),
 samples bigint not null default 0,
 estimated_requests bigint not null default 0,
 estimated_bytes bigint not null default 0,
 estimated_errors bigint not null default 0,
 estimated_not_modified bigint not null default 0,
 primary key(bucket,kind)
);
create table garden_usage_settings (
 singleton boolean primary key default true check(singleton),
 daily_bytes bigint not null default 250000000 check(daily_bytes between 1000000 and 10000000000000),
 monthly_bytes bigint not null default 8000000000 check(monthly_bytes between 1000000 and 100000000000000),
 error_percent integer not null default 10 check(error_percent between 1 and 100),
 version integer not null default 1,
 started_at timestamptz not null default now()
);
insert into garden_usage_settings(singleton) values(true);
revoke all on garden_usage_hourly,garden_usage_settings from public;
create index pages_date_listing_idx on pages(page_date desc nulls last,created_at desc,id) where deleted_at is null;
create index media_photos_library_idx on media_photos(created_at desc,id desc) where status in ('ready','deleting');
