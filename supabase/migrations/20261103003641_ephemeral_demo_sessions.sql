create table public.demo_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint demo_sessions_expiry_after_creation check (expires_at > created_at)
);

create index demo_sessions_expires_at_idx on public.demo_sessions (expires_at);

alter table public.demo_sessions enable row level security;
revoke all on public.demo_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.demo_sessions to service_role;
