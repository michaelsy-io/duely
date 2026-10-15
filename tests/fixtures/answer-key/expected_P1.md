# Expected results: period ending 2026-08-31

## Control checks
- AR aging total ₱102,764,253 vs ledger AR ₱102,714,253; gap ₱50,000 = unapplied payment(s) ₱50,000
- Client codes missing from customer master: 0

## KPI table (top management)
| KPI | Value |
| --- | --- |
| DSO (AR ÷ last-90-day sales × 90) | 84.4 days |
| % of AR over 60 days | 1.1% |
| % of AR over 90 days | 0.3% |
| Collection efficiency (month) | 62.1% |
| Total AR (aging) / ledger AR | ₱102,764,253 / ₱102,714,253 |
| Overdue AR excl. open disputes | ₱20,577,809 |
| Bounced PDC rate (month, by value) | 0.9% |
| At-risk exposure (90+ plus unreplaced bounced checks not already 90+) | ₱431,617 |
| Top-10 share of total AR | 59.8% |
| Top-10 share of overdue AR | 81.2% |
| Estimated bad debt (aging x historical loss rate) | ₱623,573 |
| Allowance for doubtful accounts (ledger) | ₱650,000 |
| Bad debt written off % of sales 2023 / 2024 / 2025 | 0.19% / 0.14% / 0.17% |

Loss rates used: Current 0.33%, 1-30 0.74%, 31-60 2.36%, 61-90 6.88%, 90+ 27.84%

Aging buckets: Current ₱82,102,636, 1-30 ₱15,327,095, 31-60 ₱4,249,093, 61-90 ₱798,852, 90+ ₱286,577

## Expected inflow, next 4 weeks
| Week | PDCs maturing | Promises due | Current invoices falling due (non-PDC clients) | Total |
| --- | --- | --- | --- | --- |
| Week 1 (2026-09-01 to 2026-09-07) | ₱3,419,229 | ₱0 | ₱4,711,562 | ₱8,130,791 |
| Week 2 (2026-09-08 to 2026-09-14) | ₱3,209,059 | ₱0 | ₱5,294,062 | ₱8,503,121 |
| Week 3 (2026-09-15 to 2026-09-21) | ₱1,084,346 | ₱70,848 | ₱5,120,963 | ₱6,276,157 |
| Week 4 (2026-09-22 to 2026-09-28) | ₱476,125 | ₱0 | ₱3,259,532 | ₱3,735,656 |

## AR by rep
| Rep | Total AR | Overdue | % over 60 | DSO | Discount rate (month) | Credit memo rate (12 mo) | Sales this month to clients 60+ overdue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rep A | ₱7,339,634 | ₱2,218,368 | 8.0% | 60 | 2.2% | 0.10% | ₱288,110 |
| Rep B | ₱21,830,448 | ₱3,509,818 | 0.3% | 85 | 2.1% | 0.18% | ₱0 |
| Rep C | ₱41,595,005 | ₱11,410,241 | 1.0% | 112 | 2.6% | 0.14% | ₱1,616,244 |
| Rep D | ₱21,423,914 | ₱3,523,190 | 0.0% | 79 | 1.4% | 0.10% | ₱0 |
| Rep E | ₱10,575,252 | ₱0 | 0.0% | 54 | 1.7% | 0.00% | ₱0 |

## Exceptions and bad-debt flags
| Flag | Client / rep | Amount | Rule triggered | Source row | Owner |
| --- | --- | --- | --- | --- | --- |
| Unapproved credit memo | C009 / Rep D | ₱27,500 | No approver recorded | CM-422 | Finance head |
| Unapplied payment | C012 | ₱50,000 | Not matched to an invoice for 21 days | OR-51760 | Accounting |
| Inflow drop | Week 4 | ₱3,735,656 | 56% of 4-week average | expected inflow table | Top management |
| Concentration | C005 | ₱4,789,434 | 23% of total overdue | ar_aging.csv | Top management |
| Concentration | C002 | ₱4,469,391 | 22% of total overdue | ar_aging.csv | Top management |
| Write-off candidate | C040 | ₱66,251 | 377 days overdue; demand letter already sent | ar_aging.csv | Top management with accountant |

## Collections: prioritized follow-up list (24 accounts with overdue balances; full list)
| Rank | Client | Segment | Collector | Overdue | Oldest days | Score | Reason | Open promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | C014 | Eye clinic | Collector 2 | ₱601,661 | 65 | 75 | 65 days overdue; broke a promise in the last 30 days; bounced check in last 12 months (not replaced); over credit limit (₱889,771 vs ₱450,000) |  |
| 2 | C002 | Hospital | Collector 1 | ₱4,469,391 | 36 | 65 | 36 days overdue; broke a promise in the last 30 days; no contact in 14+ days |  |
| 3 | C036 | Optical shop | Collector 3 | ₱777,950 | 99 | 65 | 99 days overdue; over credit limit (₱777,950 vs ₱450,000); slowdown: paying 94 days late vs 24-day 12-month average |  |
| 4 | C005 | Hospital | Collector 3 | ₱4,789,434 | 70 | 60 | 70 days overdue; no contact in 14+ days |  |
| 5 | C048 | Hospital | Collector 2 | ₱1,071,287 | 14 | 55 | 14 days overdue; broke a promise in the last 30 days; no contact in 14+ days |  |
| 6 | C040 | Optical shop | Collector 3 | ₱66,251 | 377 | 50 | 377 days overdue; no contact in 14+ days |  |
| 7 | C020 | Hospital | Collector 2 | ₱1,317,250 | 16 | 40 | 16 days overdue; no contact in 14+ days |  |
| 8 | C008 | Hospital | Collector 1 | ₱306,770 | 3 | 35 | 3 days overdue; broke a promise in the last 30 days; no contact in 14+ days |  |
| 9 | C003 | Hospital | Collector 2 | ₱1,703,544 | 27 | 30 | 27 days overdue |  |
| 10 | C004 | Hospital | Collector 1 | ₱742,046 | 20 | 30 | 20 days overdue; no contact in 14+ days |  |
| 11 | C026 | Hospital | Collector 2 | ₱517,170 | 9 | 30 | 9 days overdue; no contact in 14+ days |  |
| 12 | C009 | Eye clinic | Collector 1 | ₱282,111 | 25 | 20 | 25 days overdue; no contact in 14+ days |  |
| 13 | C012 | Hospital | Collector 1 | ₱264,130 | 2 | 20 | 2 days overdue; no contact in 14+ days |  |
| 14 | C038 | Hospital | Collector 3 | ₱249,250 | 1 | 20 | 1 days overdue; no contact in 14+ days |  |
| 15 | C030 | Hospital | Collector 3 | ₱249,038 | 8 | 20 | 8 days overdue; no contact in 14+ days |  |
| 16 | C011 | Eye clinic | Collector 3 | ₱240,160 | 21 | 20 | 21 days overdue; no contact in 14+ days |  |
| 17 | C010 | Eye clinic | Collector 3 | ₱234,191 | 8 | 20 | 8 days overdue; no contact in 14+ days |  |
| 18 | C025 | Optical shop | Collector 2 | ₱119,950 | 9 | 20 | 9 days overdue; no contact in 14+ days |  |
| 19 | C033 | Optical shop | Collector 3 | ₱516,748 | 1 | 10 | 1 days overdue; over credit limit (₱783,954 vs ₱700,000); no contact in 14+ days; PDCs on hand ₱652,548 cover the overdue amount |  |
| 20 | C034 | Hospital | Collector 1 | ₱661,695 | 9 | 0 | 9 days overdue; no contact in 14+ days; PDCs on hand ₱661,695 cover the overdue amount |  |
| 21 | C017 | Eye clinic | Collector 1 | ₱569,070 | 1 | 0 | 1 days overdue; no contact in 14+ days; PDCs on hand ₱1,524,180 cover the overdue amount |  |
| 22 | C007 | Optical shop | Collector 1 | ₱151,770 | 39 | 0 | 39 days overdue; no contact in 14+ days; PDCs on hand ₱291,450 cover the overdue amount |  |
| 23 | C042 | Eye clinic | Collector 3 | ₱337,880 | 4 | -10 | 4 days overdue; no contact in 14+ days; PDCs on hand ₱508,406 cover the overdue amount |  |
| 24 | C023 | Optical shop | Collector 2 | ₱289,060 | 3 | -10 | 3 days overdue; no contact in 14+ days; PDCs on hand ₱289,060 cover the overdue amount |  |

Planted accounts' positions: C014 #1, C036 #3, C005 #4, C040 #6, C003 #9, C012 #13, C011 #16, C007 #22, C023 #24

Unapplied cash netted against C012's overdue balance: ₱50,000

On hold (open disputes / pending returns, not chased): C019 INV-11932 ₱86,400 (Pricing - billed list price instead of contract price)

## PDC calendar (checks on hand)
| Check date | Client | Amount | Flag |
| --- | --- | --- | --- |
| 2026-09-01 | C056 | ₱334,830 |  |
| 2026-09-02 | C017 | ₱569,070 |  |
| 2026-09-02 | C055 | ₱113,602 |  |
| 2026-09-03 | C034 | ₱264,374 |  |
| 2026-09-04 | C020 | ₱254,450 |  |
| 2026-09-04 | C058 | ₱169,323 |  |
| 2026-09-05 | C054 | ₱210,690 |  |
| 2026-09-06 | C032 | ₱202,992 |  |
| 2026-09-06 | C052 | ₱259,475 |  |
| 2026-09-07 | C007 | ₱151,770 |  |
| 2026-09-07 | C016 | ₱126,320 |  |
| 2026-09-07 | C017 | ₱122,870 |  |
| 2026-09-07 | C017 | ₱384,360 |  |
| 2026-09-07 | C054 | ₱255,104 |  |
| 2026-09-08 | C020 | ₱400,212 |  |
| 2026-09-08 | C023 | ₱289,060 |  |
| 2026-09-09 | C049 | ₱106,070 |  |
| 2026-09-10 | C006 | ₱209,549 |  |
| 2026-09-11 | C033 | ₱516,748 |  |
| 2026-09-12 | C015 | ₱419,059 |  |
| 2026-09-12 | C024 | ₱151,488 |  |
| 2026-09-12 | C034 | ₱397,322 |  |
| 2026-09-12 | C059 | ₱169,710 |  |
| 2026-09-13 | C017 | ₱211,960 |  |
| 2026-09-13 | C042 | ₱337,880 |  |

(Showing checks dated up to 2026-09-14 plus any flagged; 33 checks on hand in total, ₱8,188,759.)

Bounced and awaiting replacement: C014 ₱145,040 returned 2026-08-14 (17 days ago)

## Escalation list
| Client | Trigger met | Recommended action | Approver |
| --- | --- | --- | --- |
| C014 | bounced check unreplaced > 7 days | Credit-hold review | Middle management, then top |
| C002 | 2 broken promises (90 days) | Credit-hold review | Middle management, then top |
| C036 | 90+ days overdue | Credit-hold review | Middle management, then top |
| C005 | 61-90 days | Visit; inform sales rep | Collections supervisor |
| C048 | 2 broken promises (90 days) | Credit-hold review | Middle management, then top |
| C040 | 90+ days overdue | Credit-hold review | Middle management, then top |
| C008 | one broken promise | Visit; inform sales rep | Collections supervisor |
