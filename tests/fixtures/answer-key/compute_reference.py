"""Reference calculation for the AI Tools demo data.

Reads ONE period folder (the same CSVs the AI tool gets) and applies the
proposed rules from the Financial Analysis and Collections briefs:
KPIs, priority scores, PDC calendar, escalation list, anomaly and bad-debt flags.

Usage:  python compute_reference.py ../P1_2026-08-31 2026-08-31 [previous_period_folder]
Output: printed report (markdown). This is the "expected result" to compare the AI's output against.
"""
import sys, pandas as pd, numpy as np

folder, cut = sys.argv[1], pd.Timestamp(sys.argv[2])
prev_folder = sys.argv[3] if len(sys.argv) > 3 else None
rd = lambda f, base=folder: pd.read_csv(f"{base}/{f}")
dates = {"sales_invoices.csv": ["invoice_date", "due_date"], "payments.csv": ["payment_date"],
         "ar_aging.csv": ["invoice_date", "due_date"], "pdc_register.csv": ["received_date", "check_date", "date_deposited"],
         "bounced_checks.csv": ["check_date", "date_returned", "replacement_received"],
         "collection_activity.csv": ["activity_date", "promise_date"], "credit_memos.csv": ["memo_date"],
         "disputes.csv": ["date_opened", "date_resolved"], "gl_extract.csv": ["as_of"]}
def load(f, base=folder):
    df = rd(f, base)
    for c in dates.get(f, []):
        df[c] = pd.to_datetime(df[c])
    return df
cust = load("customers.csv").set_index("client_code")
sales, pay, ar = load("sales_invoices.csv"), load("payments.csv"), load("ar_aging.csv")
pdc, bnc, act = load("pdc_register.csv"), load("bounced_checks.csv"), load("collection_activity.csv")
cm, dsp, gl = load("credit_memos.csv"), load("disputes.csv"), load("gl_extract.csv")
loss = load("aging_loss_history.csv"); annual = load("annual_sales_and_writeoffs.csv")
peso = lambda x: f"₱{x:,.0f}"
out = []
P = out.append

# ------------------------------------------------------------------ control checks
gl_ar = gl[(gl.account.str.startswith("Accounts receivable")) & (gl.as_of == cut)].balance.iloc[0]
gl_open = gl[(gl.account.str.startswith("Accounts receivable")) & (gl.as_of < cut)].balance.iloc[0]
unapplied = pay[pay.applied_status == "Unapplied"]
P(f"# Expected results: period ending {cut.date()}\n")
P("## Control checks")
P(f"- AR aging total {peso(ar.balance.sum())} vs ledger AR {peso(gl_ar)}; gap {peso(ar.balance.sum() - gl_ar)}"
  + (f" = unapplied payment(s) {peso(unapplied.amount.sum())}" if len(unapplied) else " (ties)"))
missing = set(ar.client_code) - set(cust.index)
P(f"- Client codes missing from customer master: {len(missing)}")

# ------------------------------------------------------------------ KPIs
open_disp = dsp[dsp.status == "Open"]
disputed_inv = set(open_disp.inv_no.dropna())
ar_net = gl_ar
s90 = sales[sales.invoice_date > cut - pd.Timedelta(days=90)].net_amount.sum()
dso = ar_net / s90 * 90
over60 = ar[ar.days_overdue > 60].balance.sum() / ar.balance.sum()
over90 = ar[ar.days_overdue > 90].balance.sum() / ar.balance.sum()
month_start = cut - pd.offsets.MonthBegin(1) if cut.day != 1 else cut
msales = sales[(sales.invoice_date > cut - pd.offsets.MonthEnd(1)) & (sales.invoice_date <= cut)].net_amount.sum()
mcoll = pay[(pay.payment_date > cut - pd.offsets.MonthEnd(1)) & (pay.payment_date <= cut)].amount.sum()
current_closing = ar[ar.days_overdue == 0].balance.sum()
coll_eff = mcoll / (gl_open + msales - current_closing)
overdue = ar[(ar.days_overdue > 0) & (~ar.inv_no.isin(disputed_inv))]
tot_overdue = overdue.balance.sum()
bounced_open = bnc[bnc.replaced == "N"]
dep_month = pdc[(pdc.date_deposited > cut - pd.offsets.MonthEnd(1)) & (pdc.date_deposited <= cut)]
bounce_rate = bnc[bnc.date_returned > cut - pd.offsets.MonthEnd(1)].amount.sum() / max(dep_month.amount.sum(), 1)
inv90 = set(ar[ar.days_overdue > 90].inv_no)
unrep_not90 = sum(r.amount for _, r in bounced_open.iterrows() if not set(str(r.invoices_covered).split(",")) <= inv90)
at_risk = ar[ar.days_overdue > 90].balance.sum() + unrep_not90
by_client_ar = ar.groupby("client_code").balance.sum().sort_values(ascending=False)
by_client_od = overdue.groupby("client_code").balance.sum().sort_values(ascending=False)
top10_ar = by_client_ar.head(10).sum() / ar.balance.sum()
top10_od = by_client_od.head(10).sum() / tot_overdue

# loss rates and bad-debt estimate
lr = loss.groupby("bucket").apply(lambda g: g.later_written_off.sum() / g.balance_at_year_end.sum(), include_groups=False)
bucket_bal = ar.groupby("bucket").balance.sum()
est_bad = sum(bucket_bal.get(b, 0) * lr[b] for b in lr.index)
allowance = -gl[gl.account.str.startswith("Allowance")].balance.iloc[0]
annual["pct"] = annual.bad_debt_written_off / annual.net_credit_sales

P("\n## KPI table (top management)")
P("| KPI | Value |\n| --- | --- |")
for k, v in [("DSO (AR ÷ last-90-day sales × 90)", f"{dso:.1f} days"),
             ("% of AR over 60 days", f"{over60:.1%}"), ("% of AR over 90 days", f"{over90:.1%}"),
             ("Collection efficiency (month)", f"{coll_eff:.1%}"),
             ("Total AR (aging) / ledger AR", f"{peso(ar.balance.sum())} / {peso(gl_ar)}"),
             ("Overdue AR excl. open disputes", peso(tot_overdue)),
             ("Bounced PDC rate (month, by value)", f"{bounce_rate:.1%}"),
             ("At-risk exposure (90+ plus unreplaced bounced checks not already 90+)", peso(at_risk)),
             ("Top-10 share of total AR", f"{top10_ar:.1%}"), ("Top-10 share of overdue AR", f"{top10_od:.1%}"),
             ("Estimated bad debt (aging x historical loss rate)", peso(est_bad)),
             ("Allowance for doubtful accounts (ledger)", peso(allowance)),
             ("Bad debt written off % of sales 2023 / 2024 / 2025", " / ".join(f"{x:.2%}" for x in annual.pct))]:
    P(f"| {k} | {v} |")
P("\nLoss rates used: " + ", ".join(f"{b} {lr[b]:.2%}" for b in ["Current", "1-30", "31-60", "61-90", "90+"]))
P("\nAging buckets: " + ", ".join(f"{b} {peso(bucket_bal.get(b, 0))}" for b in ["Current", "1-30", "31-60", "61-90", "90+"]))

# expected inflow next 4 weeks
weeks = [(cut + pd.Timedelta(days=7 * i + 1), cut + pd.Timedelta(days=7 * (i + 1))) for i in range(4)]
onhand = pdc[pdc.status == "On hand"]
pdc_clients = set(cust.index[cust.usual_payment_method == "Check (PDC)"])
latest_promise = act.dropna(subset=["promise_date"]).sort_values("activity_date").groupby("client_code").tail(1)
open_prom = latest_promise[latest_promise.promise_date > cut]
cur_due = ar[(ar.days_overdue == 0) & (~ar.client_code.isin(pdc_clients))]
rows = []
for i, (a, b) in enumerate(weeks):
    p_ = onhand[(onhand.check_date <= b) & ((onhand.check_date >= a) | (i == 0))].amount.sum()
    pr = open_prom[(open_prom.promise_date >= a) & (open_prom.promise_date <= b)].promise_amount.fillna(0).sum()
    du = cur_due[(cur_due.due_date >= a) & (cur_due.due_date <= b)].balance.sum()
    rows.append((f"Week {i+1} ({a.date()} to {b.date()})", p_, pr, du))
P("\n## Expected inflow, next 4 weeks")
P("| Week | PDCs maturing | Promises due | Current invoices falling due (non-PDC clients) | Total |\n| --- | --- | --- | --- | --- |")
tots = []
for w, a1, a2, a3 in rows:
    tots.append(a1 + a2 + a3); P(f"| {w} | {peso(a1)} | {peso(a2)} | {peso(a3)} | {peso(a1+a2+a3)} |")

# ------------------------------------------------------------------ middle-management view
P("\n## AR by rep")
s_m = sales[sales.invoice_date > cut - pd.offsets.MonthEnd(1)]
s90r = sales[sales.invoice_date > cut - pd.Timedelta(days=90)]
P("| Rep | Total AR | Overdue | % over 60 | DSO | Discount rate (month) | Credit memo rate (12 mo) | Sales this month to clients 60+ overdue |\n| --- | --- | --- | --- | --- | --- | --- | --- |")
od60_clients = set(ar[ar.days_overdue > 60].client_code)
for rep, g in ar.groupby("rep"):
    sm = s_m[s_m.rep == rep]
    P(f"| {rep} | {peso(g.balance.sum())} | {peso(g[g.days_overdue > 0].balance.sum())} | "
      f"{g[g.days_overdue > 60].balance.sum() / g.balance.sum():.1%} | "
      f"{g.balance.sum() / s90r[s90r.rep == rep].net_amount.sum() * 90:.0f} | "
      f"{sm.discount_amount.sum() / max(sm.gross_amount.sum(), 1):.1%} | "
      f"{cm[cm.rep == rep].amount.sum() / sales[sales.rep == rep].net_amount.sum():.2%} | "
      f"{peso(sm[sm.client_code.isin(od60_clients)].net_amount.sum())} |")

# ------------------------------------------------------------------ anomaly and bad-debt flags
flags = []
F = lambda flag, who, amt, rule, src, owner: flags.append((flag, who, amt, rule, src, owner))
six = sales[sales.invoice_date > cut - pd.Timedelta(days=183)].copy()
six["rate"] = six.discount_amount / six.gross_amount
for _, r in six[six.invoice_date > cut - pd.offsets.MonthEnd(1)].iterrows():
    hist = six[(six.client_code == r.client_code) & (six.inv_no != r.inv_no)].rate.mean()
    if r.rate > 0.10 or (r.rate > 0 and r.rate > 2 * hist):
        F("Discount above norm", f"{r.client_code} / {r.rep}", r.discount_amount,
          f"{r.rate:.0%} discount vs client's 6-month average {hist:.1%}; policy max 10%", r.inv_no, "Sales manager")
lim = {"Sales Manager": 20_000, "Finance Head": 100_000, "Top management": 1e12}
for _, r in cm[cm.memo_date > cut - pd.offsets.MonthEnd(1)].iterrows():
    if pd.isna(r.approver_role) or r.amount > lim.get(r.approver_role, 0):
        F("Unapproved credit memo", f"{r.client_code} / {r.rep}", r.amount,
          "No approver recorded" if pd.isna(r.approver_role) else f"Above {r.approver_role} limit", r.memo_no, "Finance head")
ret = cm[cm.reason.str.startswith("Return")].sort_values("memo_date")
for c, g in ret.groupby("client_code"):
    d = g.memo_date.diff().dt.days
    recent = (g.memo_date > cut - pd.offsets.MonthEnd(1)) & (d <= 30)
    if recent.any():
        F("Repeated returns", c, g.amount.sum(), "2+ returns within 30 days", ",".join(g.memo_no), "Sales manager")
sm2 = sales[sales.invoice_date > cut - pd.Timedelta(days=60)].sort_values("invoice_date")
for (c, amt), g in sm2.groupby(["client_code", "net_amount"]):
    if len(g) > 1 and (g.invoice_date.diff().dt.days <= 3).any():
        F("Possible duplicate invoice", c, amt, "Same client, same amount within 3 days", " & ".join(g.inv_no), "Finance head")
for _, r in unapplied.iterrows():
    days = (cut - r.payment_date).days
    if days >= 15:
        F("Unapplied payment", r.client_code, r.amount, f"Not matched to an invoice for {days} days", r.payment_id, "Accounting")
risk_clients = set(ar[ar.days_overdue > 90].client_code)
for _, r in s_m[s_m.client_code.isin(risk_clients)].iterrows():
    F("Order to an at-risk client", f"{r.client_code} / {r.rep}", r.net_amount, "New invoice while client has 90+ day balance", r.inv_no, "Sales manager, credit review")
if prev_folder:
    pa = load("ar_aging.csv", prev_folder).groupby("client_code").balance.sum()
    for c, v in by_client_ar.items():
        pv = pa.get(c, 0)
        if pv > 0 and v >= 1.5 * pv and (v - pv) >= 0.01 * ar.balance.sum():
            F("Sudden balance jump", c, v - pv, f"AR {peso(pv)} → {peso(v)} (+{v/pv-1:.0%}); increase ≥ 1% of total AR", "ar_aging.csv", "Credit review")
avg4 = np.mean(tots)
for (w, *_), t in zip(rows, tots):
    if t < 0.75 * avg4:
        F("Inflow drop", w.split(" (")[0], t, f"{t/avg4:.0%} of 4-week average", "expected inflow table", "Top management")
for c, v in by_client_od.items():
    if v / tot_overdue > 0.15:
        F("Concentration", c, v, f"{v/tot_overdue:.0%} of total overdue", "ar_aging.csv", "Top management")
# bad debt
last_pay = pay.groupby("client_code").payment_date.max()
for c, g in ar.groupby("client_code"):
    mx = g.days_overdue.max()
    lp = last_pay.get(c)
    since = (cut - lp).days if lp is not None else None
    no_pay60 = since is None or since > 60
    unrep = bounced_open[bounced_open.client_code == c]
    a = act[(act.client_code == c) & (act.activity_date > cut - pd.Timedelta(days=60))]
    noresp = a.outcome.str.contains("No answer|No response|unattended|unreachable", case=False).sum()
    reasons = []
    if mx > 120: reasons.append(f"{mx} days overdue")
    if mx > 90 and no_pay60: reasons.append(f"90+ and no payment in {since} days" if since else "90+ and no payment in 12 months")
    if len(unrep) >= 2: reasons.append("2+ unreplaced bounced checks")
    if noresp >= 3: reasons.append(f"{noresp} unanswered contact attempts in 60 days")
    if mx > 365 or a.action.eq("Demand letter").any() or act[act.client_code == c].action.eq("Demand letter").any() and mx > 180:
        F("Write-off candidate", c, g[g.days_overdue > 90].balance.sum(), f"{mx} days overdue; demand letter already sent" if act[act.client_code == c].action.eq("Demand letter").any() else f"{mx} days overdue", "ar_aging.csv", "Top management with accountant")
    elif reasons:
        F("Doubtful account", c, g.balance.sum(), "; ".join(reasons), "ar_aging.csv", "Finance head")
if est_bad > allowance:
    F("Allowance shortfall", "Portfolio", est_bad - allowance, f"Estimate {peso(est_bad)} vs allowance {peso(allowance)}", "gl_extract.csv", "Top management")

P("\n## Exceptions and bad-debt flags")
P("| Flag | Client / rep | Amount | Rule triggered | Source row | Owner |\n| --- | --- | --- | --- | --- | --- |")
for f in flags:
    P(f"| {f[0]} | {f[1]} | {peso(f[2])} | {f[3]} | {f[4]} | {f[5]} |")

# ------------------------------------------------------------------ collections: priority list
od = overdue.groupby("client_code").agg(overdue=("balance", "sum"), oldest=("days_overdue", "max"))
# unapplied cash sits against the client's overdue balance (oldest invoices first)
netted = {}
for c, g in unapplied.groupby("client_code"):
    if c in od.index:
        left = g.amount.sum()
        inv_c = overdue[overdue.client_code == c].sort_values("due_date")
        rem = inv_c.balance.cumsum() - left
        still = inv_c[rem > 0]
        netted[c] = left
        od.loc[c, "overdue"] = max(od.loc[c, "overdue"] - left, 0)
        od.loc[c, "oldest"] = still.days_overdue.max() if len(still) else 0
od = od[od.overdue > 0]
od["oldest"] = od.oldest.astype(int)
q80, q50 = od.overdue.quantile(0.8), od.overdue.quantile(0.5)
paid = pay.merge(sales[["inv_no", "due_date"]], left_on="applied_to_invoice", right_on="inv_no", how="inner")
paid["late"] = (paid.payment_date - paid.due_date).dt.days
bal_total = ar.groupby("client_code").balance.sum()
last_contact = act.groupby("client_code").activity_date.max()
rows = []
for c, r in od.iterrows():
    pts, why = 0, []
    o = int(r.oldest)
    b = 10 if o <= 30 else 20 if o <= 60 else 30 if o <= 90 else 40
    pts += b; why.append(f"{o} days overdue")
    a = 20 if r.overdue >= q80 else 10 if r.overdue >= q50 else 0
    pts += a
    # broken promise in last 30 days
    pr = act[(act.client_code == c) & act.promise_date.notna() & (act.promise_date <= cut) & (act.promise_date > cut - pd.Timedelta(days=30))]
    broke = False
    for _, p in pr.iterrows():
        got = pay[(pay.client_code == c) & (pay.payment_date > p.activity_date) & (pay.payment_date <= p.promise_date)].amount.sum()
        if pd.notna(p.promise_amount) and got < 0.9 * p.promise_amount: broke = True
    if broke: pts += 15; why.append("broke a promise in the last 30 days")
    if (bnc.client_code == c).any(): pts += 10; why.append("bounced check in last 12 months" + (" (not replaced)" if (bounced_open.client_code == c).any() else ""))
    if bal_total.get(c, 0) > cust.loc[c, "credit_limit"]: pts += 10; why.append(f"over credit limit ({peso(bal_total[c])} vs {peso(cust.loc[c, 'credit_limit'])})")
    lc = last_contact.get(c)
    if lc is None or (cut - lc).days >= 14: pts += 10; why.append("no contact in 14+ days")
    pl = paid[paid.client_code == c]
    if len(pl) >= 3:
        recent = pl[pl.payment_date > cut - pd.Timedelta(days=91)].late.mean()
        if pd.notna(recent) and recent - pl.late.mean() >= 15:
            pts += 5; why.append(f"slowdown: paying {recent:.0f} days late vs {pl.late.mean():.0f}-day 12-month average")
    cover = onhand[onhand.client_code == c].amount.sum()
    if cover >= r.overdue: pts -= 30; why.append(f"PDCs on hand {peso(cover)} cover the overdue amount")
    op = open_prom[open_prom.client_code == c]
    rows.append((c, cust.loc[c, "segment"], cust.loc[c, "collector"], r.overdue, o, pts, "; ".join(why),
                 (f"open promise {op.promise_date.iloc[0].date()}" if len(op) else "")))
lst = sorted(rows, key=lambda x: (-x[5], -x[3]))
P(f"\n## Collections: prioritized follow-up list ({len(lst)} accounts with overdue balances; full list)")
P("| Rank | Client | Segment | Collector | Overdue | Oldest days | Score | Reason | Open promise |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
for i, x in enumerate(lst, 1):
    P(f"| {i} | {x[0]} | {x[1]} | {x[2]} | {peso(x[3])} | {x[4]} | {x[5]} | {x[6]} | {x[7]} |")
P("\nPlanted accounts' positions: " + ", ".join(f"{x[0]} #{i}" for i, x in enumerate(lst, 1)
   if x[0] in {"C014", "C007", "C011", "C023", "C003", "C005", "C036", "C040", "C019", "C012", "C044"}))
for c, v in netted.items():
    P(f"\nUnapplied cash netted against {c}'s overdue balance: {peso(v)}" + (" — account drops off the list" if c not in od.index else ""))
P(f"\nOn hold (open disputes / pending returns, not chased): " +
  (", ".join(f"{r.client_code} {r.inv_no} {peso(r.amount)} ({r.reason})" for _, r in open_disp.iterrows()) or "none"))

# PDC calendar
P("\n## PDC calendar (checks on hand)")
P("| Check date | Client | Amount | Flag |\n| --- | --- | --- | --- |")
bouncers = set(bnc.client_code)
for _, r in onhand.sort_values("check_date").iterrows():
    fl = []
    if r.check_date <= cut: fl.append("PAST CHECK DATE - deposit now")
    if (cut - r.check_date).days > 150: fl.append("nearing stale")
    if r.client_code in bouncers: fl.append("client bounced a check in last 12 months")
    if r.check_date <= cut + pd.Timedelta(days=14) or fl:
        P(f"| {r.check_date.date()} | {r.client_code} | {peso(r.amount)} | {'; '.join(fl)} |")
P(f"\n(Showing checks dated up to {(cut + pd.Timedelta(days=14)).date()} plus any flagged; {len(onhand)} checks on hand in total, {peso(onhand.amount.sum())}.)")
P("\nBounced and awaiting replacement: " + (", ".join(f"{r.client_code} {peso(r.amount)} returned {r.date_returned.date()} ({(cut - r.date_returned).days} days ago)" for _, r in bounced_open.iterrows()) or "none"))

# broken promises & escalation
P("\n## Escalation list")
P("| Client | Trigger met | Recommended action | Approver |\n| --- | --- | --- | --- |")
for c, *_ in lst:
    o = int(od.loc[c, "oldest"])
    unrep7 = bounced_open[(bounced_open.client_code == c) & ((cut - bounced_open.date_returned).dt.days > 7)]
    pr = act[(act.client_code == c) & act.outcome.str.startswith("Promise missed") & (act.activity_date > cut - pd.Timedelta(days=90))]
    trig = []
    if o > 90: trig.append("90+ days overdue")
    if len(pr) >= 2: trig.append(f"{len(pr)} broken promises (90 days)")
    if len(unrep7): trig.append("bounced check unreplaced > 7 days")
    if trig:
        P(f"| {c} | {'; '.join(trig)} | Credit-hold review | Middle management, then top |")
    elif o > 60 or len(pr) == 1:
        P(f"| {c} | {'61-90 days' if o > 60 else 'one broken promise'} | Visit; inform sales rep | Collections supervisor |")
for c in bal_total.index:
    if bal_total[c] > cust.loc[c, "credit_limit"] and c not in od.index:
        P(f"| {c} | Over credit limit ({peso(bal_total[c])} vs {peso(cust.loc[c, 'credit_limit'])}) but current | Credit-limit review; do not chase | Middle management |")
print("\n".join(out))
