update public.activity_states
set interested = interested or saved,
    saved = false,
    updated_at = now()
where saved;

delete from public.activity_discovery;

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
  p_interested := coalesce(p_interested, false) or coalesce(p_saved, false);

  if grouped then
    p_interested := false;
  end if;

  if p_interested then
    insert into public.activity_states (user_id, activity_id, interested, saved)
    values (caller_id, p_activity_id, true, false)
    on conflict (user_id, activity_id) do update set
      interested = true,
      saved = false,
      updated_at = now();
  else
    delete from public.activity_states
    where user_id = caller_id
      and activity_id = p_activity_id;
  end if;

  delete from public.activity_discovery
  where user_id = caller_id
    and activity_id = p_activity_id;
end;
$$;

revoke all on function public.set_my_activity_state(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_my_activity_state(uuid, boolean, boolean, boolean) to authenticated;
