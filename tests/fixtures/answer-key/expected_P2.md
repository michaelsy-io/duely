# Expected results: period ending 2026-09-30

## Control checks
- AR aging total ₱107,925,379 vs ledger AR ₱107,925,379; gap ₱0 (ties)
- Client codes missing from customer master: 0

## KPI table (top management)
| KPI | Value |
| --- | --- |
| DSO (AR ÷ last-90-day sales × 90) | 86.9 days |
| % of AR over 60 days | 2.9% |
| % of AR over 90 days | 1.0% |
| Collection efficiency (month) | 56.9% |
| Total AR (aging) / ledger AR | ₱107,925,379 / ₱107,925,379 |
| Overdue AR excl. open disputes | ₱25,341,948 |
| Bounced PDC rate (month, by value) | 1.9% |
| At-risk exposure (90+ plus unreplaced bounced checks not already 90+) | ₱1,374,489 |
| Top-10 share of total AR | 58.0% |
| Top-10 share of overdue AR | 69.6% |
| Estimated bad debt (aging x historical loss rate) | ₱914,140 |
| Allowance for doubtful accounts (ledger) | ₱650,000 |
| Bad debt written off % of sales 2023 / 2024 / 2025 | 0.19% / 0.14% / 0.17% |

Loss rates used: Current 0.33%, 1-30 0.74%, 31-60 2.36%, 61-90 6.88%, 90+ 27.84%

Aging buckets: Current ₱82,392,072, 1-30 ₱20,683,383, 31-60 ₱1,687,280, 61-90 ₱2,077,215, 90+ ₱1,085,429

## Expected inflow, next 4 weeks
| Week | PDCs maturing | Promises due | Current invoices falling due (non-PDC clients) | Total |
| --- | --- | --- | --- | --- |
| Week 1 (2026-10-01 to 2026-10-07) | ₱2,596,718 | ₱663,073 | ₱4,162,056 | ₱7,421,847 |
| Week 2 (2026-10-08 to 2026-10-14) | ₱4,421,110 | ₱0 | ₱5,627,090 | ₱10,048,200 |
| Week 3 (2026-10-15 to 2026-10-21) | ₱2,658,916 | ₱363,600 | ₱4,421,079 | ₱7,443,594 |
| Week 4 (2026-10-22 to 2026-10-28) | ₱697,329 | ₱340,472 | ₱4,577,664 | ₱5,615,465 |

## AR by rep
| Rep | Total AR | Overdue | % over 60 | DSO | Discount rate (month) | Credit memo rate (12 mo) | Sales this month to clients 60+ overdue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rep A | ₱8,179,135 | ₱3,527,406 | 13.8% | 69 | 2.3% | 0.22% | ₱94,472 |
| Rep B | ₱23,528,843 | ₱6,180,564 | 0.3% | 96 | 2.6% | 0.18% | ₱0 |
| Rep C | ₱42,029,146 | ₱10,923,099 | 4.7% | 104 | 2.5% | 0.14% | ₱1,627,768 |
| Rep D | ₱23,302,672 | ₱4,902,238 | 0.0% | 84 | 1.3% | 0.14% | ₱0 |
| Rep E | ₱10,885,583 | ₱0 | 0.0% | 56 | 1.6% | 0.00% | ₱0 |

## Exceptions and bad-debt flags
| Flag | Client / rep | Amount | Rule triggered | Source row | Owner |
| --- | --- | --- | --- | --- | --- |
| Discount above norm | C022 / Rep B | ₱38,000 | 25% discount vs client's 6-month average 3.0%; policy max 10% | INV-12287 | Sales manager |
| Possible duplicate invoice | C016 | ₱64,750 | Same client, same amount within 3 days | INV-12316 & INV-12331 | Finance head |
| Order to an at-risk client | C005 / Rep C | ₱144,666 | New invoice while client has 90+ day balance | INV-12222 | Sales manager, credit review |
| Order to an at-risk client | C005 / Rep C | ₱374,718 | New invoice while client has 90+ day balance | INV-12235 | Sales manager, credit review |
| Order to an at-risk client | C005 / Rep C | ₱163,267 | New invoice while client has 90+ day balance | INV-12265 | Sales manager, credit review |
| Order to an at-risk client | C005 / Rep C | ₱314,260 | New invoice while client has 90+ day balance | INV-12270 | Sales manager, credit review |
| Order to an at-risk client | C005 / Rep C | ₱285,104 | New invoice while client has 90+ day balance | INV-12291 | Sales manager, credit review |
| Order to an at-risk client | C014 / Rep A | ₱94,472 | New invoice while client has 90+ day balance | INV-12302 | Sales manager, credit review |
| Order to an at-risk client | C005 / Rep C | ₱345,752 | New invoice while client has 90+ day balance | INV-12335 | Sales manager, credit review |
| Sudden balance jump | C028 | ₱1,139,870 | AR ₱1,428,260 → ₱2,568,130 (+80%); increase ≥ 1% of total AR | ar_aging.csv | Credit review |
| Inflow drop | Week 4 | ₱5,615,465 | 74% of 4-week average | expected inflow table | Top management |
| Concentration | C005 | ₱4,356,348 | 17% of total overdue | ar_aging.csv | Top management |
| Doubtful account | C014 | ₱984,243 | 90+ and no payment in 98 days | ar_aging.csv | Finance head |
| Doubtful account | C036 | ₱777,950 | 129 days overdue; 90+ and no payment in 82 days; 6 unanswered contact attempts in 60 days | ar_aging.csv | Finance head |
| Write-off candidate | C040 | ₱66,251 | 407 days overdue | ar_aging.csv | Top management with accountant |
| Allowance shortfall | Portfolio | ₱264,140 | Estimate ₱914,140 vs allowance ₱650,000 | gl_extract.csv | Top management |

## Collections: prioritized follow-up list (27 accounts with overdue balances; full list)
| Rank | Client | Segment | Collector | Overdue | Oldest days | Score | Reason | Open promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | C014 | Eye clinic | Collector 2 | ₱889,771 | 95 | 85 | 95 days overdue; broke a promise in the last 30 days; bounced check in last 12 months (not replaced); over credit limit (₱984,243 vs ₱450,000) |  |
| 2 | C005 | Hospital | Collector 3 | ₱4,356,348 | 100 | 80 | 100 days overdue; broke a promise in the last 30 days; slowdown: paying 45 days late vs 16-day 12-month average |  |
| 3 | C036 | Optical shop | Collector 3 | ₱777,950 | 129 | 55 | 129 days overdue; over credit limit (₱777,950 vs ₱450,000); slowdown: paying 94 days late vs 25-day 12-month average |  |
| 4 | C023 | Optical shop | Collector 2 | ₱289,060 | 33 | 55 | 33 days overdue; broke a promise in the last 30 days; bounced check in last 12 months (not replaced); over credit limit (₱508,670 vs ₱500,000) |  |
| 5 | C040 | Optical shop | Collector 3 | ₱66,251 | 407 | 50 | 407 days overdue; no contact in 14+ days |  |
| 6 | C048 | Hospital | Collector 2 | ₱1,197,717 | 29 | 45 | 29 days overdue; broke a promise in the last 30 days |  |
| 7 | C002 | Hospital | Collector 1 | ₱3,736,430 | 30 | 40 | 30 days overdue; no contact in 14+ days |  |
| 8 | C020 | Hospital | Collector 2 | ₱2,358,671 | 25 | 40 | 25 days overdue; no contact in 14+ days |  |
| 9 | C003 | Hospital | Collector 2 | ₱1,102,451 | 22 | 35 | 22 days overdue; slowdown: paying 28 days late vs 10-day 12-month average |  |
| 10 | C004 | Hospital | Collector 1 | ₱1,230,047 | 25 | 30 | 25 days overdue | open promise 2026-10-22 |
| 11 | C034 | Hospital | Collector 1 | ₱988,120 | 22 | 30 | 22 days overdue; no contact in 14+ days |  |
| 12 | C026 | Hospital | Collector 2 | ₱932,510 | 14 | 30 | 14 days overdue; no contact in 14+ days |  |
| 13 | C011 | Eye clinic | Collector 3 | ₱833,740 | 51 | 30 | 51 days overdue | open promise 2026-10-01 |
| 14 | C008 | Hospital | Collector 1 | ₱787,950 | 21 | 30 | 21 days overdue; no contact in 14+ days |  |
| 15 | C038 | Hospital | Collector 3 | ₱849,843 | 28 | 20 | 28 days overdue | open promise 2026-10-16 |
| 16 | C030 | Hospital | Collector 3 | ₱807,467 | 27 | 20 | 27 days overdue | open promise 2026-10-07 |
| 17 | C012 | Hospital | Collector 1 | ₱782,760 | 25 | 20 | 25 days overdue | open promise 2026-10-05 |
| 18 | C039 | Eye clinic | Collector 1 | ₱520,541 | 4 | 20 | 4 days overdue; no contact in 14+ days |  |
| 19 | C001 | Eye clinic | Collector 2 | ₱348,958 | 9 | 20 | 9 days overdue; no contact in 14+ days |  |
| 20 | C042 | Eye clinic | Collector 3 | ₱314,251 | 3 | 20 | 3 days overdue; no contact in 14+ days |  |
| 21 | C022 | Ambulatory surgical center | Collector 3 | ₱156,034 | 8 | 20 | 8 days overdue; no contact in 14+ days |  |
| 22 | C025 | Optical shop | Collector 2 | ₱49,179 | 8 | 20 | 8 days overdue; no contact in 14+ days |  |
| 23 | C031 | Optical shop | Collector 1 | ₱352,310 | 12 | 10 | 12 days overdue; bounced check in last 12 months; over credit limit (₱576,250 vs ₱550,000); no contact in 14+ days; PDCs on hand ₱576,250 cover the overdue amount |  |
| 24 | C046 | Eye clinic | Collector 3 | ₱521,585 | 5 | 0 | 5 days overdue; over credit limit (₱1,162,417 vs ₱900,000); no contact in 14+ days; PDCs on hand ₱521,585 cover the overdue amount |  |
| 25 | C044 | Eye clinic | Collector 1 | ₱180,250 | 7 | -10 | 7 days overdue; no contact in 14+ days; PDCs on hand ₱180,250 cover the overdue amount |  |
| 26 | C035 | Optical shop | Collector 3 | ₱132,496 | 3 | -10 | 3 days overdue; no contact in 14+ days; PDCs on hand ₱132,496 cover the overdue amount |  |
| 27 | C029 | Hospital | Collector 2 | ₱779,257 | 15 | -20 | 15 days overdue; PDCs on hand ₱1,230,027 cover the overdue amount |  |

Planted accounts' positions: C014 #1, C005 #2, C036 #3, C023 #4, C040 #5, C003 #9, C011 #13, C012 #17, C044 #25

On hold (open disputes / pending returns, not chased): C044 INV-12208 ₱191,360 (Pending return - near-expiry stock delivered)

## PDC calendar (checks on hand)
| Check date | Client | Amount | Flag |
| --- | --- | --- | --- |
| 2026-09-25 | C031 | ₱352,310 | PAST CHECK DATE - deposit now; client bounced a check in last 12 months |
| 2026-10-01 | C024 | ₱208,858 |  |
| 2026-10-01 | C044 | ₱180,250 |  |
| 2026-10-01 | C047 | ₱193,942 |  |
| 2026-10-02 | C051 | ₱276,770 |  |
| 2026-10-04 | C051 | ₱242,151 |  |
| 2026-10-04 | C053 | ₱219,589 |  |
| 2026-10-05 | C049 | ₱158,410 |  |
| 2026-10-06 | C050 | ₱129,951 |  |
| 2026-10-06 | C052 | ₱269,353 |  |
| 2026-10-07 | C052 | ₱212,425 |  |
| 2026-10-07 | C011 | ₱152,710 |  |
| 2026-10-08 | C007 | ₱56,250 |  |
| 2026-10-08 | C035 | ₱132,496 |  |
| 2026-10-09 | C016 | ₱98,360 |  |
| 2026-10-09 | C054 | ₱246,617 |  |
| 2026-10-09 | C054 | ₱230,614 |  |
| 2026-10-10 | C016 | ₱233,910 |  |
| 2026-10-12 | C023 | ₱120,520 | client bounced a check in last 12 months |
| 2026-10-12 | C032 | ₱262,763 |  |
| 2026-10-12 | C046 | ₱521,585 |  |
| 2026-10-13 | C041 | ₱194,158 |  |
| 2026-10-13 | C034 | ₱296,325 |  |
| 2026-10-13 | C029 | ₱319,460 |  |
| 2026-10-13 | C020 | ₱398,389 |  |
| 2026-10-14 | C015 | ₱363,634 |  |
| 2026-10-14 | C020 | ₱372,926 |  |
| 2026-10-14 | C034 | ₱320,478 |  |
| 2026-10-14 | C052 | ₱252,624 |  |
| 2026-10-17 | C031 | ₱223,940 | client bounced a check in last 12 months |

(Showing checks dated up to 2026-10-14 plus any flagged; 46 checks on hand in total, ₱11,012,883.)

Bounced and awaiting replacement: C014 ₱145,040 returned 2026-08-14 (47 days ago), C023 ₱289,060 returned 2026-09-10 (20 days ago)

## Escalation list
| Client | Trigger met | Recommended action | Approver |
| --- | --- | --- | --- |
| C014 | 90+ days overdue; 2 broken promises (90 days); bounced check unreplaced > 7 days | Credit-hold review | Middle management, then top |
| C005 | 90+ days overdue | Credit-hold review | Middle management, then top |
| C036 | 90+ days overdue | Credit-hold review | Middle management, then top |
| C023 | bounced check unreplaced > 7 days | Credit-hold review | Middle management, then top |
| C040 | 90+ days overdue | Credit-hold review | Middle management, then top |
| C048 | 3 broken promises (90 days) | Credit-hold review | Middle management, then top |
| C002 | one broken promise | Visit; inform sales rep | Collections supervisor |
| C008 | one broken promise | Visit; inform sales rep | Collections supervisor |
| C028 | Over credit limit (₱2,568,130 vs ₱1,900,000) but current | Credit-limit review; do not chase | Middle management |
