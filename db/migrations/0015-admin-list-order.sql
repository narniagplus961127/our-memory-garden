create table garden_admin_list_order (
  list text primary key check (list in ('pages', 'categories')),
  ids uuid[] not null default '{}',
  version integer not null default 1
);

insert into garden_admin_list_order (list) values ('pages'), ('categories');
revoke all on garden_admin_list_order from public;
