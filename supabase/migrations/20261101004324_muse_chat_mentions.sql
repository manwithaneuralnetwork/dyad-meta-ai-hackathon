alter table public.messages
  add column author_type text not null default 'member'
  check (author_type in ('member', 'muse'));

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and author_type = 'member'
  and (select private.is_group_member(group_id))
);

create table public.muse_request_limits (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.muse_request_limits enable row level security;

revoke all on public.muse_request_limits from public, anon, authenticated;
grant select, insert, update on public.muse_request_limits to service_role;

create or replace function public.claim_muse_group_turn(
  p_group_id uuid,
  p_user_id uuid,
  p_cooldown_seconds integer default 60
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed_at timestamptz;
begin
  if p_cooldown_seconds < 1 or p_cooldown_seconds > 3600 then
    raise exception 'Invalid cooldown';
  end if;

  insert into public.muse_request_limits (group_id, user_id, requested_at)
  values (p_group_id, p_user_id, now())
  on conflict (group_id, user_id) do update
    set requested_at = excluded.requested_at
    where public.muse_request_limits.requested_at
      <= now() - make_interval(secs => p_cooldown_seconds)
  returning requested_at into claimed_at;

  return claimed_at is not null;
end;
$$;

revoke all on function public.claim_muse_group_turn(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_muse_group_turn(uuid, uuid, integer) to service_role;
