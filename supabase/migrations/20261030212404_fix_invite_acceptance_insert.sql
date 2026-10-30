create or replace function public.respond_to_group_invite(
  p_group_id uuid,
  p_response text
)
returns void
language plpgsql
security invoker
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
    values (p_group_id, caller_id, 'member');
  end if;
end;
$$;
