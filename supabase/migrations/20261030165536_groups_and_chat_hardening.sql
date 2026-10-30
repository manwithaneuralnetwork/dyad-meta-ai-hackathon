create index groups_created_by_idx on public.groups (created_by);
create index group_invites_inviter_id_idx on public.group_invites (inviter_id);
create index messages_sender_id_idx on public.messages (sender_id);

drop policy "groups_read_participant" on public.groups;
create policy "groups_read_participant"
on public.groups for select
to authenticated
using (created_by = (select auth.uid()) or (select private.can_access_group(id)));

drop policy "group_members_insert_creator" on public.group_members;
create policy "group_members_insert_authorized"
on public.group_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.groups
      where id = group_id and created_by = (select auth.uid())
    )
    or exists (
      select 1 from public.group_invites
      where group_id = group_members.group_id
        and invitee_id = (select auth.uid())
        and status = 'accepted'
    )
  )
);

create policy "group_invites_insert_creator"
on public.group_invites for insert
to authenticated
with check (
  inviter_id = (select auth.uid())
  and exists (
    select 1 from public.groups
    where id = group_id and created_by = (select auth.uid())
  )
  and exists (
    select 1
    from public.groups g
    join public.activity_discovery d on d.activity_id = g.activity_id
    where g.id = group_id and d.user_id = invitee_id
  )
);

create policy "group_invites_update_invitee"
on public.group_invites for update
to authenticated
using (invitee_id = (select auth.uid()) and status = 'pending')
with check (invitee_id = (select auth.uid()) and status in ('accepted', 'declined'));

alter function public.create_activity_group(uuid, uuid[]) security invoker;
alter function public.respond_to_group_invite(uuid, text) security invoker;
