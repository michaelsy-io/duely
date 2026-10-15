// Every threshold, window and points value used by the engine.
// Source: data/demo/business_rules.md, as implemented in the answer-key reference.

export const BUCKETS = ["Current", "1-30", "31-60", "61-90", "90+"] as const;

export const KPI = {
  dsoWindowDays: 90,
  over60Days: 60,
  over90Days: 90,
  top10Count: 10,
};

export const INFLOW = {
  weeks: 4,
  pdcPaymentMethod: "Check (PDC)",
  /** Inflow drop flag: a week below this share of the 4-week average. */
  dropShareOfAverage: 0.75,
};

export const SCORE = {
  oldest: [
    { maxDays: 30, points: 10 },
    { maxDays: 60, points: 20 },
    { maxDays: 90, points: 30 },
    { maxDays: Infinity, points: 40 },
  ],
  amountTopQuantile: 0.8,
  amountTopPoints: 20,
  amountMidQuantile: 0.5,
  amountMidPoints: 10,
  brokenPromiseWindowDays: 30,
  brokenPromiseMinShare: 0.9,
  brokenPromisePoints: 15,
  bouncedCheckPoints: 10,
  overCreditLimitPoints: 10,
  noContactDays: 14,
  noContactPoints: 10,
  slowdownMinPayments: 3,
  slowdownRecentDays: 91,
  slowdownDeltaDays: 15,
  slowdownPoints: 5,
  pdcCoverPoints: -30,
};

export const ESCALATION = {
  creditHoldDays: 90,
  visitDays: 60,
  brokenPromiseWindowDays: 90,
  brokenPromiseOutcomePrefix: "Promise missed",
  creditHoldBrokenPromises: 2,
  bouncedUnreplacedDays: 7,
  creditHoldApprover: "Middle management, then top",
  visitApprover: "Collections supervisor",
  creditLimitApprover: "Middle management",
};

export const PDC = {
  calendarHorizonDays: 14,
  nearingStaleDays: 150,
};

export const FLAGS = {
  discountPolicyMax: 0.1,
  discountHistoryDays: 183,
  discountMultipleOfAverage: 2,
  creditMemoLimits: { "Sales Manager": 20_000, "Finance Head": 100_000, "Top management": 1e12 } as Record<string, number>,
  returnReasonPrefix: "Return",
  repeatedReturnsDays: 30,
  duplicateWindowDays: 60,
  duplicateMaxGapDays: 3,
  unappliedMinDays: 15,
  atRiskDays: 90,
  balanceJumpMultiple: 1.5,
  balanceJumpMinShareOfAr: 0.01,
  concentrationShare: 0.15,
  doubtful: {
    writeOffDays: 365,
    demandLetterDays: 180,
    over120Days: 120,
    over90Days: 90,
    noPaymentDays: 60,
    unreplacedBounced: 2,
    noResponseWindowDays: 60,
    noResponseAttempts: 3,
    noResponsePattern: /No answer|No response|unattended|unreachable/i,
    demandLetterAction: "Demand letter",
  },
};
