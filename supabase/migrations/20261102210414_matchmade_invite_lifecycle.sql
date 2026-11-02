drop policy if exists "groups_read_participant" on public.groups;
create policy "groups_read_participant"
on public.groups for select
to authenticated
using (
  (creation_mode = 'manual' and created_by = (select auth.uid()))
  or (select private.can_access_group(id))
);

create or replace function private.cleanup_declined_matchmade_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.group_invites
    where group_id = p_group_id and invitee_id = caller_id and status = 'declined'
  ) then
    raise exception 'A declined invitation is required';
  end if;
  if not exists (
    select 1 from public.groups where id = p_group_id and creation_mode = 'matchmaking'
  ) or exists (
    select 1 from public.group_invites
    where group_id = p_group_id and status in ('pending', 'accepted')
  ) then
    return;
  end if;

  update public.activity_matchmaking
  set status = 'cancelled', group_id = null, updated_at = now()
  where group_id = p_group_id;

  delete from public.groups where id = p_group_id;
end;
$$;

revoke all on function private.cleanup_declined_matchmade_group(uuid) from public, anon;
grant execute on function private.cleanup_declined_matchmade_group(uuid) to authenticated;

create or replace function public.respond_to_group_invite(p_group_id uuid, p_response text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  invite_activity_id uuid;
  is_matchmade boolean := false;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_response not in ('accepted', 'declined') then raise exception 'Invalid invitation response'; end if;

  select g.activity_id, g.creation_mode = 'matchmaking'
  into invite_activity_id, is_matchmade
  from public.groups g
  where g.id = p_group_id;

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
  elsif is_matchmade then
    perform private.cleanup_declined_matchmade_group(p_group_id);
  end if;
end;
$$;

revoke all on function public.respond_to_group_invite(uuid, text) from public, anon;
grant execute on function public.respond_to_group_invite(uuid, text) to authenticated;
