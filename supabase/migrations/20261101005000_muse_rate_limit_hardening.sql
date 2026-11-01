create policy "Muse rate limits stay server-only"
on public.muse_request_limits
for all
to authenticated
using (false)
with check (false);

create index muse_request_limits_user_id_idx
on public.muse_request_limits (user_id);
