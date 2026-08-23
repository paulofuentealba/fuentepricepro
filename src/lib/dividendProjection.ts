export interface ProjectionPoint {
  month: number;
  shares: number;
  monthlyIncome: number;
  totalInvested: number;
  reinvestedIncomeAcc: number;
}

export interface ProjectionParams {
  initialShares: number;
  currentPrice: number;
  /** Annual yield in decimal format (e.g. 0.08 for 8% a.a.). */
  annualYield: number;
  monthlyContribution?: number;
  periodYears: 1 | 3 | 5;
}

export interface ProjectionResult {
  initialShares: number;
  finalShares: number;
  initialMonthlyIncome: number;
  finalMonthlyIncome: number;
  totalOutOfPocket: number;
  totalReinvested: number;
  timeline: ProjectionPoint[];
}

/**
 * Pure simulation function for projected compounding of shares & monthly income.
 * Assumes constant share price and constant dividend yield throughout the timeframe.
 * Does NOT project share price appreciation (mathematical determinism).
 */
export function simulateDividendProjection({
  initialShares,
  currentPrice,
  annualYield,
  monthlyContribution = 0,
  periodYears,
}: ProjectionParams): ProjectionResult {
  const safeInitialShares = Number.isFinite(initialShares) && initialShares >= 0 ? initialShares : 0;
  const safePrice = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 0;
  const safeContribution = Number.isFinite(monthlyContribution) && monthlyContribution >= 0 ? monthlyContribution : 0;
  const safeYield = Number.isFinite(annualYield) && annualYield >= 0 ? annualYield : 0;

  const months = periodYears * 12;
  const monthlyYieldRate = safeYield / 12;

  let accumulatedShares = safeInitialShares;
  let totalReinvested = 0;
  const initialOutOfPocket = safeInitialShares * safePrice;

  const initialMonthlyIncome = safePrice > 0
    ? accumulatedShares * monthlyYieldRate * safePrice
    : 0;

  const timeline: ProjectionPoint[] = [
    {
      month: 0,
      shares: accumulatedShares,
      monthlyIncome: initialMonthlyIncome,
      totalInvested: initialOutOfPocket,
      reinvestedIncomeAcc: 0,
    },
  ];

  for (let m = 1; m <= months; m++) {
    // 1. Renda gerada pelas cotas acumuladas no início do mês
    const monthIncome = safePrice > 0 ? accumulatedShares * monthlyYieldRate * safePrice : 0;
    
    // 2. Novas cotas via aporte e reinvestimento
    const newSharesFromContribution = safePrice > 0 ? safeContribution / safePrice : 0;
    const newSharesFromReinvestment = safePrice > 0 ? monthIncome / safePrice : 0;

    totalReinvested += monthIncome;
    accumulatedShares += newSharesFromContribution + newSharesFromReinvestment;

    const outOfPocket = initialOutOfPocket + safeContribution * m;

    timeline.push({
      month: m,
      shares: accumulatedShares,
      monthlyIncome: safePrice > 0 ? accumulatedShares * monthlyYieldRate * safePrice : 0,
      totalInvested: outOfPocket,
      reinvestedIncomeAcc: totalReinvested,
    });
  }

  const finalPoint = timeline[timeline.length - 1];

  return {
    initialShares: safeInitialShares,
    finalShares: finalPoint.shares,
    initialMonthlyIncome,
    finalMonthlyIncome: finalPoint.monthlyIncome,
    totalOutOfPocket: initialOutOfPocket + safeContribution * months,
    totalReinvested,
    timeline,
  };
}
