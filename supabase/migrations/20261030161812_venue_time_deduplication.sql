alter table public.activities
drop constraint activities_dedupe_key_key;

create temporary table activity_venue_time_duplicate_map on commit drop as
with keyed as (
  select
    id,
    title,
    created_at,
    to_char(date_trunc('minute', starts_at at time zone 'utc'), 'YYYYMMDDHH24MI') || '|' ||
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(venue_name), '\s*(-|–|—)?\s*(san diego|sd)$', '', 'g'),
          '\s+tavern$',
          '',
          'g'
        ),
        '[^a-z0-9]+',
        '',
        'g'
      ) || '|' ||
      regexp_replace(lower(coalesce(address, '')), '[^a-z0-9]+', '', 'g') || '|' ||
      regexp_replace(lower(coalesce(city, '')), '[^a-z0-9]+', '', 'g') as slot_key
  from public.activities
), ranked as (
  select
    id,
    first_value(id) over (
      partition by slot_key
      order by
        case when title ~* '(add.?on|not an event ticket|parking|vip.*upgrade)' then 1 else 0 end,
        char_length(title) desc,
        created_at,
        id
    ) as keeper_id,
    row_number() over (
      partition by slot_key
      order by
        case when title ~* '(add.?on|not an event ticket|parking|vip.*upgrade)' then 1 else 0 end,
        char_length(title) desc,
        created_at,
        id
    ) as row_number
  from keyed
)
select id as duplicate_id, keeper_id
from ranked
where row_number > 1;

insert into public.activity_states (user_id, activity_id, interested, saved, updated_at)
select
  state.user_id,
  duplicate.keeper_id,
  bool_or(state.interested),
  bool_or(state.saved),
  max(state.updated_at)
from public.activity_states state
join activity_venue_time_duplicate_map duplicate
  on duplicate.duplicate_id = state.activity_id
group by state.user_id, duplicate.keeper_id
on conflict (user_id, activity_id) do update set
  interested = public.activity_states.interested or excluded.interested,
  saved = public.activity_states.saved or excluded.saved,
  updated_at = greatest(public.activity_states.updated_at, excluded.updated_at);

insert into public.activity_discovery (user_id, activity_id, created_at)
select discovery.user_id, duplicate.keeper_id, min(discovery.created_at)
from public.activity_discovery discovery
join activity_venue_time_duplicate_map duplicate
  on duplicate.duplicate_id = discovery.activity_id
group by discovery.user_id, duplicate.keeper_id
on conflict (user_id, activity_id) do nothing;

delete from public.activities activity
using activity_venue_time_duplicate_map duplicate
where activity.id = duplicate.duplicate_id;

update public.activities
set dedupe_key =
  to_char(date_trunc('minute', starts_at at time zone 'utc'), 'YYYYMMDDHH24MI') || '|' ||
  regexp_replace(
    regexp_replace(
      regexp_replace(lower(venue_name), '\s*(-|–|—)?\s*(san diego|sd)$', '', 'g'),
      '\s+tavern$',
      '',
      'g'
    ),
    '[^a-z0-9]+',
    '',
    'g'
  ) || '|' ||
  regexp_replace(lower(coalesce(address, '')), '[^a-z0-9]+', '', 'g') || '|' ||
  regexp_replace(lower(coalesce(city, '')), '[^a-z0-9]+', '', 'g');

alter table public.activities
add constraint activities_dedupe_key_key unique (dedupe_key);
