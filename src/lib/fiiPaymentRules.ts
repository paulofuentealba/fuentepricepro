import {
  nthBusinessDayOfMonth,
  nthCalendarDayPostponed,
} from "./br-business-calendar";
import { normalizeTicker } from "./ticker";

export interface FiiPaymentRule {
  rule: "nth_business_day" | "nth_calendar_day_postponed";
  n: number;
}

/**
 * Confirmed primary-source payment rules for 10 liquid FIIs.
 */
export const FII_PAYMENT_RULES: Record<string, FiiPaymentRule> = {
  HGLG11: { rule: "nth_business_day", n: 10 },
  MXRF11: { rule: "nth_business_day", n: 10 },
  KNRI11: { rule: "nth_business_day", n: 10 },
  XPLG11: { rule: "nth_business_day", n: 10 },
  VISC11: { rule: "nth_business_day", n: 10 },
  KNCR11: { rule: "nth_business_day", n: 10 },
  AFHI11: { rule: "nth_business_day", n: 10 },
  CPTS11: { rule: "nth_business_day", n: 10 },
  ALZR11: { rule: "nth_business_day", n: 10 },
  BTLG11: { rule: "nth_calendar_day_postponed", n: 25 },
};

/**
 * Estimates the payment date (YYYY-MM-DD) for a mapped FII given a reference date/month.
 * Payment occurs in the month SUBSEQUENT to the reference date.
 * Returns null if the ticker is not in FII_PAYMENT_RULES.
 *
 * @param ticker Stock/FII ticker (e.g., "HGLG11")
 * @param referenceDate Date of the reference month (e.g. Data-Com date or reference month date)
 */
export function estimatePaymentDate(ticker: string, referenceDate: Date): string | null {
  const clean = normalizeTicker(ticker);
  const ruleObj = FII_PAYMENT_RULES[clean];
  if (!ruleObj) return null;

  // Payment is in the month subsequent to reference date
  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth() + 1; // 1-indexed

  let targetYear = refYear;
  let targetMonth = refMonth + 1;
  if (targetMonth > 12) {
    targetMonth = 1;
    targetYear += 1;
  }

  let paymentDateUtc: Date;
  if (ruleObj.rule === "nth_business_day") {
    paymentDateUtc = nthBusinessDayOfMonth(targetYear, targetMonth, ruleObj.n);
  } else {
    paymentDateUtc = nthCalendarDayPostponed(targetYear, targetMonth, ruleObj.n);
  }

  const y = paymentDateUtc.getUTCFullYear();
  const m = String(paymentDateUtc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(paymentDateUtc.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}
