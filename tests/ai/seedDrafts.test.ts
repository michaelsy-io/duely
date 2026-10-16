import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ count: 0 as number | null, created: [] as { client_code: string; tone: string; needs_top_mgmt?: boolean; status?: string; review: unknown }[] }));

vi.mock("@/lib/db/drafts", () => ({
  countDraftsInDb: vi.fn(async () => state.count),
  createDraft: vi.fn(async (d: (typeof state.created)[number]) => {
    state.created.push(d);
    return { ...d, id: String(state.created.length) };
  }),
}));

import { ensureDemoDrafts, SEED_COUNT } from "@/lib/db/seedDrafts";

describe("ensureDemoDrafts", () => {
  beforeEach(() => {
    state.count = 0;
    state.created = [];
  });

  it.each(["P1", "P2"] as const)("seeds %s with one locked final notice and number-checked templates", async (period) => {
    expect(await ensureDemoDrafts(period)).toBe(SEED_COUNT);
    expect(state.created).toHaveLength(SEED_COUNT);
    const finals = state.created.filter((d) => d.tone === "final");
    expect(finals).toHaveLength(1);
    expect(finals[0].needs_top_mgmt).toBe(true);
    for (const d of state.created) {
      expect((d.review as { checks: { numbers: boolean } }).checks.numbers).toBe(true);
      expect(d.status).toBe("pending");
    }
  });

  it("does nothing when the period already has drafts", async () => {
    state.count = 2;
    expect(await ensureDemoDrafts("P1")).toBe(0);
    expect(state.created).toHaveLength(0);
  });

  it("does nothing when Supabase is unreachable", async () => {
    state.count = null;
    expect(await ensureDemoDrafts("P1")).toBe(0);
    expect(state.created).toHaveLength(0);
  });

  it("runs once for concurrent calls", async () => {
    const [a, b] = await Promise.all([ensureDemoDrafts("P2"), ensureDemoDrafts("P2")]);
    expect(a).toBe(SEED_COUNT);
    expect(b).toBe(SEED_COUNT);
    expect(state.created).toHaveLength(SEED_COUNT);
  });
});
