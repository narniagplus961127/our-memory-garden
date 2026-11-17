create table garden_admin_invitations (
  email text primary key,
  name text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  auth_user_id text,
  code_sent_at timestamptz,
  code_attempts integer not null default 0,
  used_at timestamptz
);

revoke all on garden_admin_invitations from public;
