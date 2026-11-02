create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index friendships_unique_pair_idx
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_requester_status_idx on public.friendships (requester_id, status, created_at desc);
create index friendships_addressee_status_idx on public.friendships (addressee_id, status, created_at desc);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;
grant select, insert, update on public.friendships to service_role;

create policy "friendships_read_participant"
on public.friendships for select
to authenticated
using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

alter table public.groups
  add column creation_mode text not null default 'manual'
  check (creation_mode in ('manual', 'matchmaking')),
  add column match_reason text not null default ''
  check (char_length(match_reason) <= 240);

create table public.activity_matchmaking (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  min_group_size smallint not null check (min_group_size between 2 and 6),
  max_group_size smallint not null check (max_group_size between 2 and 6),
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  group_id uuid references public.groups(id) on delete set null,
  match_reason text not null default '' check (char_length(match_reason) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_id),
  check (min_group_size <= max_group_size),
  check ((status = 'matched' and group_id is not null) or status <> 'matched')
);

create index activity_matchmaking_pool_idx
on public.activity_matchmaking (activity_id, status, created_at)
where status = 'waiting';
create index activity_matchmaking_group_id_idx
on public.activity_matchmaking (group_id)
where group_id is not null;

alter table public.activity_matchmaking enable row level security;
revoke all on public.activity_matchmaking from anon, authenticated;
grant select on public.activity_matchmaking to authenticated;
grant select, insert, update on public.activity_matchmaking to service_role;

create policy "activity_matchmaking_read_own"
on public.activity_matchmaking for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "group_invites_insert_member" on public.group_invites;
create policy "group_invites_insert_friend"
on public.group_invites for insert
to authenticated
with check (
  inviter_id = (select auth.uid())
  and (select private.is_group_member(group_id))
  and exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = (select auth.uid()) and f.addressee_id = invitee_id)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = invitee_id)
      )
  )
  and not exists (
    select 1
    from public.groups g
    join public.group_members m on m.group_id = g.id
    where g.activity_id = (select activity_id from public.groups where id = group_id)
      and m.user_id = invitee_id
  )
);

create or replace function public.create_activity_group(p_activity_id uuid, p_invitee_ids uuid[])
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_invitees uuid[];
  new_group_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if private.is_grouped_for_activity(caller_id, p_activity_id) then
    raise exception 'You are already in a group for this activity';
  end if;

  select coalesce(array_agg(distinct invitee_id), '{}') into clean_invitees
  from unnest(coalesce(p_invitee_ids, '{}')) as invitee_id
  where invitee_id <> caller_id;

  if cardinality(clean_invitees) < 1 or cardinality(clean_invitees) > 10 then
    raise exception 'Choose between 1 and 10 friends';
  end if;

  if exists (
    select 1
    from unnest(clean_invitees) invitee_id
    where not exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = caller_id and f.addressee_id = invitee_id)
          or (f.addressee_id = caller_id and f.requester_id = invitee_id)
        )
    )
    or private.is_grouped_for_activity(invitee_id, p_activity_id)
  ) then
    raise exception 'Every invitee must be an available friend';
  end if;

  insert into public.groups (activity_id, created_by, creation_mode)
  values (p_activity_id, caller_id, 'manual')
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, caller_id, 'creator');

  insert into public.group_invites (group_id, inviter_id, invitee_id)
  select new_group_id, caller_id, invitee_id from unnest(clean_invitees) as invitee_id;

  return new_group_id;
end;
$$;

create or replace function public.invite_more_to_group(p_group_id uuid, p_invitee_ids uuid[])
returns integer
language plpgsql
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  group_activity_id uuid;
  clean_invitees uuid[];
  active_count integer;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if not (select private.is_group_member(p_group_id)) then raise exception 'Group membership required'; end if;

  select g.activity_id into group_activity_id from public.groups g where g.id = p_group_id;

  select coalesce(array_agg(distinct invitee_id), '{}') into clean_invitees
  from unnest(coalesce(p_invitee_ids, '{}')) as invitee_id
  where invitee_id <> caller_id
    and not exists (
      select 1 from public.group_members m
      where m.group_id = p_group_id and m.user_id = invitee_id
    )
    and not exists (
      select 1 from public.group_invites i
      where i.group_id = p_group_id and i.invitee_id = invitee_id and i.status in ('pending', 'accepted')
    );

  if cardinality(clean_invitees) < 1 then raise exception 'Choose at least one new friend'; end if;

  if exists (
    select 1
    from unnest(clean_invitees) invitee_id
    where not exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = caller_id and f.addressee_id = invitee_id)
          or (f.addressee_id = caller_id and f.requester_id = invitee_id)
        )
    )
    or private.is_grouped_for_activity(invitee_id, group_activity_id)
  ) then
    raise exception 'Every invitee must be an available friend';
  end if;

  select
    (select count(*) from public.group_members where group_id = p_group_id)
    + (select count(*) from public.group_invites where group_id = p_group_id and status = 'pending')
  into active_count;

  if active_count + cardinality(clean_invitees) > 11 then
    raise exception 'Groups can include you and up to 10 invited friends';
  end if;

  insert into public.group_invites (group_id, inviter_id, invitee_id)
  select p_group_id, caller_id, invitee_id from unnest(clean_invitees) as invitee_id
  on conflict (group_id, invitee_id) do update set
    inviter_id = excluded.inviter_id,
    status = 'pending',
    created_at = now(),
    responded_at = null
  where public.group_invites.status = 'declined';

  return cardinality(clean_invitees);
end;
$$;

create or replace function public.create_matchmade_activity_group(
  p_activity_id uuid,
  p_creator_id uuid,
  p_participant_ids uuid[],
  p_match_reason text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_participants uuid[];
  new_group_id uuid;
  group_size integer;
  locked_count integer;
  clean_reason text := left(trim(coalesce(p_match_reason, '')), 240);
begin
  select coalesce(array_agg(distinct participant_id), '{}') into clean_participants
  from unnest(coalesce(p_participant_ids, '{}')) as participant_id;

  group_size := cardinality(clean_participants);
  if p_creator_id is null or not (p_creator_id = any(clean_participants)) then
    raise exception 'The creator must be included in the match';
  end if;
  if group_size < 2 or group_size > 6 then
    raise exception 'Matchmade groups must contain between 2 and 6 people';
  end if;

  perform 1
  from public.activity_matchmaking q
  where q.activity_id = p_activity_id
    and q.user_id = any(clean_participants)
    and q.status = 'waiting'
  for update;
  get diagnostics locked_count = row_count;

  if locked_count <> group_size then
    raise exception 'One or more people are no longer available for this match';
  end if;
  if exists (
    select 1
    from public.activity_matchmaking q
    where q.activity_id = p_activity_id
      and q.user_id = any(clean_participants)
      and not (group_size between q.min_group_size and q.max_group_size)
  ) then
    raise exception 'The selected group does not fit everyone''s size preference';
  end if;
  if exists (
    select 1
    from public.group_members m
    join public.groups g on g.id = m.group_id
    where g.activity_id = p_activity_id
      and m.user_id = any(clean_participants)
  ) then
    raise exception 'One or more people already joined a group for this activity';
  end if;

  insert into public.groups (activity_id, created_by, creation_mode, match_reason)
  values (p_activity_id, p_creator_id, 'matchmaking', clean_reason)
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, p_creator_id, 'creator');

  insert into public.group_invites (group_id, inviter_id, invitee_id)
  select new_group_id, p_creator_id, participant_id
  from unnest(clean_participants) as participant_id
  where participant_id <> p_creator_id;

  update public.activity_matchmaking
  set status = 'matched', group_id = new_group_id, match_reason = clean_reason, updated_at = now()
  where activity_id = p_activity_id
    and user_id = any(clean_participants);

  insert into public.messages (group_id, sender_id, author_type, body)
  values (
    new_group_id,
    p_creator_id,
    'muse',
    case when clean_reason = '' then 'Muse found a group with compatible plans and group-size preferences.'
      else 'Muse matched this group: ' || clean_reason end
  );

  return new_group_id;
end;
$$;

revoke all on function public.create_matchmade_activity_group(uuid, uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.create_matchmade_activity_group(uuid, uuid, uuid[], text) to service_role;

create or replace function private.clear_interest_after_group_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  joined_activity_id uuid;
begin
  select activity_id into joined_activity_id
  from public.groups
  where id = new.group_id;

  delete from public.activity_discovery
  where user_id = new.user_id
    and activity_id = joined_activity_id;

  update public.activity_states
  set interested = false, updated_at = now()
  where user_id = new.user_id
    and activity_id = joined_activity_id
    and interested
    and saved;

  delete from public.activity_states
  where user_id = new.user_id
    and activity_id = joined_activity_id
    and not saved;

  update public.activity_matchmaking
  set status = 'cancelled', group_id = null, updated_at = now()
  where user_id = new.user_id
    and activity_id = joined_activity_id
    and status = 'waiting';

  delete from public.group_invites i
  using public.groups g
  where i.group_id = g.id
    and i.invitee_id = new.user_id
    and i.status = 'pending'
    and g.activity_id = joined_activity_id
    and i.group_id <> new.group_id;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_matchmaking'
  ) then
    alter publication supabase_realtime add table public.activity_matchmaking;
  end if;
end;
$$;
