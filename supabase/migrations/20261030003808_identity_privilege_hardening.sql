revoke insert, update on public.profiles from authenticated;

grant update (
  display_name,
  one_liner,
  bio,
  city,
  avatar_url,
  onboarding_completed,
  updated_at
) on public.profiles to authenticated;
