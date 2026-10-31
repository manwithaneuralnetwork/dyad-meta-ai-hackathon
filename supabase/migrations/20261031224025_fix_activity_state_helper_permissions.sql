-- Public security-invoker RPCs and RLS policies call this private helper as
-- the authenticated database role. The private schema is not exposed through
-- the Data API, but Postgres still requires an explicit EXECUTE grant.
grant execute on function private.is_grouped_for_activity(uuid, uuid) to authenticated;
