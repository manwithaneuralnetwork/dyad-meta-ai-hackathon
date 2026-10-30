create or replace function private.has_accepted_group_invite(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.group_invites
    where group_id = p_group_id
      and invitee_id = (select auth.uid())
      and status = 'accepted'
  );
$$;

create or replace function private.is_group_creator(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.groups
    where id = p_group_id and created_by = (select auth.uid())
  );
$$;

create or replace function private.can_scrap_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.groups
      where id = p_group_id and created_by = (select auth.uid())
    )
    and exists (
      select 1 from public.group_invites where group_id = p_group_id
    )
    and not exists (
      select 1
      from public.group_invites
      where group_id = p_group_id and status <> 'declined'
    )
    and not exists (
      select 1
      from public.group_members
      where group_id = p_group_id and user_id <> (select auth.uid())
    );
$$;

revoke all on function private.has_accepted_group_invite(uuid) from public, anon;
revoke all on function private.is_group_creator(uuid) from public, anon;
revoke all on function private.can_scrap_group(uuid) from public, anon;
grant execute on function private.has_accepted_group_invite(uuid) to authenticated;
grant execute on function private.is_group_creator(uuid) to authenticated;
grant execute on function private.can_scrap_group(uuid) to authenticated;

drop policy "group_members_insert_authorized" on public.group_members;
create policy "group_members_insert_authorized"
on public.group_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (select private.is_group_creator(group_id))
    or (select private.has_accepted_group_invite(group_id))
  )
);

grant delete on public.groups to authenticated;

create policy "groups_delete_all_declined_creator"
on public.groups for delete
to authenticated
using ((select private.can_scrap_group(id)));
