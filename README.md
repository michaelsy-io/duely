# Duely

AI-assisted accounts-receivable collections for an ophthalmic medical distributor (AIM iMBA *AI Tools* final project). A deterministic engine does the maths; AI explains and drafts; a supervisor approves every message.

- **Start here:** [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) explains the whole project step by step: stack, data, how it is processed, and how to run it.
- Rules for anyone (or any Claude) editing the code: [CLAUDE.md](CLAUDE.md).
- Why it works the way it does (data ownership, the escalation ladder, imports, October data): [section 10 of the overview](docs/PROJECT_OVERVIEW.md#10-decisions-and-clarifications).

Demo sign-in: pick **Supervisor** first. Collecting Agents 1 to 3 see only their own clients; only the **Admin** can import or revert a month.

```bash
npm install
npm run dev   # http://localhost:3000
npm test
```

All data in this repo is synthetic.
