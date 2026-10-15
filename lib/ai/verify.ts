// Deterministic number check: every amount, percentage, date and document number
// that appears in AI-written text must be traceable to the engine payload.
// "Code does the maths, AI does the words" — this is the gate.
// No path aliases here so the module stays trivially unit-testable.

export interface VerifyResult {
  ok: boolean;
  unknown: string[];
  checked: number;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";

type Kind = "amount" | "percent" | "date" | "doc";
interface Token {
  kind: Kind;
  raw: string;
  start: number;
  end: number;
  value?: number; // amount / percent
  tol?: number;
  date?: { y?: number; m: number; d: number };
  doc?: string;
}

function monthIndex(s: string): number {
  return MONTHS.indexOf(s.slice(0, 3).toLowerCase()) + 1;
}

function decimals(s: string): number {
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

const SUFFIX: Record<string, number> = { k: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 };

/** Extract checkable tokens. Exported for tests. */
export function extractTokens(text: string): Token[] {
  const tokens: Token[] = [];
  const taken: [number, number][] = [];
  const free = (s: number, e: number) => !taken.some(([a, b]) => s < b && e > a);
  const push = (t: Token) => {
    if (!free(t.start, t.end)) return;
    taken.push([t.start, t.end]);
    tokens.push(t);
  };
  let m: RegExpExecArray | null;

  // Doc numbers first (they contain digits that must not be read as anything else).
  const docRe = /\b(INV|OR|CM|PDC|DR|SI|PAY|D)-?(\d{2,})\b/gi;
  while ((m = docRe.exec(text))) {
    push({ kind: "doc", raw: m[0], start: m.index, end: m.index + m[0].length, doc: `${m[1].toUpperCase()}-${m[2]}` });
  }
  const chkRe = /(?:\*{2,}|x{2,}|#)\s?(\d{3,6})\b/gi;
  while ((m = chkRe.exec(text))) {
    push({ kind: "doc", raw: m[0], start: m.index, end: m.index + m[0].length, doc: `CHK-${m[1]}` });
  }

  // ISO dates
  const isoRe = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((m = isoRe.exec(text))) {
    push({ kind: "date", raw: m[0], start: m.index, end: m.index + m[0].length, date: { y: +m[1], m: +m[2], d: +m[3] } });
  }
  // 25 Aug [2026]
  const dmyRe = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?:,?\\s+(\\d{4}))?\\b`, "gi");
  while ((m = dmyRe.exec(text))) {
    const d = +m[1];
    if (d < 1 || d > 31) continue;
    push({ kind: "date", raw: m[0], start: m.index, end: m.index + m[0].length, date: { y: m[3] ? +m[3] : undefined, m: monthIndex(m[2]), d } });
  }
  // Aug 25[, 2026]
  const mdyRe = new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4})\\b)?`, "gi");
  while ((m = mdyRe.exec(text))) {
    const d = +m[2];
    if (d < 1 || d > 31) continue;
    push({ kind: "date", raw: m[0], start: m.index, end: m.index + m[0].length, date: { y: m[3] ? +m[3] : undefined, m: monthIndex(m[1]), d } });
  }

  // Peso amounts: ₱1,234.50 · ₱1.2M · PHP 431K · Php 2.5 million
  const amtRe = /(?:₱|\bPHP\s?|\bPhp\s?|\bP(?=\d))\s?(-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?)(?:\s?(k|m|mn|million|b|bn|billion)\b)?/gi;
  while ((m = amtRe.exec(text))) {
    const num = m[1].replace(/,/g, "");
    const mult = m[2] ? SUFFIX[m[2].toLowerCase()] : 1;
    const value = parseFloat(num) * mult;
    const tol = Math.max(0.51, (0.5 * mult) / Math.pow(10, decimals(num)) + 1e-9);
    push({ kind: "amount", raw: m[0].trim(), start: m.index, end: m.index + m[0].length, value, tol });
  }

  // Percentages
  const pctRe = /(-?\d+(?:\.\d+)?)\s?(%|percent\b)/gi;
  while ((m = pctRe.exec(text))) {
    const value = parseFloat(m[1]);
    const tol = Math.max(0.05, 0.5 / Math.pow(10, decimals(m[1]))) + 1e-9;
    push({ kind: "percent", raw: m[0], start: m.index, end: m.index + m[0].length, value, tol });
  }

  return tokens.sort((a, b) => a.start - b.start);
}

interface Facts {
  numbers: number[];
  dates: { y?: number; m: number; d: number }[];
  docs: Set<string>;
}

/** Flatten the payload into numbers, dates and doc numbers (including ones embedded in strings). */
export function flattenPayload(payload: unknown): Facts {
  const facts: Facts = { numbers: [], dates: [], docs: new Set() };
  const seen = new Set<unknown>();
  const visit = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "number") {
      if (Number.isFinite(v)) facts.numbers.push(v);
      return;
    }
    if (typeof v === "string") {
      const s = v.trim();
      if (/^-?\d+(\.\d+)?$/.test(s)) facts.numbers.push(parseFloat(s));
      for (const t of extractTokens(s)) {
        if (t.kind === "date" && t.date) facts.dates.push(t.date);
        else if (t.kind === "doc" && t.doc) facts.docs.add(t.doc);
        else if (t.value != null) {
          facts.numbers.push(t.value);
          if (t.kind === "percent") facts.numbers.push(t.value / 100);
        }
      }
      // bare numbers inside strings, e.g. "65 days overdue", "1,234,567"
      const bare = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g;
      let m: RegExpExecArray | null;
      while ((m = bare.exec(s))) facts.numbers.push(parseFloat(m[0].replace(/,/g, "")));
      return;
    }
    if (typeof v === "boolean") return;
    if (typeof v === "object") {
      if (seen.has(v)) return;
      seen.add(v);
      if (Array.isArray(v)) v.forEach(visit);
      else for (const x of Object.values(v as Record<string, unknown>)) visit(x);
    }
  };
  visit(payload);
  return facts;
}

function matches(t: Token, f: Facts): boolean {
  switch (t.kind) {
    case "doc": {
      if (f.docs.has(t.doc!)) return true;
      // tolerate missing/extra hyphen variants and check numbers matched by trailing digits
      const digits = t.doc!.replace(/^\D+-/, "");
      for (const d of f.docs) if (d.endsWith(`-${digits}`) && (t.doc!.startsWith("CHK") || d.startsWith(t.doc!.split("-")[0]))) return true;
      return false;
    }
    case "date":
      return f.dates.some((d) => d.m === t.date!.m && d.d === t.date!.d && (t.date!.y == null || d.y == null || d.y === t.date!.y));
    case "amount":
      return f.numbers.some((n) => Math.abs(Math.abs(n) - Math.abs(t.value!)) <= t.tol!);
    case "percent":
      return f.numbers.some((n) => Math.abs(n * 100 - t.value!) <= t.tol! || Math.abs(n - t.value!) <= t.tol!);
  }
}

/**
 * Check every amount / percentage / date / doc number in `text` against `payload`.
 * Returns ok=false and the offending raw strings when anything is not traceable.
 */
export function verifyNumbers(text: string, payload: unknown): VerifyResult {
  const facts = flattenPayload(payload);
  const tokens = extractTokens(text);
  const unknown: string[] = [];
  for (const t of tokens) if (!matches(t, facts) && !unknown.includes(t.raw)) unknown.push(t.raw);
  return { ok: unknown.length === 0, unknown, checked: tokens.length };
}
