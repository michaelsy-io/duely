# Duely: project overview

Read this first if you are a teammate (or a teammate's Claude) picking up the project. It explains what Duely is, how it was built and in what order, what data it uses, how that data is handled, and how to run, test and deploy it. The rules in [`CLAUDE.md`](../CLAUDE.md) still apply and win over anything here.

## 1. What Duely is

Duely is an accounts-receivable (AR) collections app built for the AIM iMBA *AI Tools* final project. It is modelled on an **ophthalmic medical distributor** that sells on credit to clinics, optical shops and surgical centres, and wants to cut bad debt.

Each month it takes the company's AR exports and:

- works out the KPIs (DSO, % over 60/90 days, collection efficiency, at-risk balance, bad-debt allowance);
- ranks which clients to chase today, with the reasons and points behind each rank;
- tracks post-dated checks (PDCs), bounced checks, promises to pay and disputes;
- recommends escalations (credit hold, visit, credit-limit review) and raises control flags;
- lets AI draft reminders and explain the numbers, with a supervisor approving every message before it could go out.

The course asks us to show: Claude setup, RAG, MCP, n8n, a Vercel deployment and agent orchestration. Section 6 maps each one to the code.

**Team inputs.** Kopi supplied the synthetic data, the business rules and the answer key. Jay (Mrityunjay) wrote the engine developer brief. Rie wrote the collections brief, the workbook and the three reminder tones (friendly, firm, final).

## 2. The core rule: code does the maths, AI does the words

Every number in the app comes from a deterministic TypeScript engine (`lib/engine`). AI never calculates anything. It only explains, summarises and drafts, and its text is checked:

- `lib/ai/verify.ts` (`verifyNumbers`) rejects any AI text that mentions an amount, date or document number that is not in the engine output it was given.
- Drafts get one retry with feedback; if they still fail, the app falls back to an engine-filled template.
- Nothing is sent to a client. Drafts go to **Approvals**; a supervisor must approve, and a **final notice** also needs top management (CFO/Admin).
- The app works fully without an AI key: chat answers from engine data and drafts use templates.

## 3. How it was built, step by step

| Step | What happened | Commit |
|---|---|---|
| 0 | Reviewed the groupmates' briefs, data and answer key; agreed on a simplified scope: Kopi's data and rules, Rie's tones, one Next.js app on Vercel + Supabase. Plans live in the shared project folder (`plan/product-and-architecture-plan.md`, `plan/specs/2026-10-15-duely-core-design.md`). | n/a |
| 1 | Picked the name **Duely** from 50 candidates. Design: a regal-purple three.js landing page, and an app UI inspired by the Wise mobile app in our brand colours. | n/a |
| 2 | Scaffolded the Next.js app, copied the demo data into `data/demo`, wrote `CLAUDE.md`. | `b985107` |
| 3 | Ported Kopi's Python reference (`compute_reference.py`) to TypeScript. It matches `expected_P1.md` and `expected_P2.md` exactly; this needed pandas-style summation order, half-even rounding and pandas' sort behaviour copied faithfully. | `9e264b6` |
| 4 | Built the rest in parallel: 10 themeable screens, Supabase schema + knowledge base, AI agents, chat, MCP server and n8n hooks. Integrated, tested, built. | `ecb4e78` |
| 5 | Fixed the Vercel deploy: allowed legacy peer deps (`.npmrc`), pinned build settings (`vercel.json`, Node 22), and upgraded Next.js to 15.5.28 because Vercel blocks the vulnerable 15.5.4. | `17535aa`, `8409c17`, `ab81d24` |
| 6 | Made the Today headline use the same company-wide overdue figure as the CFO page for non-collector roles. | `15c0392` |

## 4. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5.28 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, theme tokens as CSS variables (`lib/themes`) |
| Charts / 3D | Recharts; three.js for the landing hero |
| Data parsing | papaparse (CSV), xlsx (Excel import wizard) |
| Database | Supabase Postgres with pgvector, RLS on every table |
| Embeddings | Supabase edge function `embed` (gte-small, 384 dimensions) |
| AI | Vercel AI SDK 5 with `@ai-sdk/openai` and `@ai-sdk/anthropic`. OpenAI: `gpt-5` / `gpt-5-mini`; Anthropic: `claude-sonnet-5-5` / `claude-haiku-5-5` |
| MCP | `@modelcontextprotocol/sdk` (web-standard transport) at `/api/mcp/mcp` |
| Automation | n8n workflows calling `/api/hooks/*` |
| Tests | Vitest (42 tests) |
| Hosting | Vercel, auto-deploys on every push to `main` |

Install with `npm install` (the `.npmrc` sets `legacy-peer-deps`, needed by the AI SDK's React peer range).

## 5. The data

All data is **synthetic**. No real company, client or person is in this repo.

### 5.1 Demo periods (`data/demo`)

Two month-end snapshots, each with the same 13 CSV exports:

- **P1 = 31 Aug 2026**, the routine month.
- **P2 = 30 Sep 2026**, the messy month (more bounced checks, broken promises, a ledger gap). P2 uses P1 as its previous month for comparisons.

| File | Rows (P2) | What it holds |
|---|---|---|
| `customers.csv` | 60 | client code, segment, area, rep, collector, terms, credit limit, usual payment method |
| `ar_aging.csv` | 392 | open invoices with balance, days overdue and bucket |
| `sales_invoices.csv` | 1,768 | invoice history with gross, discount, net |
| `payments.csv` | 1,720 | payments and how they were applied |
| `pdc_register.csv` | 446 | post-dated checks: on hand, deposited, cleared, bounced |
| `bounced_checks.csv` | 3 | returned checks and whether replaced |
| `collection_activity.csv` | 178 | calls, visits, promises and their outcomes |
| `credit_memos.csv` | 26 | credit memos with reason and approver |
| `disputes.csv` | 3 | open and resolved disputes |
| `gl_extract.csv` | 5 | general-ledger balances used for the control check |
| `aging_loss_history.csv` | 15 | historical loss rates per bucket |
| `annual_sales_and_writeoffs.csv` | 3 | yearly sales vs bad debt written off |
| `writeoff_history.csv` | 18 | past write-offs |

`data/demo/business_rules.md` is Kopi's rules sheet: terms, the priority score, the escalation ladder, KPI definitions and flag rules. Every threshold from it is in `lib/engine/rules.ts`.

### 5.2 Seed data (`data/seed/client_profiles.json`)

Fictional names and contact details for clients C001 to C060 (for example, "Lumen Eye Clinic (C014)"), so the UI reads naturally. They are labelled demo data and are not real.

### 5.3 Answer key (`tests/fixtures/answer-key`)

Kopi's `expected_P1.md`, `expected_P2.md` and `compute_reference.py`. They are used **only by tests** to prove the engine is right. They must never be imported by app code, seeded into the database or indexed for RAG.

## 6. How the data is treated

### 6.1 Engine (`lib/engine`)

`runEngine(snapshot, prev?)` in `lib/engine/index.ts` is a pure function: CSV tables in, one result object out. It never reads the clock; "today" is the snapshot's as-of date.

| File | Does |
|---|---|
| `csv.ts`, `model.ts`, `dates.ts` | parse CSVs, normalise types, ISO date maths |
| `aging.ts` | buckets (Current, 1-30, 31-60, 61-90, 90+) and the control check (aging total vs GL) |
| `kpis.ts` | DSO, % over 60/90, collection efficiency, top-10 concentration, allowance and bad-debt estimate |
| `pdc.ts` | 4-week cash-in forecast, PDCs due, bounced checks |
| `score.ts` | the follow-up ranking: points for age, amount, broken promises, bounced checks, over limit, no contact, payment slowdown, minus PDC cover |
| `escalation.ts` | credit hold / visit / credit-limit review recommendations |
| `flags.ts` | control flags (ledger gap, unapplied cash, inflow drop and so on) |
| `report.ts` | the month report in markdown (CFO page download) |
| `types.ts` | the contract the UI and AI depend on |
| `demo.ts` | loads P1/P2 from disk on the server, memoised |

`tests/engine` checks P1 and P2 against the answer key table by table.

### 6.2 Database (Supabase)

Schema: `supabase/migrations/20261015000001_duely_core.sql`.

- `drafts`: AI or template reminders, their review result, status (pending, approved, rejected, needs_edit, held) and whether top management must approve.
- `contact_logs`: calls and visits logged from the client page.
- `notifications`: alerts for collectors and supervisors, created by the n8n hooks.
- `kb_chunks`: the RAG knowledge base (text + 384-d embedding, HNSW index). `match_kb()` does the similarity search.

The demo policies let the anon key read and write these tables; this is fine for a class demo and must be tightened for real use. `lib/db/*` falls back to an in-memory store (shared across routes) if Supabase is unreachable, so the app never breaks.

### 6.3 RAG knowledge base (`lib/rag`)

- `lib/rag/corpus.ts` turns the demo CSVs and `business_rules.md` into short sentences: one per customer, activity, open dispute, bounced check, credit memo and non-cleared PDC; cleared PDCs are summarised per client; rules are split by section. It never reads the answer key.
- 674 chunks are embedded and stored in `kb_chunks` (P1 and P2, plus 7 rules sections).
- `searchKnowledge()` embeds the question, calls `match_kb`, and falls back to keyword search if needed.
- `scripts/seed-kb.ts` rebuilds the knowledge base (`npx tsx scripts/seed-kb.ts`, with `--dry`).

### 6.4 AI agents (`lib/ai`)

- `provider.ts` picks the provider from the keys present (`AI_PROVIDER` can force one).
- `agents/draft.ts` writes a reminder. **Tone is decided by code**: final = credit-hold escalation with an invoice over 90 days; firm = over 30 days overdue or a broken promise; otherwise friendly.
- `agents/review.ts` checks the draft: invented numbers, legal or threat wording outside a final notice, length limits.
- `agents/explain.ts` explains a client's rank; `agents/summarize.ts` writes the CFO summary.
- `agents/orchestrator.ts` runs draft → review for today's top clients, skipping anyone on hold, in dispute, with a promise not yet due, or with a draft already waiting.
- `/api/chat` streams answers with 7 tools over the engine and the knowledge base.

### 6.5 MCP and n8n

- **MCP** (`lib/mcp`, docs in `docs/mcp.md`): `POST /api/mcp/mcp` with `Authorization: Bearer $MCP_TOKEN`. Tools expose the follow-up list, client details, KPIs, checks and knowledge search, so Claude Desktop or Claude Code can query Duely directly. `/daily-brief` in `.claude/commands` uses it.
- **n8n** (`n8n/`, docs in `n8n/README.md`): `daily-digest.json` and `due-reminders.json` call `/api/hooks/digest` and `/api/hooks/due` with header `x-hook-secret`. They create in-app notifications and can email a digest. Known gaps: the Gmail node needs a real credential after import, and the hourly reminder repeats because the demo date never moves.

## 7. The app

| Route | Who | What |
|---|---|---|
| `/` | everyone | three.js landing page |
| `/login` | everyone | pick a demo role: Collector, Supervisor, CFO, Admin (no password) |
| `/today` | collector, supervisor | overdue headline, coverage bar, ranked follow-up list with next step |
| `/clients`, `/clients/[code]` | all | search; client 360 with "why #N today", invoices, PDCs, history, log contact, draft reminder |
| `/checks` | all | 4-week PDC board, deposit now, bounced checks |
| `/approvals` | supervisor, CFO, admin | approve or reject drafts; final notices need CFO/Admin |
| `/cfo` | CFO | KPIs, aging and loss rates, cash-in forecast, reps, flags, month report |
| `/import` | admin | CSV/Excel upload wizard with column matching (demo: re-runs the demo period) |
| `/ask` | all | full-page chat (also a slide-over on every page) |

Cookies: `duely_month` (P1/P2 or a month key; session-only, so each visit opens on the latest month, now 30 Sep 2026), `duely_role`, `duely_collector`, `duely_theme`. Themes: `wise` (default) and `wallet` (dark); add one by following `docs/THEMES.md`, switch with `?theme=`.

## 8. Run, test, deploy

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 42 tests: engine vs answer key + AI number checks
npm run build
```

Environment variables (`.env.local` locally, Vercel project settings in production):

| Variable | Needed | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for the database | without them the app uses the in-memory store |
| `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` | for AI | without them chat and drafts use engine-only fallbacks |
| `AI_PROVIDER`, `AI_MODEL_SMART`, `AI_MODEL_FAST` | optional | force a provider or model |
| `MCP_TOKEN` | for MCP | bearer token for `/api/mcp/mcp` |
| `HOOK_SECRET` | for n8n | the hooks return 503 without it |
| `N8N_LETTER_WEBHOOK_URL` | optional | n8n webhook that emails a test copy of each approved letter to your own inbox |

Never commit keys. `.env*` files are gitignored.

Deploy: push to `main` and Vercel builds automatically. If a deploy fails, read the end of the build log on Vercel. Two causes we already hit: npm peer-dependency conflicts (solved by `.npmrc`) and Vercel's block on vulnerable Next.js versions (keep Next patched).

## 9. Known gaps and next steps

- Approvals are an in-app workflow only; nothing is actually sent to clients.
- Edits to a draft on `/approvals` are not saved yet.
- `/import` reads and maps files but "Run the month" only re-runs the demo period.
- Supabase demo policies are open to the anon key; tighten before any real use.
- Leftover staging tables from seeding can be removed with `supabase/cleanup_kb_staging.sql`.
- The live AI paths (chat, AI drafts, CFO summary) were type-checked but need a manual check on the deployed site with a real key.
