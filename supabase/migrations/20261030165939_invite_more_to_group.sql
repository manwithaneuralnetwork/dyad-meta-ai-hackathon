drop policy "group_invites_insert_creator" on public.group_invites;
create policy "group_invites_insert_member"
on public.group_invites for insert
to authenticated
with check (
  inviter_id = (select auth.uid())
  and (select private.is_group_member(group_id))
  and exists (
    select 1
    from public.groups g
    join public.activity_discovery d on d.activity_id = g.activity_id
    where g.id = group_id and d.user_id = invitee_id
  )
);

create or replace function public.invite_more_to_group(
  p_group_id uuid,
  p_invitee_ids uuid[]
)
returns integer
language plpgsql
security invoker
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
  ) <> cardinality(clean_invitees) then
    raise exception 'Every invitee must be looking for company for this activity';
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

revoke all on function public.invite_more_to_group(uuid, uuid[]) from public, anon;
grant execute on function public.invite_more_to_group(uuid, uuid[]) to authenticated;
