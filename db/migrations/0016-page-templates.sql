create table page_templates (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 200),
  content jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

revoke all on page_templates from public;
