-- Production event ingestion is handled by sync-ticketmaster. This local seed is intentionally small.
insert into public.activities (
  id, source_type, source_name, title, description, image_url, venue_name, neighborhood,
  location, starts_at, price_band, price_label, capacity, state, source_payload
) values
  (
    '10000000-0000-4000-8000-000000000001', 'community', 'Community',
    'North Park vintage market loop',
    'Meet for coffee, browse the vintage market together, and vote on the best under-$20 find.',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85',
    'North Park Mini Park', 'North Park',
    extensions.st_point(-117.1295, 32.7476)::extensions.geography,
    now() + interval '4 days', 'free', 'Free', 5, 'published', '{}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'community', 'Community',
    'Sunset walk at Torrey Pines',
    'A moderate out-and-back walk timed for sunset at a public state reserve.',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
    'Torrey Pines State Reserve', 'Torrey Pines',
    extensions.st_point(-117.2533, 32.9212)::extensions.geography,
    now() + interval '6 days', 'free', 'Free + parking', 6, 'published', '{}'::jsonb
  )
on conflict (id) do nothing;

insert into public.event_semantic_profiles (
  activity_id, categories, vibes, social_modes, energy, likely_noise, setting,
  interaction_potential, concise_summary, suggested_group_min, suggested_group_max, confidence, model_name
) values
  (
    '10000000-0000-4000-8000-000000000001',
    '[{"category":"thrifting","weight":1},{"category":"community","weight":0.45}]'::jsonb,
    array['relaxed','creative','social'], array['exploring','participating'], 'low', 'low', 'outdoor', 'high',
    'A casual, inexpensive wander with an easy shared challenge.', 3, 5, 0.91, 'seed'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '[{"category":"outdoors","weight":1},{"category":"wellness","weight":0.35}]'::jsonb,
    array['relaxed','social'], array['participating','exploring'], 'medium', 'low', 'outdoor', 'high',
    'A scenic group walk where conversation can develop naturally.', 3, 6, 0.94, 'seed'
  )
on conflict (activity_id) do nothing;
