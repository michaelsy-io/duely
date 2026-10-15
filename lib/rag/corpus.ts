/**
 * Builds the RAG knowledge corpus from the demo CSVs + business rules.
 * Server-only (uses fs). NEVER reads tests/fixtures/answer-key.
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export type Period = "P1" | "P2";
export interface KbChunk {
  source: string;
  ref: string;
  period: string | null;
  content: string;
}

export const PERIOD_DIRS: Record<Period, string> = {
  P1: "P1_2026-08-31",
  P2: "P2_2026-09-30",
};

type Row = Record<string, string>;

function root(): string {
  return process.cwd();
}

function readCsv(period: Period, file: string): Row[] {
  const p = path.join(root(), "data", "demo", PERIOD_DIRS[period], file);
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, "utf8").replace(/^﻿/, "");
  const res = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  return res.data.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) o[k.trim()] = (v ?? "").toString().trim();
    return o;
  });
}

let namesCache: Record<string, string> | null = null;
function clientNames(): Record<string, string> {
  if (namesCache) return namesCache;
  const out: Record<string, string> = {};
  try {
    const p = path.join(root(), "data", "seed", "client_profiles.json");
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, "utf8"));
      const clients = j?.clients ?? j;
      const list = Array.isArray(clients) ? clients : Object.values(clients ?? {});
      for (const c of list as Array<Record<string, string>>) {
        if (c && c.client_code && c.name) out[c.client_code] = c.name;
      }
    }
  } catch {
    /* names are optional */
  }
  namesCache = out;
  return out;
}

function who(code: string): string {
  const n = clientNames()[code];
  return n ? `${n} (${code})` : code;
}

function peso(v: string | undefined): string {
  const n = Number(v);
  if (!v || !Number.isFinite(n)) return v || "";
  return "PHP " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rulesChunks(): KbChunk[] {
  const p = path.join(root(), "data", "demo", "business_rules.md");
  if (!fs.existsSync(p)) return [];
  const md = fs.readFileSync(p, "utf8");
  const parts = md.split(/\n(?=## )/);
  const chunks: KbChunk[] = [];
  for (const part of parts) {
    const text = part.trim();
    if (!text) continue;
    const heading = (text.match(/^#+\s*(.+)$/m)?.[1] ?? "Business rules").trim();
    const lines = text.split("\n");
    // keep chunks short for the 512-token embedder: split long sections by lines, repeating the heading
    let buf: string[] = [];
    let n = 0;
    const flush = () => {
      if (!buf.length) return;
      n += 1;
      const body = buf.join("\n").trim();
      chunks.push({
        source: "business_rules",
        ref: `${heading}${n > 1 ? ` (part ${n})` : ""}`,
        period: null,
        content: n > 1 || !body.startsWith("#") ? `Business rules - ${heading}:\n${body}` : body,
      });
      buf = [];
    };
    for (const line of lines) {
      if (buf.join("\n").length + line.length > 1100) flush();
      buf.push(line);
    }
    flush();
  }
  return chunks;
}

/** Turn one period's demo data into short natural-language chunks. */
export function buildCorpus(period: Period, opts: { includeRules?: boolean } = {}): KbChunk[] {
  const includeRules = opts.includeRules ?? true;
  const asOf = PERIOD_DIRS[period].split("_")[1];
  const out: KbChunk[] = [];
  const add = (source: string, ref: string, content: string) => out.push({ source, ref, period, content });

  // customers
  for (const c of readCsv(period, "customers.csv")) {
    add(
      "customers",
      c.client_code,
      `Client ${who(c.client_code)}: ${c.segment} in ${c.area}. Sales rep ${c.rep}, collector ${c.collector}. ` +
        `Credit limit ${peso(c.credit_limit)}, payment terms ${c.payment_terms_days} days, usually pays by ${c.usual_payment_method}. ` +
        `Contact role: ${c.contact_role}. Client since ${c.client_since}. (Period ${period}, as of ${asOf})`,
    );
  }

  // collection activity
  readCsv(period, "collection_activity.csv").forEach((a, i) => {
    const promise =
      a.promise_amount || a.promise_date
        ? ` Promise to pay ${peso(a.promise_amount)}${a.promise_date ? ` by ${a.promise_date}` : ""}.`
        : "";
    const notes = a.notes || a.note ? ` Notes: ${a.notes || a.note}.` : "";
    add(
      "collection_activity",
      `${a.client_code} ${a.activity_date} #${i + 1}`,
      `On ${a.activity_date}, ${a.collector} contacted ${who(a.client_code)} by ${a.action} (${a.contact_role}). Outcome: ${a.outcome}.${promise}${notes}`,
    );
  });

  // open disputes
  for (const d of readCsv(period, "disputes.csv")) {
    if ((d.status || "").toLowerCase() === "resolved") continue;
    add(
      "disputes",
      d.dispute_id,
      `Open dispute ${d.dispute_id} opened ${d.date_opened} by ${who(d.client_code)} on invoice ${d.inv_no} for ${peso(d.amount)}: ${d.reason}. Status ${d.status}. Disputed invoices are on hold and not chased.`,
    );
  }

  // bounced checks
  for (const b of readCsv(period, "bounced_checks.csv")) {
    const repl = b.replaced === "Y" ? `Replaced on ${b.replacement_received}.` : "Not yet replaced.";
    add(
      "bounced_checks",
      `${b.client_code} ${b.check_no_masked}`,
      `Bounced check ${b.check_no_masked} from ${who(b.client_code)} dated ${b.check_date} for ${peso(b.amount)} covering ${b.invoices_covered} was returned on ${b.date_returned} (${b.reason}). ${repl}`,
    );
  }

  // PDCs: one chunk per non-cleared PDC; cleared PDCs summarised per client to keep the index lean
  const cleared: Record<string, { n: number; total: number; last: string }> = {};
  for (const p of readCsv(period, "pdc_register.csv")) {
    if ((p.status || "").toLowerCase() === "cleared") {
      const c = (cleared[p.client_code] ??= { n: 0, total: 0, last: "" });
      c.n += 1;
      c.total += Number(p.amount) || 0;
      if (p.check_date > c.last) c.last = p.check_date;
      continue;
    }
    add(
      "pdc_register",
      `${p.client_code} ${p.check_no_masked}`,
      `Post-dated check ${p.check_no_masked} (${p.bank}) from ${who(p.client_code)} for ${peso(p.amount)} covering ${p.invoices_covered}, received ${p.received_date}, check date ${p.check_date}. Status: ${p.status}${p.date_deposited ? `, deposited ${p.date_deposited}` : ""}.`,
    );
  }
  for (const [code, c] of Object.entries(cleared)) {
    add(
      "pdc_register",
      `${code} cleared PDCs`,
      `${who(code)} has ${c.n} cleared post-dated checks totalling ${peso(String(c.total))}, the latest dated ${c.last}.`,
    );
  }

  // credit memos
  for (const m of readCsv(period, "credit_memos.csv")) {
    add(
      "credit_memos",
      m.memo_no,
      `Credit memo ${m.memo_no} dated ${m.memo_date} for ${who(m.client_code)} on invoice ${m.inv_no}: ${peso(m.amount)}, reason "${m.reason}", rep ${m.rep}, approved by ${m.approver_role || "nobody (no approver recorded)"}.`,
    );
  }

  if (includeRules) out.push(...rulesChunks());
  return out;
}

/** Both periods, with business rules included once (period null). */
export function buildFullCorpus(): KbChunk[] {
  return [...buildCorpus("P1", { includeRules: false }), ...buildCorpus("P2", { includeRules: false }), ...rulesChunks()];
}
