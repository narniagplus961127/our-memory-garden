alter table garden_admin_list_order drop constraint garden_admin_list_order_list_check;
alter table garden_admin_list_order add constraint garden_admin_list_order_list_check
  check (list in ('pages', 'categories', 'templates'));
insert into garden_admin_list_order (list) values ('templates');
