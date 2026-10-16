-- Escalation decisions: a supervisor / CFO / admin approves or dismisses an escalation the
-- rules engine recommended (credit hold, visit, credit-limit review). One row per client per
-- period; a later decision replaces the earlier one ("open" means it was reopened).
--
-- Additive only: creates a new table, touches nothing else. Same demo-open RLS as the core
-- schema (see 20261015000001_duely_core.sql). The app works without this table: decisions
-- then live in a cookie in the deciding browser only.

create table if not exists public.escalation_decisions (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  client_code text not null,
  action text,
  decision text not null check (decision in ('approved', 'dismissed', 'open')),
  decided_by text,
  decided_role text,
  decided_at timestamptz not null default now(),
  unique (period, client_code)
);
create index if not exists escalation_decisions_period_idx on public.escalation_decisions (period);

alter table public.escalation_decisions enable row level security;

create policy "demo select escalation_decisions" on public.escalation_decisions for select to anon, authenticated using (true);
create policy "demo insert escalation_decisions" on public.escalation_decisions for insert to anon, authenticated with check (true);
create policy "demo update escalation_decisions" on public.escalation_decisions for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.escalation_decisions to anon, authenticated;
