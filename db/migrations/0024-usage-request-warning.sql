alter table garden_usage_settings add column hourly_requests bigint not null default 10000 check(hourly_requests between 100 and 1000000000);
