// Contract between the rules engine and the UI / AI layers.
// The engine may ADD fields; do not rename or remove existing ones without updating callers.

export type ISODate = string; // YYYY-MM-DD
export type Bucket = "Current" | "1-30" | "31-60" | "61-90" | "90+";

export interface Customer {
  client_code: string;
  segment: string;
  rep: string;
  collector: string;
  credit_limit: number;
  terms_days?: number;
  payment_method?: string;
  since_year?: number;
  [k: string]: unknown;
}

/** Raw month-end tables, one array of row objects per CSV (columns as in data/demo). */
export interface Snapshot {
  asOf: ISODate;
  tables: Record<string, Record<string, string | number | null>[]>;
}

export interface ControlCheck {
  agingTotal: number;
  ledgerAr: number;
  gap: number;
  unappliedTotal: number;
  unappliedRefs: string[];
  missingClients: string[];
}

export interface Kpis {
  dso: number;
  pctOver60: number; // 0..1
  pctOver90: number;
  collectionEfficiency: number;
  totalAr: number;
  ledgerAr: number;
  overdueExclDisputes: number;
  bouncedRate: number;
  atRisk: number;
  top10ShareAr: number;
  top10ShareOverdue: number;
  estimatedBadDebt: number;
  allowance: number;
  lossRates: Record<Bucket, number>;
  buckets: Record<Bucket, number>;
}

export interface InflowWeek {
  label: string;
  start: ISODate;
  end: ISODate;
  pdcs: number;
  promises: number;
  currentInvoices: number;
  total: number;
}

export interface FollowUpRow {
  rank: number;
  client_code: string;
  segment: string;
  collector: string;
  overdue: number;
  oldestDays: number;
  score: number;
  reasons: string[]; // each factor in plain words, e.g. "65 days overdue"
  reasonText: string; // reasons joined with "; " exactly as the reference prints them
  factors: { label: string; points: number }[];
  openPromise: { amount: number; date: ISODate } | null;
  pdcCover: number;
  totalBalance: number;
  creditLimit: number;
}

export interface OnHoldRow {
  client_code: string;
  reason: string;
  amount: number;
}

export interface PdcRow {
  client_code: string;
  check_no: string;
  amount: number;
  check_date: ISODate;
  week: number; // 1..4, 0 if later
  flags: string[];
}

export interface BouncedOpen {
  client_code: string;
  amount: number;
  date_returned: ISODate;
  daysAgo: number;
}

export interface EscalationRow {
  client_code: string;
  action: "Credit hold" | "Visit" | "Credit-limit review" | string;
  triggers: string[];
}

export interface FlagRow {
  flag: string;
  who: string;
  amount: number;
  rule: string;
  source: string;
  owner: string;
}

export interface RepRow {
  rep: string;
  totalAr: number;
  overdue: number;
  pctOver60: number;
  dso: number;
  discountRate: number;
  creditMemoRate: number;
  salesTo60Plus: number;
}

export interface EngineResult {
  asOf: ISODate;
  control: ControlCheck;
  kpis: Kpis;
  inflow: InflowWeek[];
  reps: RepRow[];
  flags: FlagRow[];
  followUp: FollowUpRow[];
  onHold: OnHoldRow[];
  pdcs: PdcRow[];
  bouncedOpen: BouncedOpen[];
  escalations: EscalationRow[];
  writeOffCandidates?: { client_code: string; amount: number; reasons: string[] }[];
}
