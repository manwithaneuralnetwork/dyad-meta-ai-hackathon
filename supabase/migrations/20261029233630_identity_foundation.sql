create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  one_liner text not null default '' check (char_length(one_liner) <= 120),
  bio text not null default '' check (char_length(bio) <= 600),
  city text not null default 'San Diego, CA' check (char_length(city) <= 120),
  avatar_url text,
  attended_count integer not null default 0 check (attended_count >= 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  interest text not null check (char_length(interest) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (user_id, interest)
);

create table public.user_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  source text not null check (source in ('gps', 'address')),
  latitude double precision,
  longitude double precision,
  address text,
  search_radius_miles integer not null default 15 check (search_radius_miles between 1 and 100),
  updated_at timestamptz not null default now(),
  check (
    (source = 'gps' and latitude between -90 and 90 and longitude between -180 and 180)
    or
    (source = 'address' and nullif(trim(address), '') is not null)
  )
);

create index profiles_display_name_idx on public.profiles (lower(display_name));
create index profile_interests_interest_idx on public.profile_interests (interest);

alter table public.profiles enable row level security;
alter table public.profile_interests enable row level security;
alter table public.user_locations enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;
grant select, insert, update, delete on public.user_locations to authenticated;

create policy "profiles_read_authenticated"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "profile_interests_read_authenticated"
on public.profile_interests for select
to authenticated
using (true);

create policy "profile_interests_insert_own"
on public.profile_interests for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profile_interests_delete_own"
on public.profile_interests for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_locations_read_own"
on public.user_locations for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_locations_insert_own"
on public.user_locations for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_locations_update_own"
on public.user_locations for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_locations_delete_own"
on public.user_locations for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.replace_my_interests(p_interests text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(array_length(p_interests, 1), 0) < 5 or array_length(p_interests, 1) > 20 then
    raise exception 'Choose between 5 and 20 interests';
  end if;

  delete from public.profile_interests
  where user_id = (select auth.uid());

  insert into public.profile_interests (user_id, interest)
  select (select auth.uid()), trim(interest)
  from unnest(p_interests) as interest;
end;
$$;

revoke all on function public.replace_my_interests(text[]) from public, anon;
grant execute on function public.replace_my_interests(text[]) to authenticated;

create or replace function public.complete_my_onboarding(
  p_source text,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_address text default null,
  p_search_radius_miles integer default 15
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

  insert into public.user_locations (
    user_id,
    source,
    latitude,
    longitude,
    address,
    search_radius_miles
  ) values (
    (select auth.uid()),
    p_source,
    p_latitude,
    p_longitude,
    nullif(trim(p_address), ''),
    p_search_radius_miles
  )
  on conflict (user_id) do update set
    source = excluded.source,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    address = excluded.address,
    search_radius_miles = excluded.search_radius_miles,
    updated_at = now();

  update public.profiles
  set onboarding_completed = true,
      updated_at = now()
  where id = (select auth.uid());
end;
$$;

revoke all on function public.complete_my_onboarding(text, double precision, double precision, text, integer) from public, anon;
grant execute on function public.complete_my_onboarding(text, double precision, double precision, text, integer) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'New member'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();
