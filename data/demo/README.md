# Demo Data: Finance & Collections AI Tool

Synthetic, anonymized data for the AI Tools final project (AIM iMBA). It is modeled on how an ophthalmic medical distributor's receivables work, but every client, amount, check and invoice is invented. No real company data is in these files.

## What's in the folder

| Folder / file | What it is | Upload to the AI tool? |
| --- | --- | --- |
| `P1_2026-08-31/` | Run 1 data: all exports as at 31 Aug 2026 (the routine month) | Yes, for run 1 only |
| `P2_2026-09-30/` | Run 2 data: all exports as at 30 Sep 2026 (the messy month) | Yes, for run 2 only |
| `business_rules.md` | Payment terms, approval limits, priority score, escalation ladder, flag thresholds | Yes, with both runs (or paste into the tool's instructions) |
| `baseline_template.csv` | The real baseline numbers Kopi still needs to fill in from the company | No. It's for the deck |
| `_ANSWER_KEY_do_not_upload/` | What was planted, the expected results, and the script that computes them | **Never.** If the tool sees it, the demo proves nothing |

Both period folders have the same 13 files with the same columns, so the tool can be pointed at either one without changes.

## The 13 files in each period folder

| File | One row per | Key columns | Used by |
| --- | --- | --- | --- |
| `customers.csv` | Client (60) | client_code, segment, area, rep, collector, payment_terms_days, credit_limit, usual_payment_method | Both |
| `ar_aging.csv` | Open invoice at cut-off | client_code, inv_no, due_date, balance, days_overdue, bucket, rep, area | Both |
| `sales_invoices.csv` | Invoice, last 12 months | inv_no, invoice_date, due_date, client_code, rep, product_line, gross, discount, net | Both |
| `payments.csv` | Payment, last 12 months | payment_id, payment_date, client_code, applied_to_invoice, amount, method, applied_status | Both |
| `pdc_register.csv` | Check received (last 6 months + on hand) | check_no_masked, client_code, invoices_covered, amount, check_date, status, date_deposited | Both |
| `bounced_checks.csv` | Returned check, last 12 months | client_code, invoices_covered, amount, date_returned, reason, replaced | Both |
| `collection_activity.csv` | Contact made, last 6 months | activity_date, client_code, collector, action, outcome, promise_date, promise_amount | Both |
| `credit_memos.csv` | Credit memo, last 12 months | memo_no, client_code, inv_no, rep, amount, reason, approver_role | Financial |
| `disputes.csv` | Dispute or pending return | dispute_id, client_code, inv_no, amount, reason, status | Collections |
| `gl_extract.csv` | Ledger line | AR control (opening and closing), allowance for doubtful accounts, month's sales and collections | Financial |
| `writeoff_history.csv` | Write-off, 2023–2025 | writeoff_date, client, amount, days_overdue_at_writeoff | Financial |
| `annual_sales_and_writeoffs.csv` | Year | net_credit_sales, bad_debt_written_off | Financial |
| `aging_loss_history.csv` | Year-end × aging bucket | balance_at_year_end, later_written_off (gives the loss rate per bucket) | Financial |

Amounts are in pesos. Client codes C001–C060 are consistent across every file and both periods.

## How the two runs differ

- **Run 1 (31 Aug):** a mostly routine month with a few problems: an unapplied payment, a credit memo with no approver, an open pricing dispute, an overdue client already covered by post-dated checks, and one client sliding badly.
- **Run 2 (30 Sep):** a worse month. Hospitals pay slower, DSO and overdue rise, two checks are bounced and unreplaced, there's a duplicate invoice, an outsized discount, a client over its limit, a doubtful account, and the allowance falls short.

The answer key lists every planted case with the expected result. Run each period, compare the tool's output against `expected_P1.md` / `expected_P2.md`, and log every miss. Those misses become the "observed failures" on the evidence slide.

## Before using: things Kopi should check

1. **Realism.** Segments, terms (hospitals 90 days, clinics 30–60, optical shops 30), invoice sizes and total AR (~₱100M) are guesses about the business. Adjust `business_rules.md` if any are far off. The data can be regenerated with `_ANSWER_KEY_do_not_upload/generate_demo_data.py`.
2. **Not modeled:** withholding tax deducted by hospitals (payments net of EWT with a BIR 2307), partial payments, and VAT. Real exports will be messier. Say so on the limitations slide.
3. **Baselines are not in this data.** The baseline numbers in the deck must come from the real business (see `baseline_template.csv`). Synthetic data proves the tool works; it can't prove the current-state problem.
