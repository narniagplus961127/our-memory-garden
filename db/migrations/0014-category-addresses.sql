alter table page_categories add column slug text;
do $$
declare item record; base text; candidate text; suffix integer;
begin
 for item in select id,name from page_categories order by id loop
  base := trim(both '-' from regexp_replace(lower(regexp_replace(normalize(item.name,NFKD),U&'[\0300-\036f]','','g')),'[^a-z0-9]+','-','g'));
  base := trim(trailing '-' from left(base,90));
  if base='' then base := 'category'; end if;
  candidate := base; suffix := 1;
  while exists(select 1 from page_categories where slug=candidate) loop
   suffix := suffix+1; candidate := base||'-'||suffix;
  end loop;
  update page_categories set slug=candidate where id=item.id;
 end loop;
end $$;
-- Older running builds can still create a category during the release window.
alter table page_categories alter column slug set default ('category-'||gen_random_uuid()::text), alter column slug set not null;
alter table page_categories add constraint page_categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug)<=100);
create unique index page_categories_slug_idx on page_categories(slug);
