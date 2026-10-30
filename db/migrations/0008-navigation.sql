create table garden_navigation (singleton boolean primary key default true check(singleton),items jsonb not null default '[]'::jsonb,version integer not null default 1);
insert into garden_navigation(singleton) values(true);
revoke all on garden_navigation from public;
