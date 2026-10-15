# Business Rules Sheet (proposed; confirm with Kopi before the runs)

Give this file to the AI tool together with the period's data. Every rule the tool applies should come from here, so its flags can be traced.

## 1. Terms and policies

| Rule | Value |
| --- | --- |
| Payment terms | Hospitals 90 days; ambulatory surgical centers 60; eye clinics 30 or 60; optical shops 30 (per `customers.csv`) |
| Contract discounts | Fixed per client; policy maximum 10% of gross |
| Credit memo approval | Up to ₱20,000: Sales Manager. Up to ₱100,000: Finance Head. Above ₱100,000: Top management. Every memo needs an approver |
| Credit holds and limit changes | Recommended by middle management, approved by top management |
| Demand letters and write-offs | Top management only; write-offs also with the external accountant |
| PDC handling | Deposit on the check date; a check is stale 6 months after its date |
| Messages to clients | Drafted by the tool, approved by the collections supervisor before sending |

## 2. Collections priority score

Remove disputed and pending-return invoices first; they are listed as "On hold" and not chased. Unapplied payments are netted against the client's overdue balance.

| Factor | Points |
| --- | --- |
| Oldest days overdue: 1–30 / 31–60 / 61–90 / 90+ | 10 / 20 / 30 / 40 |
| Overdue amount: top 20% of overdue balances / next 30% / rest | 20 / 10 / 0 |
| Broke a promise to pay in the last 30 days (paid less than 90% of the promised amount by the promise date) | +15 |
| Bounced check in the last 12 months | +10 |
| Total balance over credit limit | +10 |
| No contact in 14+ days | +10 |
| Slowdown: average days late in the last 3 months is 15+ days above the 12-month average | +5 |
| PDCs on hand cover the full overdue amount | −30 |

## 3. Escalation ladder

| Trigger | Action | Who acts |
| --- | --- | --- |
| Due within 7 days | Courtesy reminder | Collector |
| 1–30 days overdue | Reminder message and a call | Collector |
| 31–60 days overdue | Call; ask for a payment date or a PDC | Collector |
| 61–90 days overdue, or one broken promise | Visit; inform the sales rep | Collections supervisor |
| 90+ days, two broken promises in 90 days, or a bounced check unreplaced after 7 days | Credit-hold recommendation | Middle management, approved by top |
| Over credit limit but current | Credit-limit review; do not chase | Middle management |
| Final notice or demand letter | Only with top management approval | Top management |

Open promise to pay: do not draft a new reminder for that invoice until the promise date has passed.

## 4. KPI definitions

| KPI | Formula |
| --- | --- |
| DSO | Ledger AR ÷ net credit sales of the last 90 days × 90 |
| % over 60 / over 90 | Balance in those buckets ÷ total AR |
| Collection efficiency (month) | Collections ÷ (opening AR + month's credit sales − closing current AR) |
| Expected inflow, next 4 weeks | PDCs on hand by check date + open promises by promise date + current invoices of non-PDC clients by due date |
| Bounced PDC rate | Value of checks returned in the month ÷ value deposited in the month |
| At-risk exposure | 90+ balances + unreplaced bounced checks not already in 90+ |
| Estimated bad debt | Each aging bucket's balance × that bucket's loss rate (2023–2025 history in `aging_loss_history.csv`) |

## 5. Flag rules

| Flag | Rule | Goes to |
| --- | --- | --- |
| Discount above norm | Invoice discount over 2× the client's 6-month average, or over 10% | Sales manager |
| Unapproved credit memo | No approver recorded, or above that role's limit | Finance head |
| Repeated returns | Same client, 2+ return memos within 30 days (latest one this month) | Sales manager |
| Possible duplicate invoice | Same client, same amount, within 3 days | Finance head |
| Unapplied payment | Payment not matched to an invoice for 15+ days | Accounting |
| Order to an at-risk client | New invoice this month to a client with a 90+ day balance | Sales manager, credit review |
| Sudden balance jump | Client AR up 50%+ vs last period **and** the increase is at least 1% of total AR (refinement: without the floor, routine order timing tripped this flag for 7 clients in testing) | Credit review |
| Inflow drop | Expected weekly inflow 25%+ below the 4-week average | Top management |
| Concentration | One client over 15% of total overdue | Top management |
| Doubtful account | Any of: 120+ days overdue; 90+ days with no payment in 60 days; 2+ bounced checks unreplaced; 3+ unanswered contact attempts in 60 days | Finance head |
| Allowance shortfall | Estimated bad debt above the ledger allowance | Top management |
| Write-off candidate | 365+ days overdue, or demand letter already sent with no recovery | Top management with accountant |

Every flag must show the rule it broke and the source row (invoice, memo, payment or check number). If no rule triggers, say "no exceptions"; never invent one.
