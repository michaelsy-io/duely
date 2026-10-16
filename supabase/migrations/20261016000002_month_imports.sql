-- Month imports: the month-end CSV files the Admin uploads on the Import page, one row per
-- month + file (e.g. 2026-10 / ar_aging.csv). The app builds an engine snapshot from these rows
-- with the as-of date set to the month end. A re-import upserts each file; a revert deletes
-- every row of the month. Bundled demo months (2026-08, 2026-09) are never stored here.
--
-- Additive only: creates a new table, touches nothing else. Same demo-open RLS as the core
-- schema (see 20261015000001_duely_core.sql); the Admin-only rule is enforced by the API route
-- (/api/import checks the session role). The app works without this table: imports then live in
-- the server's memory for that instance only ("demo-session import").

create table if not exists public.month_imports (
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  file text not null,
  content text not null,
  rows int not null default 0,
  imported_at timestamptz not null default now(),
  imported_by text,
  primary key (month, file)
);

alter table public.month_imports enable row level security;

create policy "demo select month_imports" on public.month_imports for select to anon, authenticated using (true);
create policy "demo insert month_imports" on public.month_imports for insert to anon, authenticated with check (true);
create policy "demo update month_imports" on public.month_imports for update to anon, authenticated using (true) with check (true);
create policy "demo delete month_imports" on public.month_imports for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.month_imports to anon, authenticated;
