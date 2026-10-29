-- Dyad initial schema. All tables in the exposed public schema have RLS enabled.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create type public.activity_source as enum ('official', 'community');
create type public.activity_state as enum ('imported', 'enriched', 'published', 'completed', 'cancelled', 'expired');
create type public.participation_state as enum ('interested', 'discoverable', 'requested', 'invited', 'going', 'attended', 'declined');
create type public.invitation_state as enum ('pending', 'accepted', 'declined', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  initials text not null check (char_length(initials) between 1 and 4),
  avatar_url text,
  neighborhood text not null check (char_length(neighborhood) <= 100),
  location extensions.geography(point, 4326),
  travel_radius_miles integer not null default 10 check (travel_radius_miles between 1 and 50),
  bio text not null default '' check (char_length(bio) <= 400),
  is_adult_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_location_idx on public.profiles using gist (location);

create table public.interest_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  original_answers jsonb not null default '{}'::jsonb,
  category_weights jsonb not null default '{}'::jsonb,
  vibes text[] not null default '{}',
  settings text[] not null default '{}',
  preferred_group_min integer not null default 3 check (preferred_group_min between 2 and 20),
  preferred_group_max integer not null default 6 check (preferred_group_max between 2 and 20 and preferred_group_max >= preferred_group_min),
  noise_tolerance text not null check (noise_tolerance in ('low', 'medium', 'high')),
  price_band text not null check (price_band in ('free', 'budget', 'moderate', 'flexible')),
  availability jsonb not null default '{}'::jsonb,
  exploration_weight numeric(3,2) not null default 0.3 check (exploration_weight between 0 and 1),
  accessibility_requirements text[] not null default '{}',
  summary text not null default '' check (char_length(summary) <= 500),
  model_name text,
  prompt_version text,
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  source_type public.activity_source not null,
  source_name text not null,
  external_id text,
  source_url text,
  creator_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  image_url text,
  venue_name text not null,
  neighborhood text not null,
  location extensions.geography(point, 4326),
  starts_at timestamptz not null,
  ends_at timestamptz,
  price_band text not null check (price_band in ('free', 'budget', 'moderate', 'flexible')),
  price_label text not null default 'See source',
  capacity integer not null default 6 check (capacity between 2 and 50),
  state public.activity_state not null default 'imported',
  source_hash text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_name, external_id)
);

create index activities_location_idx on public.activities using gist (location);
create index activities_feed_idx on public.activities (state, starts_at);
create index activities_creator_idx on public.activities (creator_id);

create table public.event_semantic_profiles (
  activity_id uuid primary key references public.activities(id) on delete cascade,
  categories jsonb not null default '[]'::jsonb,
  vibes text[] not null default '{}',
  social_modes text[] not null default '{}',
  energy text not null check (energy in ('low', 'medium', 'high')),
  likely_noise text not null check (likely_noise in ('low', 'medium', 'high', 'unknown')),
  setting text not null check (setting in ('indoor', 'outdoor', 'mixed', 'unknown')),
  interaction_potential text not null check (interaction_potential in ('low', 'medium', 'high')),
  concise_summary text not null check (char_length(concise_summary) <= 500),
  suggested_group_min integer not null default 3,
  suggested_group_max integer not null default 6,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  model_name text,
  prompt_version text not null default 'event-profile-v1',
  enriched_at timestamptz not null default now()
);

create table public.activity_interest (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  state public.participation_state not null default 'interested',
  discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (activity_id, user_id),
  check (not discoverable or state in ('discoverable', 'requested', 'invited', 'going', 'attended'))
);

create index activity_interest_discovery_idx on public.activity_interest (activity_id, discoverable) where discoverable = true;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Event crew' check (char_length(name) <= 80),
  capacity integer not null default 6 check (capacity between 2 and 12),
  meeting_point text not null default '' check (char_length(meeting_point) <= 500),
  ai_brief text check (char_length(ai_brief) <= 1500),
  state text not null default 'forming' check (state in ('forming', 'ready', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  state public.invitation_state not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (group_id, invitee_id),
  check (inviter_id <> invitee_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_group_created_idx on public.messages (group_id, created_at);

create table public.reconnect_votes (
  group_id uuid not null references public.groups(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  would_meet_again boolean not null,
  created_at timestamptz not null default now(),
  primary key (group_id, voter_id, subject_id),
  check (voter_id <> subject_id)
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  source_group_id uuid references public.groups(id) on delete set null,
  created_at timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 1000),
  state text not null default 'open' check (state in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  task_type text not null,
  model_name text not null,
  prompt_version text not null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10,6),
  used_fallback boolean not null default false,
  validation_outcome text not null default 'passed',
  source_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.event_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed')),
  fetched_count integer not null default 0,
  changed_count integer not null default 0,
  enriched_count integer not null default 0,
  error_message text
);

-- Private authorization helpers avoid recursive RLS policies on membership tables.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id and gm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_group_host(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.groups g
    where g.id = target_group_id and g.host_id = (select auth.uid())
  );
$$;

create or replace function private.can_view_event_people(target_activity_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.activity_interest mine
      where mine.activity_id = target_activity_id
        and mine.user_id = (select auth.uid())
        and mine.discoverable = true
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = target_user_id)
         or (b.blocker_id = target_user_id and b.blocked_id = (select auth.uid()))
    );
$$;

revoke all on function private.is_group_member(uuid) from public, anon;
revoke all on function private.is_group_host(uuid) from public, anon;
revoke all on function private.can_view_event_people(uuid, uuid) from public, anon;
grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.is_group_host(uuid) to authenticated;
grant execute on function private.can_view_event_people(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.interest_profiles enable row level security;
alter table public.activities enable row level security;
alter table public.event_semantic_profiles enable row level security;
alter table public.activity_interest enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invitations enable row level security;
alter table public.messages enable row level security;
alter table public.reconnect_votes enable row level security;
alter table public.connections enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.ai_runs enable row level security;
alter table public.event_sync_runs enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.activities, public.event_semantic_profiles to anon, authenticated;
grant select, insert, update on public.profiles, public.interest_profiles, public.activity_interest, public.groups, public.group_members, public.invitations, public.messages, public.reconnect_votes, public.connections, public.blocks, public.reports to authenticated;

create policy "profiles_read_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "interest_profiles_read_own" on public.interest_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "interest_profiles_insert_own" on public.interest_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "interest_profiles_update_own" on public.interest_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "published_activities_are_readable" on public.activities for select to anon, authenticated using (state in ('enriched', 'published', 'completed'));
create policy "community_activity_insert" on public.activities for insert to authenticated with check (source_type = 'community' and creator_id = (select auth.uid()));
create policy "community_activity_update" on public.activities for update to authenticated using (source_type = 'community' and creator_id = (select auth.uid())) with check (source_type = 'community' and creator_id = (select auth.uid()));

create policy "published_semantics_are_readable" on public.event_semantic_profiles for select to anon, authenticated using (exists (select 1 from public.activities a where a.id = activity_id and a.state in ('enriched', 'published', 'completed')));

create policy "activity_interest_read_boundary" on public.activity_interest for select to authenticated using (
  user_id = (select auth.uid()) or (discoverable = true and private.can_view_event_people(activity_id, user_id))
);
create policy "activity_interest_insert_own" on public.activity_interest for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activity_interest_update_own" on public.activity_interest for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "activity_interest_delete_own" on public.activity_interest for delete to authenticated using ((select auth.uid()) = user_id);

create policy "groups_read_by_members" on public.groups for select to authenticated using (private.is_group_member(id));
create policy "groups_insert_by_host" on public.groups for insert to authenticated with check (host_id = (select auth.uid()));
create policy "groups_update_by_host" on public.groups for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));

create policy "group_members_read_group" on public.group_members for select to authenticated using (private.is_group_member(group_id));
create policy "group_members_insert_host" on public.group_members for insert to authenticated with check (
  user_id = (select auth.uid()) or private.is_group_host(group_id)
);
create policy "group_members_delete_self_or_host" on public.group_members for delete to authenticated using (
  user_id = (select auth.uid()) or private.is_group_host(group_id)
);

create policy "invitations_read_parties" on public.invitations for select to authenticated using (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()));
create policy "invitations_insert_member" on public.invitations for insert to authenticated with check (
  inviter_id = (select auth.uid()) and private.is_group_member(group_id)
);
create policy "invitations_update_invitee" on public.invitations for update to authenticated using (invitee_id = (select auth.uid())) with check (invitee_id = (select auth.uid()));

create policy "messages_read_members" on public.messages for select to authenticated using (private.is_group_member(group_id));
create policy "messages_insert_members" on public.messages for insert to authenticated with check (user_id = (select auth.uid()) and private.is_group_member(group_id));

create policy "reconnect_votes_read_own" on public.reconnect_votes for select to authenticated using (voter_id = (select auth.uid()));
create policy "reconnect_votes_insert_own" on public.reconnect_votes for insert to authenticated with check (
  voter_id = (select auth.uid()) and private.is_group_member(group_id)
);
create policy "reconnect_votes_update_own" on public.reconnect_votes for update to authenticated using (voter_id = (select auth.uid())) with check (voter_id = (select auth.uid()));

create policy "connections_read_parties" on public.connections for select to authenticated using (user_a_id = (select auth.uid()) or user_b_id = (select auth.uid()));
create policy "blocks_manage_own" on public.blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
create policy "reports_insert_own" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "reports_read_own" on public.reports for select to authenticated using (reporter_id = (select auth.uid()));

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.invitations;
alter publication supabase_realtime add table public.group_members;

