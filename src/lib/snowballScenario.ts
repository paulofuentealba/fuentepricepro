/**
 * Pure "what-if" compounding simulation behind the Explore > Snowball Effect scenario panel.
 * The base equity is always the canonical portfolio value (see useSnowballBase) — only the
 * yield, growth, contribution, and horizon parameters here are hypothetical/user-adjustable,
 * matching the panel's own disclaimer.
 */
export interface SnowballScenarioInput {
  /** Current portfolio value, in the display currency. */
  baseEquity: number;
  monthlyContribution: number;
  /** Assumed annual dividend yield, as a percentage (8.5 = 8.5%). */
  yieldPct: number;
  /** Assumed annual equity growth beyond dividends (price appreciation), as a percentage. */
  growthPct: number;
  years: number;
}

export interface SnowballScenarioYearPoint {
  year: number;
  balance: number;
  /** Base equity plus cumulative contributions, uncompounded — same "Principal" the interest
   * (balance - principal) is measured against for the crossover point. */
  principal: number;
}

export interface SnowballScenarioResult {
  finalBalance: number;
  /** Monthly dividend income at the end of the horizon, at the assumed yield. */
  finalMonthlyIncome: number;
  /** One point per completed year, 1..years. */
  yearPoints: SnowballScenarioYearPoint[];
  /** First year where compounded interest overtakes contributed principal, or null if it never
   * does within the horizon. */
  crossoverYear: number | null;
}

export function simulateSnowballScenario(input: SnowballScenarioInput): SnowballScenarioResult {
  const baseEquity = Math.max(0, input.baseEquity);
  const monthlyContribution = Math.max(0, input.monthlyContribution);
  const monthlyYield = input.yieldPct / 100 / 12;
  const monthlyGrowth = input.growthPct / 100 / 12;
  const totalMonths = Math.max(1, Math.round(input.years)) * 12;

  let balance = baseEquity;
  let principal = baseEquity;
  const yearPoints: SnowballScenarioYearPoint[] = [];

  for (let m = 1; m <= totalMonths; m++) {
    balance += balance * monthlyYield; // dividends reinvested
    balance += balance * monthlyGrowth; // price appreciation
    balance += monthlyContribution;
    principal += monthlyContribution;
    if (m % 12 === 0) {
      yearPoints.push({ year: m / 12, balance, principal });
    }
  }

  const finalBalance = yearPoints.length > 0 ? yearPoints[yearPoints.length - 1].balance : balance;
  const finalMonthlyIncome = (finalBalance * (input.yieldPct / 100)) / 12;
  const crossoverPoint = yearPoints.find((p) => p.balance - p.principal > p.principal);

  return {
    finalBalance,
    finalMonthlyIncome,
    yearPoints,
    crossoverYear: crossoverPoint?.year ?? null,
  };
}
