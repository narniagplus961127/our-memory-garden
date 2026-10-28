create extension if not exists pgcrypto;
create table if not exists garden_administrators (
  user_id text primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  visibility text not null default 'private' check (visibility in ('private','public')),
  content jsonb not null default '{"root":{"props":{}},"content":[],"zones":{}}'::jsonb,
  version integer not null default 1,
  created_by text not null references garden_administrators(user_id),
  updated_by text not null references garden_administrators(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists pages_updated_at_idx on pages(updated_at desc);
create index if not exists pages_public_idx on pages(slug) where visibility='public' and deleted_at is null;
-- The app accesses this schema only from server code with a server-only connection.
-- No browser database API or database credential is provided.
revoke all on garden_administrators,pages from public;
