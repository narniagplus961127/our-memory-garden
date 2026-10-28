create table garden_settings (
  singleton boolean primary key default true check (singleton),
  homepage_id uuid not null references pages(id) on delete restrict
);
revoke all on garden_settings from public;

create function garden_validate_homepage() returns trigger language plpgsql as $$
begin
  if TG_OP = 'DELETE' then
    raise check_violation using message = 'Choose another homepage instead of removing the homepage setting.';
  end if;
  perform id from pages where id = NEW.homepage_id and visibility = 'public' and deleted_at is null for update;
  if not found then
    raise check_violation using message = 'Choose an available public page as the homepage.';
  end if;
  return NEW;
end;
$$;
create trigger garden_homepage_selection before insert or update or delete on garden_settings
for each row execute function garden_validate_homepage();

create function garden_protect_homepage() returns trigger language plpgsql as $$
begin
  if exists(select 1 from garden_settings where homepage_id = OLD.id) then
    if TG_OP = 'DELETE' then
      raise check_violation using message = 'Choose another homepage before deleting this page.';
    end if;
    if NEW.visibility <> 'public' or NEW.deleted_at is not null then
      raise check_violation using message = 'The homepage must stay public. Choose another homepage first.';
    end if;
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
create trigger garden_homepage_protection before update or delete on pages
for each row execute function garden_protect_homepage();
revoke all on function garden_validate_homepage(), garden_protect_homepage() from public;
