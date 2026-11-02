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
      and not (group_size = any(q.accepted_group_sizes))
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

  -- A match is provisional until somebody accepts. Every selected person,
  -- including the requester who completed the pool, receives the same choice.
  insert into public.group_invites (group_id, inviter_id, invitee_id)
  select new_group_id, p_creator_id, participant_id
  from unnest(clean_participants) as participant_id;

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
