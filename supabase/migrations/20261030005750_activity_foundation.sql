create table public.activities (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('official', 'community')),
  source_name text not null check (char_length(source_name) between 1 and 80),
  external_id text unique,
  source_url text,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '' check (char_length(description) <= 3000),
  image_url text,
  venue_name text not null default '' check (char_length(venue_name) <= 180),
  address text not null default '' check (char_length(address) <= 240),
  city text not null default 'San Diego, CA' check (char_length(city) <= 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  price_label text not null default '' check (char_length(price_label) <= 120),
  topics text[] not null default '{}',
  status text not null default 'published' check (status in ('draft', 'published', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.activity_states (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  interested boolean not null default false,
  saved boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_id),
  check (interested or saved)
);

create table public.activity_discovery (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);

create index activities_status_starts_at_idx
on public.activities (status, starts_at);

create index activity_states_activity_id_idx
on public.activity_states (activity_id);

create index activity_discovery_activity_id_idx
on public.activity_discovery (activity_id, user_id);

alter table public.activities enable row level security;
alter table public.activity_states enable row level security;
alter table public.activity_discovery enable row level security;

revoke all on public.activities from anon, authenticated;
revoke all on public.activity_states from anon, authenticated;
revoke all on public.activity_discovery from anon, authenticated;

grant select on public.activities to anon, authenticated;
grant select, insert, update, delete on public.activity_states to authenticated;
grant select, insert, delete on public.activity_discovery to authenticated;

create policy "activities_read_available"
on public.activities for select
to anon, authenticated
using (status in ('published', 'completed'));

create policy "activity_states_read_own"
on public.activity_states for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "activity_states_insert_own"
on public.activity_states for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "activity_states_update_own"
on public.activity_states for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "activity_states_delete_own"
on public.activity_states for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "activity_discovery_read_authenticated"
on public.activity_discovery for select
to authenticated
using (true);

create policy "activity_discovery_insert_own"
on public.activity_discovery for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "activity_discovery_delete_own"
on public.activity_discovery for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_my_activity_state(
  p_activity_id uuid,
  p_interested boolean,
  p_saved boolean,
  p_discoverable boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_discoverable and not p_interested then
    raise exception 'Discoverable activities must also be marked interested';
  end if;

  if p_interested or p_saved then
    insert into public.activity_states (user_id, activity_id, interested, saved)
    values ((select auth.uid()), p_activity_id, p_interested, p_saved)
    on conflict (user_id, activity_id) do update set
      interested = excluded.interested,
      saved = excluded.saved,
      updated_at = now();
  else
    delete from public.activity_states
    where user_id = (select auth.uid())
      and activity_id = p_activity_id;
  end if;

  if p_discoverable then
    insert into public.activity_discovery (user_id, activity_id)
    values ((select auth.uid()), p_activity_id)
    on conflict (user_id, activity_id) do nothing;
  else
    delete from public.activity_discovery
    where user_id = (select auth.uid())
      and activity_id = p_activity_id;
  end if;
end;
$$;

revoke all on function public.set_my_activity_state(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_my_activity_state(uuid, boolean, boolean, boolean) to authenticated;
