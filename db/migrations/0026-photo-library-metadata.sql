create function garden_valid_photo_labels(value text[]) returns boolean
language sql immutable parallel safe as $$
  select value is not null and coalesce(array_ndims(value),1)=1 and cardinality(value)<=20
    and not exists(select 1 from unnest(value) label
      where label is null or char_length(label) not between 1 and 40
        or label<>btrim(label) or label ~ '[[:cntrl:]]')
$$;
alter table media_photos
  add column labels text[] not null default '{}'::text[] check (garden_valid_photo_labels(labels)),
  add column metadata_version integer not null default 0 check (metadata_version>=0);
