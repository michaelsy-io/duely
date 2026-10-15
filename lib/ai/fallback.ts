// Keyless chat: deterministic answers assembled from the engine, so the demo works without an AI key.
import { engine, nameOf, pctText, peso, shortDate, type Period } from "@/lib/ai/context";
import { templateExplain } from "@/lib/ai/agents/explain";

export function fallbackAnswer(question: string, period: Period): string {
  const r = engine(period);
  const q = question.toLowerCase();
  const chip = (label: string) => `(${label} · ${shortDate(r.asOf)})`;
  const footer = "\n\n_AI is off (no API key) — this answer is built directly from the engine._";

  const code = question.toUpperCase().match(/\bC\d{3}\b/)?.[0];
  if (code) {
    const row = r.followUp.find((f) => f.client_code === code);
    const hold = r.onHold.find((o) => o.client_code === code);
    const pdcs = r.pdcs.filter((p) => p.client_code === code);
    const esc = r.escalations.filter((e) => e.client_code === code);
    const lines = [`**${nameOf(code)} (${code})**`];
    if (row) lines.push(templateExplain(row) + ` ${chip("Follow-up list")}`);
    else lines.push(`Not on the follow-up list this period. ${chip("Follow-up list")}`);
    if (hold) lines.push(`On hold: ${hold.reason} (${peso(hold.amount)}).`);
    if (pdcs.length) lines.push(`PDCs on hand: ${pdcs.map((p) => `${p.check_no} ${peso(p.amount)} dated ${shortDate(p.check_date)}`).join("; ")} ${chip("PDC calendar")}`);
    if (esc.length) lines.push(`Escalation: ${esc.map((e) => `${e.action} — ${e.triggers.join(", ")}`).join("; ")}`);
    return lines.join("\n\n") + footer;
  }

  if (/\b(kpi|dso|overdue|efficien|allowance|bad debt|summary|cfo|health)\b/.test(q)) {
    const k = r.kpis;
    return (
      [
        `**Receivables as of ${shortDate(r.asOf, true)}** ${chip("KPIs")}`,
        `- Total AR: ${peso(k.totalAr)}`,
        `- DSO: ${k.dso.toFixed(1)} days`,
        `- Over 60 days: ${pctText(k.pctOver60)} · over 90 days: ${pctText(k.pctOver90)}`,
        `- Overdue (excl. disputes): ${peso(k.overdueExclDisputes)}`,
        `- Collection efficiency: ${pctText(k.collectionEfficiency)}`,
        `- Estimated bad debt ${peso(k.estimatedBadDebt)} vs allowance ${peso(k.allowance)}`,
      ].join("\n") + footer
    );
  }

  if (/\b(pdc|check|cheque|deposit|bounce)/.test(q)) {
    const soon = [...r.pdcs].sort((a, b) => a.check_date.localeCompare(b.check_date)).slice(0, 6);
    const lines = [`**Checks to deposit next** ${chip("PDC calendar")}`];
    for (const p of soon) lines.push(`- ${shortDate(p.check_date)} · ${nameOf(p.client_code)} · ${p.check_no} · ${peso(p.amount)}${p.flags.length ? ` (${p.flags.join(", ")})` : ""}`);
    if (r.bouncedOpen.length) {
      lines.push("", "**Bounced, not yet replaced**");
      for (const b of r.bouncedOpen) lines.push(`- ${nameOf(b.client_code)} · ${peso(b.amount)} · returned ${shortDate(b.date_returned)} (${b.daysAgo} days ago)`);
    }
    return lines.join("\n") + footer;
  }

  if (/\b(draft|email|write|send|message|remind)/.test(q)) {
    return (
      "Drafting needs a supervisor-approval run. Open **Approvals** and press *Run month agents* — with no AI key Duely creates template drafts from the engine numbers, and nothing is sent until a supervisor approves." +
      footer
    );
  }

  const top = r.followUp.slice(0, 3);
  const lines = [`**Call these ${top.length} first today** ${chip("Follow-up list")}`];
  top.forEach((f) => lines.push(`${f.rank}. **${nameOf(f.client_code)}** — ${peso(f.overdue)} overdue. ${f.reasonText}.`));
  return lines.join("\n") + footer;
}
