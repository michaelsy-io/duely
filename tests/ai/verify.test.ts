import { describe, expect, it } from "vitest";
import { extractTokens, verifyNumbers } from "../../lib/ai/verify";

const payload = {
  asOf: "2026-08-31",
  client_code: "C014",
  overdue: 1234567.4,
  totalBalance: 2_450_000,
  pctOver60: 0.452,
  invoices: [
    { inv_no: "INV-11765", due_date: "2026-08-25", balance: 145040 },
    { inv_no: "INV-12031", due_date: "2026-09-21", balance: 348957.5 },
  ],
  bounced: [{ check_no: "****3408", amount: 145040, date_returned: "2026-08-14" }],
  memo: "CM-422",
  receipt: "OR-51760",
  reasonText: "65 days overdue; bounced check ₱145,040",
};

describe("extractTokens", () => {
  it("finds amounts, percentages, dates and doc numbers", () => {
    const kinds = extractTokens(
      "Pay ₱1,234,567 (45.2%) by 25 Aug for INV-11765; check ****3408 bounced on 2026-08-14, ref OR-51760.",
    ).map((t) => t.kind);
    expect(kinds).toEqual(["amount", "percent", "date", "doc", "doc", "date", "doc"]);
  });
});

describe("verifyNumbers", () => {
  it("passes when every number is in the payload", () => {
    const r = verifyNumbers(
      "Hi! Your balance of ₱1,234,567 is overdue. INV-11765 (₱145,040) was due 25 Aug 2026, Aug 25, or 2026-08-25. Check ****3408 returned 14 Aug. 45.2% is over 60 days. CM-422, OR-51760.",
      payload,
    );
    expect(r.unknown).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("accepts compact peso amounts within rounding", () => {
    expect(verifyNumbers("About ₱1.2M overdue, ₱2.45M total, PHP 349K on INV-12031.", payload).ok).toBe(true);
    expect(verifyNumbers("₱2.7 million total", payload).ok).toBe(false);
  });

  it("flags invented amounts, dates, percentages and doc numbers", () => {
    const r = verifyNumbers("Please pay ₱99,999 by 3 Sep for INV-99999 (12%). Check ****1111. CM-1.", payload);
    expect(r.ok).toBe(false);
    expect(r.unknown).toEqual(expect.arrayContaining(["₱99,999", "3 Sep", "INV-99999", "12%", "****1111"]));
  });

  it("reads numbers embedded in payload strings", () => {
    expect(verifyNumbers("A bounced check of PHP 145,040.", { reasonText: payload.reasonText }).ok).toBe(true);
  });

  it("matches year-less dates against ISO dates and rejects wrong years", () => {
    expect(verifyNumbers("due Sept 21", payload).ok).toBe(true);
    expect(verifyNumbers("due 21 Sep 2025", payload).ok).toBe(false);
  });

  it("ignores text with no checkable numbers", () => {
    const r = verifyNumbers("Thank you for your continued partnership.", payload);
    expect(r).toEqual({ ok: true, unknown: [], checked: 0 });
  });
});
