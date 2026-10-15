-- One-off cleanup (run manually in the SQL editor). The KB was seeded from the
-- sandbox via temporary staging objects + pg_net because the sandbox could not
-- reach *.supabase.co directly. These are RLS-locked and revoked from anon, but
-- are no longer needed.
delete from public.kb_chunks where source = 'test';
drop view if exists public._kb_all;
drop function if exists public._kb_fire(int, int);
drop function if exists public._kb_apply();
drop table if exists public._kb_names, public._kb_cust, public._kb_act, public._kb_pdc, public._kb_txt, public._kb_jobs;
-- pg_net was enabled only for the seed; optional:
-- drop extension if exists pg_net;
