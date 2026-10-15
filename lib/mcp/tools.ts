// Data tools shared by the in-app chat (AI SDK) and the MCP server.
// Every number returned comes from the engine or the demo CSVs — never from a model.
import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { logContact, listContacts } from "@/lib/db/activity";
import { searchKnowledge } from "@/lib/rag";
import {
  activityHistory,
  bouncedChecks,
  contactOf,
  engine,
  nameOf,
  normalizePeriod,
  openInvoices,
  shortDate,
  type Period,
} from "@/lib/ai/context";
import { draftForClient } from "@/lib/ai/agents/orchestrator";

export interface ToolCtx {
  period: Period;
}

const periodField = z.enum(["P1", "P2"]).optional().describe("Demo period: P1 = 31 Aug 2026, P2 = 30 Sep 2026. Defaults to the selected period.");
const pick = (ctx: ToolCtx, p?: string) => normalizePeriod(p) ?? ctx.period;
const chip = (label: string, asOf: string) => `${label} · ${shortDate(asOf)}`;

function def<S extends z.ZodObject<z.ZodRawShape>>(d: {
  name: string;
  description: string;
  inputSchema: S;
  execute: (input: z.infer<S>, ctx: ToolCtx) => Promise<unknown>;
}) {
  return d;
}

export const getTodayList = def({
  name: "get_today_list",
  description:
    "Today's ranked collections follow-up list (who to call first) with each client's score and the engine's plain-words reasons. Optionally filter by collector (e.g. 'Collector 1').",
  inputSchema: z.object({
    collector: z.string().optional(),
    limit: z.number().int().min(1).max(60).default(10),
    period: periodField,
  }),
  async execute({ collector, limit, period }, ctx) {
    const p = pick(ctx, period);
    const r = engine(p);
    const want = collector?.trim().toLowerCase();
    const rows = r.followUp
      .filter((f) => !want || f.collector.toLowerCase() === want || f.collector.toLowerCase().endsWith(` ${want}`))
      .slice(0, limit ?? 10)
      .map((f) => ({
        rank: f.rank,
        client_code: f.client_code,
        client_name: nameOf(f.client_code),
        collector: f.collector,
        segment: f.segment,
        score: f.score,
        overdue: f.overdue,
        oldestDays: f.oldestDays,
        reasonText: f.reasonText,
        openPromise: f.openPromise,
        pdcCover: f.pdcCover,
      }));
    return {
      period: p,
      asOf: r.asOf,
      source: chip("Follow-up list", r.asOf),
      totalOnList: r.followUp.length,
      onHold: r.onHold.map((o) => ({ ...o, client_name: nameOf(o.client_code) })),
      rows,
    };
  },
});

export const getClient = def({
  name: "get_client",
  description:
    "Everything about one client: follow-up row (score factors, reasons), open invoices, PDCs on hand, bounced checks, escalations, on-hold status and recent collection contacts.",
  inputSchema: z.object({ client_code: z.string().describe("e.g. C014"), period: periodField }),
  async execute({ client_code, period }, ctx) {
    const p = pick(ctx, period);
    const code = client_code.trim().toUpperCase();
    const r = engine(p);
    const row = r.followUp.find((f) => f.client_code === code) ?? null;
    const invoices = openInvoices(p, code);
    let logged: unknown[] = [];
    try {
      logged = await listContacts(code, p);
    } catch {
      logged = [];
    }
    return {
      period: p,
      asOf: r.asOf,
      source: chip("Client file", r.asOf),
      client_code: code,
      client_name: nameOf(code),
      contact: contactOf(code),
      followUp: row,
      onHold: r.onHold.find((o) => o.client_code === code) ?? null,
      escalations: r.escalations.filter((e) => e.client_code === code),
      pdcs: r.pdcs.filter((x) => x.client_code === code),
      bouncedOpen: r.bouncedOpen.filter((b) => b.client_code === code),
      bouncedHistory: bouncedChecks(p, code),
      flags: r.flags.filter((f) => (f as { client_code?: string | null }).client_code === code || f.who === code),
      openInvoices: invoices,
      openInvoiceTotal: Math.round(invoices.reduce((a, i) => a + i.balance, 0) * 100) / 100,
      recentContacts: activityHistory(p, code, 6),
      loggedContacts: logged,
    };
  },
});

export const getKpis = def({
  name: "get_kpis",
  description: "Month-end receivables KPIs (DSO, % over 60/90, collection efficiency, overdue, bad-debt estimate vs allowance, aging buckets) and the aging-vs-ledger control check.",
  inputSchema: z.object({ period: periodField }),
  async execute({ period }, ctx) {
    const p = pick(ctx, period);
    const r = engine(p);
    return {
      period: p,
      asOf: r.asOf,
      source: chip("KPIs", r.asOf),
      kpis: r.kpis,
      control: r.control,
      inflow: r.inflow,
      flagCount: r.flags.length,
      note: "Ratios are fractions (0.452 = 45.2%). DSO is in days.",
    };
  },
});

export const getPdcCalendar = def({
  name: "get_pdc_calendar",
  description: "Post-dated checks on hand by check date (next weeks), with flags such as nearing stale, plus open bounced checks.",
  inputSchema: z.object({ period: periodField }),
  async execute({ period }, ctx) {
    const p = pick(ctx, period);
    const r = engine(p);
    const pdcs = [...r.pdcs].sort((a, b) => a.check_date.localeCompare(b.check_date)).map((x) => ({ ...x, client_name: nameOf(x.client_code) }));
    const byWeek: Record<string, { count: number; total: number }> = {};
    for (const x of pdcs) {
      const k = x.week ? `week ${x.week}` : "later";
      byWeek[k] ??= { count: 0, total: 0 };
      byWeek[k].count++;
      byWeek[k].total = Math.round((byWeek[k].total + x.amount) * 100) / 100;
    }
    return {
      period: p,
      asOf: r.asOf,
      source: chip("PDC calendar", r.asOf),
      byWeek,
      pdcs,
      bouncedOpen: r.bouncedOpen.map((b) => ({ ...b, client_name: nameOf(b.client_code) })),
    };
  },
});

export const searchLedger = def({
  name: "search_ledger",
  description: "Semantic search over the ledger, policies and collection notes (RAG). Use for questions about specific transactions, memos, policies or history.",
  inputSchema: z.object({ query: z.string().min(2), k: z.number().int().min(1).max(12).default(6), period: periodField }),
  async execute({ query, k, period }, ctx) {
    const p = pick(ctx, period);
    try {
      const hits = await searchKnowledge(query, k ?? 6, p);
      return {
        period: p,
        source: "Ledger search",
        hits: hits.map((h) => ({ source: h.source, ref: h.ref, content: h.content, similarity: h.similarity })),
      };
    } catch (e) {
      return { period: p, source: "Ledger search", hits: [], error: `Search unavailable: ${(e as Error).message}` };
    }
  },
});

export const logContactTool = def({
  name: "log_contact",
  description: "Record a collection contact (call, SMS, email, visit) and its outcome, optionally with a promise to pay.",
  inputSchema: z.object({
    client_code: z.string(),
    channel: z.enum(["call", "sms", "email", "visit", "other"]),
    outcome: z.string().describe("e.g. 'Promised to pay', 'No answer', 'Disputes invoice'"),
    promise_amount: z.number().positive().optional(),
    promise_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    note: z.string().optional(),
    logged_by: z.string().optional(),
    period: periodField,
  }),
  async execute(input, ctx) {
    const p = pick(ctx, input.period);
    const entry = await logContact({
      period: p,
      client_code: input.client_code.trim().toUpperCase(),
      channel: input.channel,
      outcome: input.outcome,
      promise_amount: input.promise_amount ?? null,
      promise_date: input.promise_date ?? null,
      note: input.note ?? null,
      logged_by: input.logged_by ?? null,
    });
    return { ok: true, source: "Contact log", entry };
  },
});

export const draftMessage = def({
  name: "draft_message",
  description:
    "Draft a collection email for a client. Tone is chosen by the engine rule (friendly / firm / final) unless given. The draft is number-checked and goes to supervisor approval — it is NOT sent.",
  inputSchema: z.object({
    client_code: z.string(),
    tone: z.enum(["friendly", "firm", "final"]).optional(),
    channel: z.enum(["email", "sms"]).optional(),
    period: periodField,
  }),
  async execute({ client_code, tone, channel, period }, ctx) {
    const p = pick(ctx, period);
    try {
      const d = await draftForClient(p, client_code.trim().toUpperCase(), { tone, channel });
      const rv = d.review as { verdict?: string; issues?: string[]; source?: string } | null;
      return {
        ok: true,
        source: "Approvals queue",
        draft: { id: d.id, client_code: d.client_code, tone: d.tone, channel: d.channel, subject: d.subject, body: d.body, status: d.status, needs_top_mgmt: d.needs_top_mgmt },
        review: rv,
        next: d.needs_top_mgmt ? "Waiting for supervisor and top-management approval" : "Waiting for supervisor approval",
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
});

export const DUELY_TOOLS = [getTodayList, getClient, getKpis, getPdcCalendar, searchLedger, logContactTool, draftMessage];

/** AI SDK v5 tool set bound to a period. */
export function aiTools(ctx: ToolCtx): ToolSet {
  const out: ToolSet = {};
  for (const t of DUELY_TOOLS) {
    out[t.name] = tool({
      description: t.description,
      inputSchema: t.inputSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (input: any) => t.execute(input, ctx),
    });
  }
  return out;
}

/** Run a tool by name (used by the MCP server and the keyless chat fallback). */
export async function runTool(name: string, input: unknown, ctx: ToolCtx): Promise<unknown> {
  const t = DUELY_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tool ${name}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (t.execute as any)(t.inputSchema.parse(input ?? {}), ctx);
}
