-- Duely core schema: drafts, contact logs, notifications, RAG knowledge base.
--
-- DEMO SECURITY NOTE: this is a class demo with fictional data and no real auth yet.
-- RLS is enabled on every table, but policies deliberately allow the `anon` and
-- `authenticated` roles to select/insert/update drafts, contact_logs and notifications,
-- and to select/insert/delete kb_chunks (so the demo seed can run with the anon key).
-- Tighten these to auth.uid()/role-based policies before any real data is stored.

create extension if not exists vector with schema extensions;

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  period text,
  client_code text,
  tone text check (tone in ('friendly','firm','final')),
  channel text,
  subject text,
  body text,
  review jsonb,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','needs_edit','held')),
  needs_top_mgmt boolean not null default false,
  approved_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists drafts_period_idx on public.drafts (period);
create index if not exists drafts_client_idx on public.drafts (client_code);

create table if not exists public.contact_logs (
  id uuid primary key default gen_random_uuid(),
  period text,
  client_code text,
  channel text,
  outcome text,
  promise_amount numeric(14,2),
  promise_date date,
  note text,
  logged_by text,
  created_at timestamptz not null default now()
);
create index if not exists contact_logs_client_idx on public.contact_logs (client_code, period);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  role text,
  title text,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_role_idx on public.notifications (role, created_at desc);

create table if not exists public.kb_chunks (
  id bigserial primary key,
  source text,
  ref text,
  period text,
  content text,
  embedding extensions.vector(384),
  created_at timestamptz not null default now()
);
create index if not exists kb_chunks_embedding_idx
  on public.kb_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists kb_chunks_period_idx on public.kb_chunks (period);

create or replace function public.match_kb(
  query_embedding extensions.vector(384),
  match_count int,
  filter_period text default null
)
returns table (id bigint, source text, ref text, content text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select k.id, k.source, k.ref, k.content,
         1 - (k.embedding <=> query_embedding) as similarity
  from public.kb_chunks k
  where k.embedding is not null
    and (filter_period is null or k.period = filter_period or k.period is null)
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.drafts enable row level security;
alter table public.contact_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.kb_chunks enable row level security;

-- Demo-open policies (see note at top).
create policy "demo select drafts" on public.drafts for select to anon, authenticated using (true);
create policy "demo insert drafts" on public.drafts for insert to anon, authenticated with check (true);
create policy "demo update drafts" on public.drafts for update to anon, authenticated using (true) with check (true);

create policy "demo select contact_logs" on public.contact_logs for select to anon, authenticated using (true);
create policy "demo insert contact_logs" on public.contact_logs for insert to anon, authenticated with check (true);
create policy "demo update contact_logs" on public.contact_logs for update to anon, authenticated using (true) with check (true);

create policy "demo select notifications" on public.notifications for select to anon, authenticated using (true);
create policy "demo insert notifications" on public.notifications for insert to anon, authenticated with check (true);
create policy "demo update notifications" on public.notifications for update to anon, authenticated using (true) with check (true);

create policy "demo select kb_chunks" on public.kb_chunks for select to anon, authenticated using (true);
create policy "demo insert kb_chunks" on public.kb_chunks for insert to anon, authenticated with check (true);
create policy "demo delete kb_chunks" on public.kb_chunks for delete to anon, authenticated using (true);

grant select, insert, update on public.drafts, public.contact_logs, public.notifications to anon, authenticated;
grant select, insert, delete on public.kb_chunks to anon, authenticated;
grant usage, select on sequence public.kb_chunks_id_seq to anon, authenticated;
grant execute on function public.match_kb(extensions.vector, int, text) to anon, authenticated;
