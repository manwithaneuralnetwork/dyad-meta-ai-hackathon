create table public.groups (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('creator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (group_id, invitee_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index groups_activity_id_idx on public.groups (activity_id);
create index groups_last_message_at_idx on public.groups (last_message_at desc);
create index group_members_user_id_idx on public.group_members (user_id, joined_at desc);
create index group_invites_invitee_id_idx on public.group_invites (invitee_id, status, created_at desc);
create index messages_group_created_at_idx on public.messages (group_id, created_at);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.messages enable row level security;

revoke all on public.groups from anon, authenticated;
revoke all on public.group_members from anon, authenticated;
revoke all on public.group_invites from anon, authenticated;
revoke all on public.messages from anon, authenticated;

grant select, insert, update on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert, update on public.group_invites to authenticated;
grant select, insert on public.messages to authenticated;

grant usage on schema private to authenticated;

create or replace function private.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_access_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.group_members
      where group_id = p_group_id and user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.group_invites
      where group_id = p_group_id
        and invitee_id = (select auth.uid())
        and status = 'pending'
    )
  );
$$;

revoke all on function private.is_group_member(uuid) from public, anon;
revoke all on function private.can_access_group(uuid) from public, anon;
grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.can_access_group(uuid) to authenticated;

create policy "groups_read_participant"
on public.groups for select
to authenticated
using ((select private.can_access_group(id)));

create policy "groups_insert_creator"
on public.groups for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy "groups_update_member"
on public.groups for update
to authenticated
using ((select private.is_group_member(id)))
with check ((select private.is_group_member(id)));

create policy "group_members_read_participant"
on public.group_members for select
to authenticated
using ((select private.can_access_group(group_id)));

create policy "group_members_insert_creator"
on public.group_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.groups
    where id = group_id and created_by = (select auth.uid())
  )
);

create policy "group_members_delete_own"
on public.group_members for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "group_invites_read_participant"
on public.group_invites for select
to authenticated
using (invitee_id = (select auth.uid()) or (select private.is_group_member(group_id)));

create policy "messages_read_member"
on public.messages for select
to authenticated
using ((select private.is_group_member(group_id)));

create policy "messages_insert_member"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and (select private.is_group_member(group_id))
);

create or replace function public.create_activity_group(
  p_activity_id uuid,
  p_invitee_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_invitees uuid[];
  new_group_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;

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
  ) <> cardinality(clean_invitees) then
    raise exception 'Every invitee must be looking for company for this activity';
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

create or replace function public.respond_to_group_invite(
  p_group_id uuid,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_response not in ('accepted', 'declined') then raise exception 'Invalid invitation response'; end if;

  update public.group_invites
  set status = p_response, responded_at = now()
  where group_id = p_group_id
    and invitee_id = caller_id
    and status = 'pending';

  if not found then raise exception 'Pending invitation not found'; end if;

  if p_response = 'accepted' then
    insert into public.group_members (group_id, user_id, role)
    values (p_group_id, caller_id, 'member')
    on conflict (group_id, user_id) do nothing;
  end if;
end;
$$;

create or replace function private.touch_group_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.groups
  set last_message_at = new.created_at, updated_at = now()
  where id = new.group_id;
  return new;
end;
$$;

revoke all on function public.create_activity_group(uuid, uuid[]) from public, anon;
revoke all on function public.respond_to_group_invite(uuid, text) from public, anon;
grant execute on function public.create_activity_group(uuid, uuid[]) to authenticated;
grant execute on function public.respond_to_group_invite(uuid, text) to authenticated;
revoke all on function private.touch_group_after_message() from public, anon, authenticated;

create trigger messages_touch_group
after insert on public.messages
for each row execute procedure private.touch_group_after_message();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
