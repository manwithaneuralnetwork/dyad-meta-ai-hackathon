create policy "No direct demo session access"
on public.demo_sessions
for all
to anon, authenticated
using (false)
with check (false);
