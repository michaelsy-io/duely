# Duely: project overview

Read this first if you are a teammate (or a teammate's Claude) picking up the project. It explains what Duely is, how it was built and in what order, what data it uses, how that data is handled, and how to run, test and deploy it. The rules in [`CLAUDE.md`](../CLAUDE.md) still apply and win over anything here.

> **Checkpoint, 16 Oct 2026.** The feature set is complete for the demo. Work from here on is refinement. Section 3 lists everything built so far, section 10 records the decisions and clarifications we reached along the way, and section 9 lists what is still open.

## 1. What Duely is

Duely is an accounts-receivable (AR) collections app built for the AIM iMBA *AI Tools* final project. It is modelled on an **ophthalmic medical distributor** that sells on credit to clinics, optical shops and surgical centres, and wants to cut bad debt. Tagline: *Get paid before it goes bad.*

Each month it takes the company's AR exports and:

- works out the KPIs (DSO, % over 60/90 days, collection efficiency, at-risk balance, bad-debt allowance);
- gives each collecting agent a work queue: who to contact today, the next step on the escalation ladder, and the reasons and points behind each rank;
- tracks post-dated checks (PDCs), bounced checks, promises to pay and disputes;
- recommends escalations (credit hold, visit, credit-limit review) and raises control flags;
- lets AI draft reminders and explain the numbers, with a supervisor approving every message before it could go out.

The course asks us to show: Claude setup, RAG, MCP, n8n, a Vercel deployment and agent orchestration. Section 6 maps each one to the code.

**Team inputs.** Kopi supplied the synthetic data, the business rules and the answer key. Jay (Mrityunjay) wrote the engine developer brief. Rie wrote the collections brief, the workbook and the three reminder tones (friendly, firm, final).

## 2. The core rule: code does the maths, AI does the words

Every number in the app comes from a deterministic TypeScript engine (`lib/engine`). AI never calculates anything. It only explains, summarises and drafts, and its text is checked:

- `lib/ai/verify.ts` (`verifyNumbers`) rejects any AI text that mentions an amount, date or document number that is not in the engine output it was given.
- Drafts get one retry with feedback; if they still fail, the app falls back to an engine-filled template.
- Nothing is sent to a client. Drafts go to **Approvals**; a supervisor must approve, and a **final notice** also needs top management (CFO/Admin). The server enforces this: approve and reject return 403 for a collecting agent.
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
| 7 | Speed and polish: Motion animations (count-ups, list reveals, nav springs), loading skeletons, cached CSVs, Singapore functions, server-loaded Approvals. | `6031f61`, `a3bb3db`, `9713be5` |
| 8 | Approved letters can send a test copy to our own inbox through n8n and Gmail (address from an env var, never hard-coded). | `4837c28` |
| 9 | Calendar page with event highlights; empty-month dashboards; clearer priority and overdue chips. | `5d27a3b` |
| 10 | Design critique ("Impeccable"), then the demo-critical fixes: Today reads as a work queue, stat tiles count exactly what their lists show, navigation differs by role, Approvals is seeded with drafts and shows real progress, AA contrast and phone layout fixes. | `eedb8b5`, `b8bb69f`, `de8f263` |
| 11 | The app always opens on the latest month with data, and the month resets on sign-in, role switch and sign-out. | `e1123f0`, `4b20dc5` |
| 12 | Ask Duely became a floating button in the lower right that opens a pop-out at 3/4 screen height. Minimising (down arrow) keeps the conversation until the page is refreshed. Ask was removed from the sidebar. | `895db20`, `60418de`, `96aeb28` |
| 13 | Smooth sidebar highlight; animated sign-in page. | `60418de` |
| 14 | Logins for **Collecting Agent 1, 2 and 3**, each seeing only their own clients. | `b4ba1ef` |
| 15 | **Log contact** got its own page with a client picker; **Import** became Admin-only. | `7fc37dc` |
| 16 | The Today next step now follows Kopi's escalation ladder (section 10.6); "Deposit check" and "Call now" were dropped. | `014c84e` |
| 17 | **Real import and revert**: the Admin uploads a month's 13 files, Duely validates and saves them, runs the engine, and opens that month. Any imported month can be reverted. | `e0c7515` |
| 18 | Carried the landing-page brand into the app: shared logo, Bricolage display font, lavender glow, peso coins on the Today strip. | `3632028` |
| 19 | Flat, minimalist SVG avatars for the six demo accounts (login cards, header, View-as menu). | `d766c42` |

## 4. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5.28 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, theme tokens as CSS variables (`lib/themes`); Plus Jakarta Sans body, Bricolage Grotesque display |
| Motion | `motion/react` (respects reduced motion via `MotionProvider`) |
| Charts / 3D | Recharts; three.js for the landing hero |
| Data parsing | papaparse (CSV), xlsx (Excel in the import wizard) |
| Database | Supabase Postgres with pgvector, RLS on every table (project "ledgerly", region ap-southeast-1) |
| Embeddings | Supabase edge function `embed` (gte-small, 384 dimensions) |
| AI | Vercel AI SDK 5 with `@ai-sdk/openai` and `@ai-sdk/anthropic`. OpenAI: `gpt-5` / `gpt-5-mini`; Anthropic: `claude-sonnet-5-5` / `claude-haiku-5-5` |
| MCP | `@modelcontextprotocol/sdk` (web-standard transport) at `/api/mcp/mcp` |
| Automation | n8n workflows calling `/api/hooks/*` |
| Tests | Vitest (63 tests) |
| Hosting | Vercel (project "duely", region sin1), auto-deploys on every push to `main` |

Install with `npm install` (the `.npmrc` sets `legacy-peer-deps`, needed by the AI SDK's React peer range).

## 5. The data

All data is **synthetic**. No real company, client or person is in this repo. The CSVs are Kopi's files, byte-for-byte; the only thing we added is the fictional name and contact file in 5.2.

### 5.1 Demo periods (`data/demo`)

Two month-end snapshots, each with the same 13 CSV exports:

- **P1 = 31 Aug 2026**, the routine month.
- **P2 = 30 Sep 2026**, the messy month (more bounced checks, broken promises, a ledger gap). P2 uses P1 as its previous month for comparisons.

| File | Rows (P2) | What it holds | Who owns it in a real company |
|---|---|---|---|
| `customers.csv` | 60 | client code, segment, area, sales rep, collector, terms, credit limit, usual payment method | Sales / credit admin |
| `ar_aging.csv` | 392 | open invoices with balance, days overdue and bucket | Accounting |
| `sales_invoices.csv` | 1,768 | invoice history with gross, discount, net | Accounting |
| `payments.csv` | 1,720 | payments and how they were applied | Accounting |
| `pdc_register.csv` | 446 | post-dated checks: on hand, deposited, cleared, bounced | Treasury |
| `bounced_checks.csv` | 3 | returned checks and whether replaced | Treasury |
| `collection_activity.csv` | 178 | calls, visits, promises and their outcomes | Collectors (now Duely) |
| `credit_memos.csv` | 26 | credit memos with reason and approver | Accounting |
| `disputes.csv` | 3 | open and resolved disputes | Sales / credit admin |
| `gl_extract.csv` | 5 | general-ledger balances used for the control check | Accounting |
| `aging_loss_history.csv` | 15 | historical loss rates per bucket | Accounting |
| `annual_sales_and_writeoffs.csv` | 3 | yearly sales vs bad debt written off | Accounting |
| `writeoff_history.csv` | 18 | past write-offs | Accounting |

"Rows" means the number of records in the file (one invoice, one payment, one check and so on).

`data/demo/business_rules.md` is Kopi's rules sheet: terms, the priority score, the escalation ladder, KPI definitions and flag rules. Every threshold from it is in `lib/engine/rules.ts`.

### 5.2 Seed data (`data/seed/client_profiles.json`)

Fictional names and contact details for clients C001 to C060 (for example, "Lumen Eye Clinic (C014)"), so the UI reads naturally. They are labelled demo data and are not real.

### 5.3 Answer key (`tests/fixtures/answer-key`)

Kopi's `expected_P1.md`, `expected_P2.md` and `compute_reference.py`. They are used **only by tests** to prove the engine is right. They must never be imported by app code, seeded into the database or indexed for RAG.

### 5.4 October sample (P3, 31 Oct 2026)

Kopi later shared a third month for testing the import ("Demo data for sampling/P3_2026-10-31" in the team Drive). It is **not** bundled in `data/demo`; it enters the app only through `/import`. It is a genuine next month, not a reshuffle (details in 10.9). There is no answer key for it, so its numbers are checked only by the import's control-total check.

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
| `rules.ts` | every threshold, including `ESCALATION.callDays = 30` for the ladder |
| `types.ts` | the contract the UI and AI depend on |
| `demo.ts` | loads P1/P2 from disk on the server, memoised |

`lib/view.ts` turns engine output into UI terms, including `nextStep()` (the ladder step for each client, section 10.6). `tests/engine` checks P1 and P2 against the answer key table by table.

### 6.2 Database (Supabase)

Migrations live in `supabase/migrations`.

| Table | Holds | Migration | Applied |
|---|---|---|---|
| `drafts` | AI or template reminders, review result, status (pending, approved, rejected, needs_edit, held), whether top management must approve | `…15000001_duely_core.sql` | yes |
| `contact_logs` | calls, SMS, emails and visits logged in Duely | same | yes |
| `notifications` | alerts for collectors and supervisors, created by the n8n hooks | same | yes |
| `kb_chunks` | the RAG knowledge base (text + 384-d embedding, HNSW index); `match_kb()` searches it | same | yes |
| `month_imports` | one row per imported month: its 13 files as parsed tables, who imported it and when | `…16000002_month_imports.sql` | yes |
| `escalation_decisions` | supervisor decisions on recommended credit holds | `…16000001_escalation_decisions.sql` | **no**, waiting for Michael's OK; decisions fall back to a cookie |

`lib/db/seedDrafts.ts` seeds three example drafts (one a final notice) when a month has none, so Approvals is never empty in the demo.

The demo policies let the anon key read and write these tables; this is fine for a class demo and must be tightened for real use. `lib/db/*` falls back to an in-memory store (shared across routes) if Supabase is unreachable, so the app never breaks.

### 6.3 Month import (`lib/imports`, `/api/import`)

1. The Admin picks the month on `/import` and drops in the files (CSV or Excel).
2. `lib/imports/files.ts` recognises each file by its columns and validates it. Twelve files are required; `writeoff_history` is optional. The GL's AR balance date must be that month's end.
3. The wizard shows progress and a control-total check (aging total vs the GL).
4. `POST /api/import` (Admin only, 403 otherwise) saves the month to `month_imports`, and the app switches to it. The month's id is its key, for example `2026-10`, with the as-of date at month end. The previous month is used for comparisons.
5. `DELETE /api/import` reverts an imported month (the list on `/import` has a Revert button with a confirm). The bundled P1 and P2 can't be reverted (409).

`lib/months.ts` and `lib/db/imports.ts` (`importedMonthKeys`) list what is available; the month picker shows bundled and imported months together, newest first.

### 6.4 RAG knowledge base (`lib/rag`)

- `lib/rag/corpus.ts` turns the demo CSVs and `business_rules.md` into short sentences: one per customer, activity, open dispute, bounced check, credit memo and non-cleared PDC; cleared PDCs are summarised per client; rules are split by section. It never reads the answer key.
- 675 chunks are embedded and stored in `kb_chunks` (P1 and P2, plus the rules sections). Imported months are not indexed yet.
- `searchKnowledge()` embeds the question, calls `match_kb`, and falls back to keyword search if needed.
- `scripts/seed-kb.ts` rebuilds the knowledge base (`npx tsx scripts/seed-kb.ts`, with `--dry`).

### 6.5 AI agents (`lib/ai`)

- `provider.ts` picks the provider from the keys present (`AI_PROVIDER` can force one).
- `agents/draft.ts` writes a reminder. **Tone is decided by code**: final = credit-hold escalation with an invoice over 90 days; firm = over 30 days overdue or a broken promise; otherwise friendly.
- `agents/review.ts` checks the draft: invented numbers, legal or threat wording outside a final notice, length limits.
- `agents/explain.ts` explains a client's rank; `agents/summarize.ts` writes the CFO summary.
- `agents/orchestrator.ts` runs draft → review for today's top clients, skipping anyone on hold, in dispute, with a promise not yet due, or with a draft already waiting.
- `/api/chat` streams answers with 7 tools over the engine and the knowledge base.

### 6.6 MCP and n8n

- **MCP** (`lib/mcp`, docs in `docs/mcp.md`): `POST /api/mcp/mcp` with `Authorization: Bearer $MCP_TOKEN`. Tools expose the follow-up list, client details, KPIs, checks and knowledge search, so Claude Desktop or Claude Code can query Duely directly. `/daily-brief` in `.claude/commands` uses it.
- **n8n** (`n8n/`, docs in `n8n/README.md`): `daily-digest.json`, `due-reminders.json` and the approved-letter workflow call `/api/hooks/*` with header `x-hook-secret`. They create in-app notifications and can email a digest or a test copy of a letter. Known gaps: the Gmail node needs a real credential after import, and the hourly reminder repeats because the demo date never moves.

## 7. The app

### 7.1 Roles and navigation

Sign-in is a demo picker (no password) with an avatar per account. `components/shell/nav.ts` defines each role's tabs; `middleware.ts` redirects a role away from pages it can't use.

| Sign-in | Sees | Tabs |
|---|---|---|
| Collecting Agent 1 / 2 / 3 | only their own clients (21 / 17 / 22) | Today, Log contact, Clients, Checks, Calendar |
| Supervisor (marked "Start here for the demo") | all 60 clients | Today, Approvals, Log contact, Clients, Checks, Calendar |
| CFO | all 60 clients | CFO, Approvals, Today, Clients, Checks, Calendar |
| Admin | all 60 clients | Today, Approvals, Log contact, Clients, Checks, CFO, Calendar, Import |

Ask Duely is on every page as the floating button in the lower right, not a tab.

### 7.2 Pages

| Route | Who | What |
|---|---|---|
| `/` | everyone | three.js landing page |
| `/login` | everyone | animated demo sign-in: three agent buttons, Supervisor, CFO, Admin |
| `/today` | everyone | work queue: today strip, decisions waiting, stat tiles whose counts match the lists they open, ranked list with the next ladder step and "why" chips |
| `/log` | agents, supervisor, admin | pick a client (agents see only their own) and log a call, SMS, email or visit; `?c=C014` preselects |
| `/clients`, `/clients/[code]` | all | search; client 360 with "why #N today", invoices, PDCs, history, log contact, draft reminder |
| `/checks` | all | 4-week PDC board, checks to deposit, bounced checks |
| `/calendar` | all | month calendar with event highlights |
| `/approvals` | supervisor, CFO, admin | approve or reject drafts and credit holds; final notices need CFO/Admin |
| `/cfo` | CFO, admin | KPIs, aging and loss rates, cash-in forecast, reps, flags, month report |
| `/import` | admin only | import a month's files, see imported months, revert one |
| `/ask` | all | full-page chat (the floating window hides here) |

### 7.3 Month and cookies

- The app opens on the **latest month with data**: 30 Sep 2026 from the bundled data, or a newer imported month (31 Oct 2026 once October is imported).
- `duely_month` holds the chosen month (`P1`, `P2` or a key like `2026-10`). It is a session cookie, and signing in, switching role or signing out clears it, so every visit starts on the latest month.
- `duely_role`, `duely_collector` (the data name "Collector N"; the UI shows "Collecting Agent N") and `duely_theme`.
- Themes: `wise` (default) and `wallet` (dark); add one by following `docs/THEMES.md`, switch with `?theme=`.

## 8. Run, test, deploy

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 63 tests: engine vs answer key, AI number checks, import validation
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

`npm run build` needs internet access for Google Fonts (`next/font/google`). In a sandbox without it the build fails with "queries have exactly one entry"; use `npx tsc --noEmit` and `npm test` there, and let Vercel do the build.

## 9. Known gaps and next steps

- Approvals are an in-app workflow only; nothing is actually sent to clients (only test copies to our own inbox).
- Edits to a draft on `/approvals` are not saved yet.
- The `escalation_decisions` table is not applied; credit-hold decisions are kept in a cookie until it is.
- Imported months are not indexed for RAG, so chat knowledge search covers P1 and P2 only.
- The sidebar still labels an imported month "Demo data".
- On phones narrower than 440px the header shows the logo mark only, not the wordmark.
- The peso coins on the Today strip sit close to the "First call" name.
- n8n is not running live; the workflow files are in `n8n/`.
- Supabase demo policies are open to the anon key; tighten before any real use.
- Leftover staging tables from seeding can be removed with `supabase/cleanup_kb_staging.sql`.
- The live AI paths (chat, AI drafts, CFO summary) need a manual check on the deployed site with a real key.

## 10. Decisions and clarifications

Questions that came up while building, and the answers we settled on. Use these when presenting or when someone asks "why does it work this way?".

### 10.1 Is it still Kopi's data?

Yes. `data/demo` is byte-identical to Kopi's Demo_Data folder. We added only `data/seed/client_profiles.json` (fictional names and contacts). Nothing was edited or generated.

### 10.2 Why 13 separate files instead of one spreadsheet?

Each file comes from a different system or department and has a different grain: one row per invoice, per payment, per check, per call. Squashing them into one row per client would either lose detail or repeat it. They are normalised data linked by client code (and invoice or check number). The real problem is that people reconcile them by hand; Duely joins them automatically, which is the value it adds.

### 10.3 What Duely owns, and what it imports

One owner per record, so there is never a second source of truth.

- **Duely replaces only `collection_activity`.** Collectors log calls, visits and promises in Duely instead of a spreadsheet.
- **Duely imports the other 12** from their owners: Treasury (PDC register, bounced checks), Sales / credit admin (customers, disputes) and Accounting (invoices, payments, aging, credit memos, GL, loss history, write-offs).
- **Lives only in Duely:** the contact log, drafts and approvals, escalation decisions, follow-up notes and the call queue, and discrepancy flags.
- Where they disagree, Duely flags the gap rather than overwriting it; for example, a check promised on a call that is not in Treasury's register.

### 10.4 Isn't everything 30 days late?

Only the imported files. What people enter in Duely (contacts, promises, approvals) is live. In the demo the Admin imports month-end files, so imported data is as fresh as the last import. In production the plan is daily sync for payments and the PDC register (through n8n), weekly for invoices, and monthly for the GL.

### 10.5 Why do collecting agents see smaller totals than the supervisor?

Kopi's `customers.csv` assigns every client to one collector: Collector 1 has 21 clients, Collector 2 has 17 and Collector 3 has 22. Each agent sees only their own book; the supervisor, CFO and Admin see all 60. The three books add up to the company total.

### 10.6 The next step on Today: Kopi's escalation ladder

Each client on Today shows one next step, taken from Kopi's ladder (`business_rules.md`) via `nextStep()` in `lib/view.ts`:

| Step | When |
|---|---|
| **Credit hold** | the engine recommends a hold (rules on overdue age and bounced checks); goes to Approvals for a decision |
| **Visit** | the engine recommends a visit; the sales rep is informed |
| **Call for a date** | oldest overdue invoice is over 30 days (`ESCALATION.callDays`) |
| **Remind and call** | everything else that is overdue |

The earlier labels "Call now" and "Deposit check" were our own shortcuts, not Kopi's, so they were replaced. Depositing PDCs is still in the rules (deposit on the check date) and shows on the Checks page and the "Checks to deposit this week" tile; a PDC on hand also lowers a client's priority (−30 points).

### 10.7 Sales rep vs collecting agent

Different people. There are 5 sales reps (Rep A to E, 12 clients each) who sell, and 3 collectors who collect, across reps. They meet on the ladder at "Visit; inform the sales rep", and repeated bounced checks go to the sales manager.

### 10.8 Why only the Admin imports

Month-end files come from Accounting and Treasury, so loading them is an Admin job. Supervisors and agents see "Your Admin imports the month-end files" on an empty month instead of an import button.

### 10.9 What October (P3) shows

October is a genuine next month: its GL opening balance equals September's closing balance (₱107,925,379.33).

- Of September's 86 overdue invoices (₱25.5M), 58 were cleared (₱17.2M), including C005's 83 to 100-day invoices, and 28 are still open (₱8.3M). 43 new invoices became overdue (₱11.6M).
- Total overdue fell from ₱25.5M to ₱19.9M, and total AR from ₱107.9M to ₱102.8M. Collections were ₱41.8M against ₱36.8M of sales.
- But it is drifting older: the 31 to 60-day bucket grew from ₱1.7M to ₱6.2M and 90+ from ₱1.09M to ₱1.19M, so the allowance rose from ₱650k to ₱950k.
- New events to show in the demo: a bounced check from C046 (₱521,585), a new dispute DSP-041 for C042, C028's credit limit raised from ₱1.9M to ₱2.8M, and an unapplied payment OR-52110 from C004 (₱233,583), which is exactly the gap between aging (₱102,789,190) and the GL (₱102,555,607).

### 10.10 Is "Get paid before it goes bad" accurate?

Yes. Most of the book is still young: at 30 Sep, 81% of overdue was 1 to 30 days and only 4% was 90+; at 31 Oct, 89% was under 60 days and 6% was 90+. The tagline is about catching that young debt before it ages, which is what the ladder and the ranking do.

