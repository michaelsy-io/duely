---
description: Summarise today's collections using the Duely MCP tools
argument-hint: "[collector e.g. 'Collector 1'] [P1|P2]"
---

Use the **Duely** MCP tools (server `duely`) to write today's collections brief. Arguments: $ARGUMENTS (optional collector name and/or period P1/P2; default all collectors, P1).

1. Call `get_kpis` → one line on overall health (total AR, DSO, % over 60, overdue excl. disputes).
2. Call `get_today_list` (limit 5, with the collector if given) → the top 5 to call, each with client name, overdue amount and the engine's `reasonText`.
3. Call `get_pdc_calendar` → checks to deposit in week 1 and any bounced checks not yet replaced.
4. For the #1 client only, call `get_client` and add one line on the best next step (e.g. ask for a replacement check, confirm a promise date).

Rules:
- Quote numbers exactly as the tools return them (₱ amounts rounded to the peso, ratios ×100 as %). Never compute new totals or change a score.
- Cite each section with its tool `source` chip, e.g. "(Follow-up list · 31 Aug)".
- Do not call `draft_message` or `log_contact` unless the user asks; drafts go to supervisor approval anyway.
- Keep it under ~200 words, bullet points, client names not just codes.
