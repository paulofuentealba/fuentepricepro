import type { Asset } from "./domain";
import type { ValuationResult } from "./calculations";

export interface ChecklistCriterion {
  id: string;
  labelKey: string;
  tooltipKey: string;
  /** true = pass (✓), false = fail/warning (✗), null = not applicable or insufficient data (—) */
  passed: boolean | null;
}

export interface BuyAndHoldChecklistResult {
  score: number;
  totalApplicable: number;
  criteria: ChecklistCriterion[];
}

/**
 * Pure evaluation engine for long-term Buy & Hold criteria.
 * Consumes strictly pre-loaded data from Asset and ValuationResult,
 * with zero redundant network requests or side-effects.
 */
export function evaluateBuyAndHoldChecklist(
  asset: Asset,
  valuation?: ValuationResult | null,
): BuyAndHoldChecklistResult {
  const m = asset.metrics ?? {};
  const criteria: ChecklistCriterion[] = [];
  const type = asset.type;

  const isStock = type === "STOCK_BR" || type === "STOCK_US";
  const isFund = type === "FII" || type === "FII_INFRA" || type === "FIAGRO" || type === "REIT";
  const isEtf = type === "ETF";

  if (isStock) {
    // 1. Profitable (LPA > 0 or EPS > 0)
    const lpaVal = m.eps;
    criteria.push({
      id: "profitableLpa",
      labelKey: "profitableLpa",
      tooltipKey: "profitableLpaTip",
      passed: typeof lpaVal === "number" && Number.isFinite(lpaVal) ? lpaVal > 0 : null,
    });

    // 2. Healthy ROE (ROE >= 10%)
    const roeVal = m.roe;
    criteria.push({
      id: "healthyRoe",
      labelKey: "healthyRoe",
      tooltipKey: "healthyRoeTip",
      passed: typeof roeVal === "number" && Number.isFinite(roeVal) ? roeVal >= 10 : null,
    });

    // 3. Sustainable Payout (0 < Payout <= 100%)
    const payoutVal = m.payoutRatio;
    criteria.push({
      id: "sustainablePayout",
      labelKey: "sustainablePayout",
      tooltipKey: "sustainablePayoutTip",
      passed:
        typeof payoutVal === "number" && Number.isFinite(payoutVal)
          ? payoutVal > 0 && payoutVal <= 100
          : null,
    });

    // 4. Reasonable P/VP (P/VP <= 2.5)
    const pbVal = m.pbRatio;
    criteria.push({
      id: "reasonablePbStock",
      labelKey: "reasonablePbStock",
      tooltipKey: "reasonablePbStockTip",
      passed: typeof pbVal === "number" && Number.isFinite(pbVal) ? pbVal > 0 && pbVal <= 2.5 : null,
    });

    // 5. Consistent Dividend History (>= 3 years)
    const divHistory = (asset.dividendHistory ?? []).filter((p) => p.amount > 0);
    criteria.push({
      id: "consistentDividends",
      labelKey: "consistentDividends",
      tooltipKey: "consistentDividendsTip",
      passed: divHistory.length >= 3,
    });

    // 6. Growing Dividends (5y CAGR > 0%)
    const cagrVal = m.dividendCagr5y;
    criteria.push({
      id: "growingDividends",
      labelKey: "growingDividends",
      tooltipKey: "growingDividendsTip",
      passed: typeof cagrVal === "number" && Number.isFinite(cagrVal) ? cagrVal > 0 : null,
    });

    // 7. Below Ceiling Price (Safety Margin >= 0%)
    const marginVal = valuation?.margin;
    criteria.push({
      id: "belowCeiling",
      labelKey: "belowCeiling",
      tooltipKey: "belowCeilingTip",
      passed: typeof marginVal === "number" && Number.isFinite(marginVal) ? marginVal >= 0 : null,
    });

    // 8. No Yield Trap Warning
    const yieldTrap = valuation?.yieldTrapWarning;
    criteria.push({
      id: "noYieldTrap",
      labelKey: "noYieldTrap",
      tooltipKey: "noYieldTrapTip",
      passed: typeof yieldTrap === "boolean" ? !yieldTrap : null,
    });
  } else if (isFund) {
    // 1. Balanced P/VP (P/VP <= 1.15)
    const pbVal = m.pbRatio;
    criteria.push({
      id: "reasonablePbFund",
      labelKey: "reasonablePbFund",
      tooltipKey: "reasonablePbFundTip",
      passed:
        typeof pbVal === "number" && Number.isFinite(pbVal) ? pbVal > 0 && pbVal <= 1.15 : null,
    });

    // 2. Attractive Current Yield (DY >= 6%)
    const dyVal = m.currentDy;
    criteria.push({
      id: "attractiveYield",
      labelKey: "attractiveYield",
      tooltipKey: "attractiveYieldTip",
      passed: typeof dyVal === "number" && Number.isFinite(dyVal) ? dyVal >= 6 : null,
    });

    // 3. Consistent Dividend History (>= 3 years)
    const divHistory = (asset.dividendHistory ?? []).filter((p) => p.amount > 0);
    criteria.push({
      id: "consistentDividends",
      labelKey: "consistentDividends",
      tooltipKey: "consistentDividendsTip",
      passed: divHistory.length >= 3,
    });

    // 4. Stable Dividends (5y CAGR >= 0%)
    const cagrVal = m.dividendCagr5y;
    criteria.push({
      id: "stableDividends",
      labelKey: "stableDividends",
      tooltipKey: "stableDividendsTip",
      passed: typeof cagrVal === "number" && Number.isFinite(cagrVal) ? cagrVal >= 0 : null,
    });

    // 5. Below Ceiling Price (Safety Margin >= 0%)
    const marginVal = valuation?.margin;
    criteria.push({
      id: "belowCeiling",
      labelKey: "belowCeiling",
      tooltipKey: "belowCeilingTip",
      passed: typeof marginVal === "number" && Number.isFinite(marginVal) ? marginVal >= 0 : null,
    });

    // 6. No Yield Trap Warning
    const yieldTrap = valuation?.yieldTrapWarning;
    criteria.push({
      id: "noYieldTrap",
      labelKey: "noYieldTrap",
      tooltipKey: "noYieldTrapTip",
      passed: typeof yieldTrap === "boolean" ? !yieldTrap : null,
    });

    // 7. Low Vacancy or Substantial AUM
    const vacVal = m.vacancy;
    const aumVal = m.aum;
    const vacancyOrAumPassed =
      typeof vacVal === "number" && Number.isFinite(vacVal)
        ? vacVal <= 15
        : typeof aumVal === "number" && Number.isFinite(aumVal)
          ? aumVal >= 50_000_000
          : null;

    criteria.push({
      id: "lowVacancyOrAum",
      labelKey: vacVal != null ? "lowVacancy" : "relevantAum",
      tooltipKey: vacVal != null ? "lowVacancyTip" : "relevantAumTip",
      passed: vacancyOrAumPassed,
    });
  } else if (isEtf) {
    // 1. Low Expense Ratio (<= 0.50%)
    const expVal = m.expenseRatio;
    criteria.push({
      id: "lowExpenseRatio",
      labelKey: "lowExpenseRatio",
      tooltipKey: "lowExpenseRatioTip",
      passed: typeof expVal === "number" && Number.isFinite(expVal) ? expVal <= 0.5 : null,
    });

    // 2. Relevant AUM (>= 50M)
    const aumVal = m.aum;
    criteria.push({
      id: "relevantAum",
      labelKey: "relevantAum",
      tooltipKey: "relevantAumTip",
      passed: typeof aumVal === "number" && Number.isFinite(aumVal) ? aumVal >= 50_000_000 : null,
    });

    // 3. Positive Yield (if dividend-paying ETF)
    const dyVal = m.currentDy;
    criteria.push({
      id: "attractiveYield",
      labelKey: "attractiveYield",
      tooltipKey: "attractiveYieldTip",
      passed: typeof dyVal === "number" && Number.isFinite(dyVal) ? dyVal > 0 : null,
    });

    // 4. Below Ceiling Price
    const marginVal = valuation?.margin;
    criteria.push({
      id: "belowCeiling",
      labelKey: "belowCeiling",
      tooltipKey: "belowCeilingTip",
      passed: typeof marginVal === "number" && Number.isFinite(marginVal) ? marginVal >= 0 : null,
    });
  }

  const applicable = criteria.filter((c) => c.passed !== null);
  const score = applicable.filter((c) => c.passed === true).length;

  return {
    score,
    totalApplicable: applicable.length,
    criteria,
  };
}
