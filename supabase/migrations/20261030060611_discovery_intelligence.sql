create table public.interest_tags (
  label text primary key check (char_length(label) between 1 and 60 and label = trim(label)),
  is_core boolean not null default false,
  source text not null default 'system' check (source in ('system', 'ai')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index interest_tags_label_lower_idx
on public.interest_tags (lower(label));

alter table public.interest_tags enable row level security;
revoke all on public.interest_tags from anon, authenticated;
grant select on public.interest_tags to anon, authenticated;
grant select, insert, update on public.interest_tags to service_role;

create policy "interest_tags_read_active"
on public.interest_tags for select
to anon, authenticated
using (active);

insert into public.interest_tags (label, is_core, source)
values
  ('Live music', true, 'system'),
  ('Coffee', true, 'system'),
  ('City walks', true, 'system'),
  ('Museums', true, 'system'),
  ('Trying new food', true, 'system'),
  ('Creative workshops', true, 'system'),
  ('Outdoor movies', true, 'system'),
  ('Book clubs', true, 'system'),
  ('Casual sports', true, 'system'),
  ('Volunteering', true, 'system'),
  ('Photography', true, 'system'),
  ('Game nights', true, 'system'),
  ('Nightlife', true, 'system'),
  ('Comedy', true, 'system'),
  ('Theatre', true, 'system'),
  ('Movies', true, 'system'),
  ('Art & galleries', true, 'system'),
  ('Fitness', true, 'system'),
  ('Outdoors', true, 'system'),
  ('Hiking', true, 'system'),
  ('Food & drink', true, 'system'),
  ('Markets', true, 'system'),
  ('Learning', true, 'system'),
  ('Community', true, 'system'),
  ('Dancing', true, 'system'),
  ('Wellness', true, 'system'),
  ('Technology', true, 'system'),
  ('Family activities', true, 'system'),
  ('Festivals', true, 'system'),
  ('Networking', true, 'system');

alter table public.profiles
add column age smallint check (age between 18 and 120);

grant update (age) on public.profiles to authenticated;

alter table public.profile_interests
add constraint profile_interests_interest_fkey
foreign key (interest) references public.interest_tags(label)
on update cascade;

create or replace function public.replace_my_interests(p_interests text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  interest_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select count(distinct interest)::integer
  into interest_count
  from unnest(p_interests) as interest;

  if interest_count < 5 or interest_count > 30 then
    raise exception 'Choose between 5 and 30 interests';
  end if;

  if exists (
    select 1
    from unnest(p_interests) as selected(interest)
    left join public.interest_tags tags
      on tags.label = trim(selected.interest) and tags.active
    where tags.label is null
  ) then
    raise exception 'One or more interests are unavailable';
  end if;

  delete from public.profile_interests
  where user_id = (select auth.uid());

  insert into public.profile_interests (user_id, interest)
  select (select auth.uid()), trim(interest)
  from unnest(p_interests) as interest
  group by trim(interest);
end;
$$;

revoke all on function public.replace_my_interests(text[]) from public, anon;
grant execute on function public.replace_my_interests(text[]) to authenticated;

create or replace function public.set_my_profile_details(
  p_display_name text,
  p_age integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(p_display_name)) < 2 or char_length(trim(p_display_name)) > 80 then
    raise exception 'Preferred name must be between 2 and 80 characters';
  end if;

  if p_age < 18 or p_age > 120 then
    raise exception 'Age must be between 18 and 120';
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      age = p_age,
      updated_at = now()
  where id = (select auth.uid());
end;
$$;

revoke all on function public.set_my_profile_details(text, integer) from public, anon;
grant execute on function public.set_my_profile_details(text, integer) to authenticated;

alter table public.activities
add column dedupe_key text;

update public.activities
set dedupe_key =
  lower(regexp_replace(title, '[^a-z0-9]+', '', 'g')) || '|' ||
  to_char(date_trunc('minute', starts_at at time zone 'utc'), 'YYYYMMDDHH24MI') || '|' ||
  lower(regexp_replace(coalesce(city, ''), '[^a-z0-9]+', '', 'g'));

create temporary table activity_duplicate_map on commit drop as
with ranked as (
  select
    id,
    first_value(id) over (
      partition by dedupe_key
      order by created_at, id
    ) as keeper_id,
    row_number() over (
      partition by dedupe_key
      order by created_at, id
    ) as row_number
  from public.activities
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
join activity_duplicate_map duplicate
  on duplicate.duplicate_id = state.activity_id
group by state.user_id, duplicate.keeper_id
on conflict (user_id, activity_id) do update set
  interested = public.activity_states.interested or excluded.interested,
  saved = public.activity_states.saved or excluded.saved,
  updated_at = greatest(public.activity_states.updated_at, excluded.updated_at);

insert into public.activity_discovery (user_id, activity_id, created_at)
select discovery.user_id, duplicate.keeper_id, min(discovery.created_at)
from public.activity_discovery discovery
join activity_duplicate_map duplicate
  on duplicate.duplicate_id = discovery.activity_id
group by discovery.user_id, duplicate.keeper_id
on conflict (user_id, activity_id) do nothing;

delete from public.activities activity
using activity_duplicate_map duplicate
where activity.id = duplicate.duplicate_id;

alter table public.activities
alter column dedupe_key set not null;

alter table public.activities
add constraint activities_dedupe_key_key unique (dedupe_key);

create index activities_topics_gin_idx
on public.activities using gin (topics);
