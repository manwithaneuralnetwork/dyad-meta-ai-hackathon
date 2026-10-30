alter table public.group_members
  add column if not exists last_read_at timestamptz not null default now();

create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_key text not null check (char_length(notification_key) between 1 and 160),
  read_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

alter table public.notification_reads enable row level security;

grant select, insert, update on public.notification_reads to authenticated;
grant update (last_read_at) on public.group_members to authenticated;

create policy "notification_reads_read_own"
on public.notification_reads for select
to authenticated
using (user_id = (select auth.uid()));

create policy "notification_reads_insert_own"
on public.notification_reads for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "notification_reads_update_own"
on public.notification_reads for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "group_members_update_read_state"
on public.group_members for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function private.is_grouped_for_activity(p_user_id uuid, p_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members m
    join public.groups g on g.id = m.group_id
    where m.user_id = p_user_id
      and g.activity_id = p_activity_id
  );
$$;

revoke all on function private.is_grouped_for_activity(uuid, uuid) from public, anon, authenticated;

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

revoke all on function private.clear_interest_after_group_join() from public, anon, authenticated;

drop trigger if exists clear_interest_after_group_join on public.group_members;
create trigger clear_interest_after_group_join
after insert on public.group_members
for each row execute function private.clear_interest_after_group_join();

drop policy if exists "activity_discovery_insert_own" on public.activity_discovery;
create policy "activity_discovery_insert_own"
on public.activity_discovery for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and not private.is_grouped_for_activity(user_id, activity_id)
);

create or replace function public.set_my_activity_state(
  p_activity_id uuid,
  p_interested boolean,
  p_saved boolean,
  p_discoverable boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  grouped boolean;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  grouped := private.is_grouped_for_activity(caller_id, p_activity_id);
  if grouped then
    p_interested := false;
    p_discoverable := false;
  end if;

  if p_discoverable and not p_interested then
    raise exception 'Discoverable activities must also be marked interested';
  end if;

  if p_interested or p_saved then
    insert into public.activity_states (user_id, activity_id, interested, saved)
    values (caller_id, p_activity_id, p_interested, p_saved)
    on conflict (user_id, activity_id) do update set
      interested = excluded.interested,
      saved = excluded.saved,
      updated_at = now();
  else
    delete from public.activity_states
    where user_id = caller_id
      and activity_id = p_activity_id;
  end if;

  if p_discoverable then
    insert into public.activity_discovery (user_id, activity_id)
    values (caller_id, p_activity_id)
    on conflict (user_id, activity_id) do nothing;
  else
    delete from public.activity_discovery
    where user_id = caller_id
      and activity_id = p_activity_id;
  end if;
end;
$$;

revoke all on function public.set_my_activity_state(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_my_activity_state(uuid, boolean, boolean, boolean) to authenticated;

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
    raise exception 'Choose between 1 and 10 people';
  end if;

  if not exists (
    select 1 from public.activity_discovery
    where activity_id = p_activity_id and user_id = caller_id
  ) then
    raise exception 'Choose Find company before creating a group';
  end if;

  if (
    select count(*) from public.activity_discovery
    where activity_id = p_activity_id and user_id = any(clean_invitees)
  ) <> cardinality(clean_invitees)
  or exists (
    select 1 from unnest(clean_invitees) invitee_id
    where private.is_grouped_for_activity(invitee_id, p_activity_id)
  ) then
    raise exception 'Every invitee must still be looking for company for this activity';
  end if;

  insert into public.groups (activity_id, created_by)
  values (p_activity_id, caller_id)
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

  if cardinality(clean_invitees) < 1 then raise exception 'Choose at least one new person'; end if;

  if (
    select count(*) from public.activity_discovery
    where activity_discovery.activity_id = group_activity_id
      and user_id = any(clean_invitees)
  ) <> cardinality(clean_invitees)
  or exists (
    select 1 from unnest(clean_invitees) invitee_id
    where private.is_grouped_for_activity(invitee_id, group_activity_id)
  ) then
    raise exception 'Every invitee must still be looking for company for this activity';
  end if;

  select
    (select count(*) from public.group_members where group_id = p_group_id)
    + (select count(*) from public.group_invites where group_id = p_group_id and status = 'pending')
  into active_count;

  if active_count + cardinality(clean_invitees) > 11 then
    raise exception 'Groups can include you and up to 10 invited people';
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

create or replace function public.respond_to_group_invite(p_group_id uuid, p_response text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  invite_activity_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_response not in ('accepted', 'declined') then raise exception 'Invalid invitation response'; end if;

  select activity_id into invite_activity_id from public.groups where id = p_group_id;
  if p_response = 'accepted' and private.is_grouped_for_activity(caller_id, invite_activity_id) then
    raise exception 'You are already in a group for this activity';
  end if;

  update public.group_invites
  set status = p_response, responded_at = now()
  where group_id = p_group_id
    and invitee_id = caller_id
    and status = 'pending';

  if not found then raise exception 'Pending invitation not found'; end if;

  if p_response = 'accepted' then
    insert into public.group_members (group_id, user_id, role)
    values (p_group_id, caller_id, 'member');
  end if;
end;
$$;

revoke all on function public.create_activity_group(uuid, uuid[]) from public, anon;
grant execute on function public.create_activity_group(uuid, uuid[]) to authenticated;
revoke all on function public.invite_more_to_group(uuid, uuid[]) from public, anon;
grant execute on function public.invite_more_to_group(uuid, uuid[]) to authenticated;
revoke all on function public.respond_to_group_invite(uuid, text) from public, anon;
grant execute on function public.respond_to_group_invite(uuid, text) to authenticated;

delete from public.activity_discovery d
using public.group_members m, public.groups g
where m.group_id = g.id
  and d.user_id = m.user_id
  and d.activity_id = g.activity_id;

update public.activity_states s
set interested = false, updated_at = now()
from public.group_members m
join public.groups g on g.id = m.group_id
where s.user_id = m.user_id
  and s.activity_id = g.activity_id
  and s.interested
  and s.saved;

delete from public.activity_states s
using public.group_members m, public.groups g
where m.group_id = g.id
  and s.user_id = m.user_id
  and s.activity_id = g.activity_id
  and not s.saved;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_members'
  ) then
    alter publication supabase_realtime add table public.group_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_invites'
  ) then
    alter publication supabase_realtime add table public.group_invites;
  end if;
end;
$$;
