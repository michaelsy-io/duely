import { generateObject } from "ai";
import { z } from "zod";
import type { FollowUpRow } from "@/lib/engine/types";
import type { DraftTone } from "@/lib/db/drafts";
import { getModel, modelId } from "@/lib/ai/provider";
import { verifyNumbers } from "@/lib/ai/verify";
import {
  bouncedChecks,
  contactOf,
  engine,
  nameOf,
  openInvoices,
  peso,
  shortDate,
  type Period,
} from "@/lib/ai/context";

export type Channel = "email" | "sms";

/** Everything a draft may cite. Built by code from the engine; the writer may use nothing else. */
export interface DraftPayload {
  period: Period;
  asOf: string;
  client_code: string;
  client_name: string;
  contact_person: string | null;
  segment: string;
  collector: string;
  rank: number;
  overdue: number;
  totalBalance: number;
  oldestDays: number;
  creditLimit: number;
  pdcCover: number;
  reasons: string[];
  openPromise: { amount: number; date: string } | null;
  brokePromise: boolean;
  escalation: { action: string; triggers: string[] } | null;
  overdueInvoices: { inv_no: string; due_date: string | null; balance: number; days_overdue: number }[];
  overdueInvoiceCount: number;
  bouncedUnreplaced: { check_no: string; amount: number; date_returned: string | null }[];
  pdcs: { check_no: string; amount: number; check_date: string }[];
}

export function brokePromise(row: FollowUpRow): boolean {
  return (
    row.factors.some((f) => /promise/i.test(f.label) && f.points > 0) ||
    row.reasons.some((r) => /(broke|missed|broken).*promise|promise.*(broke|missed|broken)/i.test(r))
  );
}

/**
 * Tone rule (code, not AI):
 *  - final: escalation is a credit hold AND oldest item is 90+ days
 *  - firm: oldest item 31+ days OR a promise was broken
 *  - friendly: otherwise
 */
export function chooseTone(row: FollowUpRow, escalationAction?: string | null): DraftTone {
  if (escalationAction && /credit hold/i.test(escalationAction) && row.oldestDays >= 90) return "final";
  if (row.oldestDays >= 31 || brokePromise(row)) return "firm";
  return "friendly";
}

export function buildDraftPayload(period: Period, row: FollowUpRow): DraftPayload {
  const res = engine(period);
  const esc = res.escalations.find((e) => e.client_code === row.client_code) ?? null;
  const inv = openInvoices(period, row.client_code).filter((i) => i.days_overdue > 0);
  const bounced = bouncedChecks(period, row.client_code).filter((b) => !b.replaced);
  const contact = contactOf(row.client_code);
  return {
    period,
    asOf: res.asOf,
    client_code: row.client_code,
    client_name: nameOf(row.client_code),
    contact_person: contact?.contact_person ?? null,
    segment: row.segment,
    collector: row.collector,
    rank: row.rank,
    overdue: row.overdue,
    totalBalance: row.totalBalance,
    oldestDays: row.oldestDays,
    creditLimit: row.creditLimit,
    pdcCover: row.pdcCover,
    reasons: row.reasons,
    openPromise: row.openPromise,
    brokePromise: brokePromise(row),
    escalation: esc ? { action: esc.action, triggers: esc.triggers } : null,
    overdueInvoices: inv.slice(0, 6).map((i) => ({ inv_no: i.inv_no, due_date: i.due_date, balance: i.balance, days_overdue: i.days_overdue })),
    overdueInvoiceCount: inv.length,
    bouncedUnreplaced: bounced.map((b) => ({ check_no: b.check_no, amount: b.amount, date_returned: b.date_returned })),
    pdcs: res.pdcs
      .filter((p) => p.client_code === row.client_code)
      .map((p) => ({ check_no: p.check_no, amount: p.amount, check_date: p.check_date })),
  };
}

export interface DraftText {
  subject: string;
  body: string;
  source: "ai" | "template";
  model?: string;
  attempts?: number;
  note?: string;
}

// ---------------------------------------------------------------- templates

function invoiceLines(p: DraftPayload, max = 5): string {
  const lines = p.overdueInvoices
    .slice(0, max)
    .map((i) => `- ${i.inv_no} · ${peso(i.balance)} · due ${shortDate(i.due_date, true)} (${i.days_overdue} days overdue)`);
  if (p.overdueInvoiceCount > max) lines.push(`- plus ${p.overdueInvoiceCount - max} more overdue invoice(s)`);
  return lines.join("\n");
}

function bouncedLine(p: DraftPayload): string {
  return p.bouncedUnreplaced
    .map((b) => `Check ${b.check_no} for ${peso(b.amount)} was returned by the bank on ${shortDate(b.date_returned, true)} and has not yet been replaced.`)
    .join(" ");
}

/** Deterministic draft built only from payload values. Used with no AI key, or when AI text fails review. */
export function templateDraft(p: DraftPayload, tone: DraftTone, channel: Channel = "email"): DraftText {
  const greet = p.contact_person ? `Dear ${p.contact_person},` : `Dear ${p.client_name} Accounts Team,`;
  const asOf = shortDate(p.asOf, true);
  const oldest = p.overdueInvoices[0];
  const pdc = p.pdcCover > 0 ? `We have your post-dated checks totalling ${peso(p.pdcCover)} on hand — thank you.` : "";

  if (channel === "sms") {
    const base =
      tone === "friendly"
        ? `Hi from Collections! Thank you for your business. Gentle reminder: ${peso(p.overdue)} on your ${p.client_name} account is past due as of ${asOf}. Please disregard if already paid.`
        : tone === "firm"
          ? `${p.client_name}: ${peso(p.overdue)} is overdue as of ${asOf}${oldest ? `, oldest ${oldest.inv_no} (${oldest.days_overdue} days)` : ""}. Please reply with your payment date.`
          : `FINAL NOTICE ${p.client_name}: ${peso(p.overdue)} overdue as of ${asOf}. Settle or agree a payment plan within 7 days to avoid credit hold. A formal letter follows by email.`;
    return { subject: "", body: base.slice(0, 320), source: "template" };
  }

  if (tone === "friendly") {
    return {
      source: "template",
      subject: `Friendly reminder: ${peso(p.overdue)} past due on your account`,
      body: [
        greet,
        "",
        `Thank you for your continued partnership. This is a gentle reminder that ${peso(p.overdue)} on your account was past due as of ${asOf}.`,
        "",
        invoiceLines(p),
        pdc ? `\n${pdc}` : "",
        "",
        "If payment is already on its way, please disregard this note and share the reference so we can apply it promptly. Otherwise, we would appreciate settlement at your earliest convenience.",
        "",
        "Warm regards,",
        "Collections Team",
      ]
        .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
        .join("\n"),
    };
  }

  if (tone === "firm") {
    const facts = [
      `As of ${asOf}, your overdue balance is ${peso(p.overdue)} (total balance ${peso(p.totalBalance)}).`,
      oldest ? `The oldest item, ${oldest.inv_no}, is ${oldest.days_overdue} days overdue.` : "",
      bouncedLine(p),
      p.brokePromise ? "We also note that a recent payment commitment was not met." : "",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      source: "template",
      subject: `Overdue balance of ${peso(p.overdue)} — please confirm a payment date`,
      body: [
        greet,
        "",
        facts,
        "",
        invoiceLines(p),
        "",
        "Please reply with the date you will settle these invoices, or call us so we can agree a schedule. If payment has been made, kindly send the deposit details so we can update your account.",
        "",
        "Thank you,",
        "Collections Team",
      ].join("\n"),
    };
  }

  // final
  return {
    source: "template",
    subject: `FINAL NOTICE: overdue account of ${p.client_name} — ${peso(p.overdue)}`,
    body: [
      greet,
      "",
      `Despite our previous reminders, your account shows an overdue balance of ${peso(p.overdue)} as of ${asOf}, with the oldest item ${oldest ? `${oldest.inv_no} at ${oldest.days_overdue} days overdue` : "more than 90 days overdue"}.`,
      bouncedLine(p),
      "",
      invoiceLines(p, 6),
      "",
      "Unless the overdue balance is settled, or a written payment arrangement is agreed with us, within seven (7) days of this notice, your account will be placed on credit hold and further deliveries on credit will be suspended. The account may then be referred for further collection action.",
      "",
      "This notice is issued with the approval of management. Please contact us immediately to resolve this matter.",
      "",
      "Sincerely,",
      "Collections Department",
    ]
      .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
      .join("\n"),
  };
}

// ---------------------------------------------------------------- AI writer

const TONE_GUIDE: Record<DraftTone, string> = {
  friendly: "Friendly: open with a warm thank-you for the partnership, then a gentle reminder. No pressure, no consequences.",
  firm: "Firm: polite but direct. State the facts clearly (amount, oldest invoice, any bounced check or missed promise) and ask the client to commit to a specific payment date. No threats.",
  final:
    "Final notice: formal and serious. State the overdue facts, give a deadline of seven (7) days, and state the consequence (credit hold, suspension of credit deliveries, possible referral for further collection action). Mention it is issued with management approval.",
};

const SYSTEM = `You write accounts-receivable collection messages for an ophthalmic medical distributor in the Philippines.
Rules:
- Use ONLY the amounts, dates, invoice numbers and check numbers in the FACTS JSON. Never compute, round differently, total or invent a number. Format pesos like ₱1,234,567 and dates like 31 Aug 2026.
- Do not mention internal scores, ranks, rules or collectors.
- English, concise, professional, Filipino business courtesy.
- Never threaten legal action unless the tone is "final".`;

export async function writeDraft(p: DraftPayload, tone: DraftTone, channel: Channel = "email"): Promise<DraftText> {
  const model = getModel("smart");
  if (!model) return { ...templateDraft(p, tone, channel), note: "No AI key — template draft" };
  const schema = z.object({ subject: z.string(), body: z.string() });
  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema,
        system: SYSTEM,
        prompt: [
          `Tone: ${tone}. ${TONE_GUIDE[tone]}`,
          channel === "sms"
            ? "Channel: SMS. Body at most 300 characters, subject empty string."
            : "Channel: email. Subject one line; body under 1800 characters with a short invoice list.",
          `FACTS:\n${JSON.stringify(p, null, 1)}`,
          feedback,
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      const v = verifyNumbers(`${object.subject}\n${object.body}`, p);
      if (v.ok) return { ...object, source: "ai", model: modelId("smart") ?? undefined, attempts: attempt };
      feedback = `Your previous draft used values not in FACTS: ${v.unknown.join(", ")}. Rewrite using only FACTS values.`;
    } catch (e) {
      feedback = "";
      if (attempt === 2) console.warn("[draft] AI writer failed", e);
    }
  }
  return { ...templateDraft(p, tone, channel), note: "AI draft failed the number check — template used" };
}
