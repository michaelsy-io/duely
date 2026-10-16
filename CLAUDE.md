# Duely

AR-collections app for an ophthalmic medical distributor (AIM iMBA AI Tools final project). Next.js 15 App Router + Supabase + Vercel AI SDK.

New here? Read `docs/PROJECT_OVERVIEW.md` first: how the project was built, the stack, the data and how it is processed. Section 10 holds settled decisions (data ownership, escalation ladder, import and revert, roles); do not reopen them without asking Michael. Feature-complete checkpoint: 16 Oct 2026; work from there is refinement.

## Rules
- Code does the maths, AI does the words. Every number shown or sent comes from `lib/engine`; AI text must pass `verifyNumbers` (no amount/date/doc number absent from the engine payload).
- Nothing reaches a client without supervisor approval; final notices also need top-management approval.
- Only the Admin imports or reverts a month. Collecting agents see only their own clients (`customers.collector`).
- Engine = Kopi's `data/demo/business_rules.md` as implemented in `tests/fixtures/answer-key/compute_reference.py`. All thresholds in `lib/engine/rules.ts`.
- `tests/fixtures/answer-key/` is for tests only. Never import it from app code, seed it, or index it for RAG.
- Dates are ISO strings; the "as of" date comes from the demo clock, never `new Date()` inside the engine.
- App must work with no AI key (show engine reason text; drafts fall back to engine-filled templates, still sent for approval).
- Client names/contacts in `data/seed` are fictional demo data.

## Commands
- `npm run dev` · `npm test` (Vitest) · `npm run build`
- `/engine-check` runs engine tests against expected P1/P2.

## Brand
Duely. Wise-inspired light UI in regal purple: primary #5B3FD0, deep ink #1C1240, soft lilac #ECE8FB, lavender accent #AB9FF2, mint #2FBF8A (good), amber #F5A524 (warn), coral #E5484D (bad). Font: Plus Jakarta Sans; display Bricolage Grotesque. Big bold numbers, pill buttons, generous whitespace, rounded 20px cards.
