import type { AssetType } from "./domain";
import {
  ceilingPrice,
  safetyMargin,
  avgDividend,
} from "./calculations";
import {
  calculateDividendSafetyScore,
  type AssetSafetyInput,
  type DividendSafetyResult,
  type DividendSafetyTier,
} from "./dividendSafety";
import type { ValuedWatchlistItem } from "./useValuedPortfolio";

export type RadarStrategy = "all" | "dgi" | "bazin" | "monthly" | "risk";

export interface RadarItem {
  ticker: string;
  name: string;
  type: AssetType;
  currency: "BRL" | "USD";
  price: number;
  ceilingPrice: number;
  margin: number;
  dpa: number;
  targetYield: number;
  dyGross: number;
  dyNet: number;
  payout: number | null;
  fcfPayout: number | null;
  cagr5y: number | null;
  netDebtEbitda: number | null;
  roe: number | null;
  safetyScore: number;
  safetyTier: DividendSafetyTier;
  safetyLabel: string;
  safetySummary: string;
  safetyResult: DividendSafetyResult;
  months: number[]; // 1 to 12
  nextMonth: string;
  consistency: string;
  windowCom: string;
  tags: RadarStrategy[];
  isTrap: boolean;
}

export interface CatalogAssetMeta {
  ticker: string;
  name: string;
  type: AssetType;
  currency: "BRL" | "USD";
  targetYield: number;
  price: number;
  dpa: number;
  payout: number | null;
  fcfPayout: number | null;
  cagr5y: number | null;
  netDebtEbitda: number | null;
  roe: number | null;
  pvp?: number | null;
  vacancy?: number | null;
  yearsPaying?: number;
  months: number[];
  nextMonth: string;
  consistency: string;
  windowCom: string;
  defaultTags: RadarStrategy[];
  isTrap?: boolean;
  isJcp?: boolean;
}

/**
 * Historical seasonality & fundamental catalog for Dividend Radar
 * Audited from CVM (B3) and SEC (NYSE/Nasdaq) filings.
 */
export const RADAR_CATALOG: CatalogAssetMeta[] = [
  {
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 28.5,
    dpa: 2.48,
    payout: 45,
    fcfPayout: 42,
    cagr5y: 12.4,
    netDebtEbitda: null,
    roe: 21,
    yearsPaying: 25,
    months: [2, 5, 8, 11, 12],
    nextMonth: "Maio/26",
    consistency: "5 de 5 anos",
    windowCom: "~15 a 21 de Maio",
    defaultTags: ["dgi", "bazin"],
    isJcp: true,
  },
  {
    ticker: "TAEE11",
    name: "Taesa Transmissora",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 34.8,
    dpa: 2.4,
    payout: 88,
    fcfPayout: 78,
    cagr5y: 6.2,
    netDebtEbitda: 3.4,
    roe: 18,
    yearsPaying: 18,
    months: [5, 8, 11, 12],
    nextMonth: "Maio/26",
    consistency: "5 de 5 anos",
    windowCom: "~10 a 14 de Maio",
    defaultTags: ["dgi", "bazin"],
    isJcp: true,
  },
  {
    ticker: "CPLE6",
    name: "Copel Energia",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 9.8,
    dpa: 0.8,
    payout: 62,
    fcfPayout: 58,
    cagr5y: 10.5,
    netDebtEbitda: 2.1,
    roe: 15,
    yearsPaying: 12,
    months: [4, 11],
    nextMonth: "Novembro/26",
    consistency: "4 de 5 anos",
    windowCom: "~12 a 16 de Novembro",
    defaultTags: ["bazin"],
    isJcp: true,
  },
  {
    ticker: "EGIE3",
    name: "Engie Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 41.2,
    dpa: 2.92,
    payout: 58,
    fcfPayout: 62,
    cagr5y: 8.4,
    netDebtEbitda: 2.3,
    roe: 24,
    yearsPaying: 20,
    months: [4, 8, 12],
    nextMonth: "Agosto/26",
    consistency: "5 de 5 anos",
    windowCom: "~06 a 10 de Agosto",
    defaultTags: ["dgi", "bazin"],
    isJcp: true,
  },
  {
    ticker: "ITUB4",
    name: "Itaú Unibanco",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 32.5,
    dpa: 2.4,
    payout: 44,
    fcfPayout: 40,
    cagr5y: 11.2,
    netDebtEbitda: null,
    roe: 22,
    yearsPaying: 30,
    months: [1, 3, 8, 12],
    nextMonth: "Agosto/26",
    consistency: "5 de 5 anos",
    windowCom: "~15 a 19 de Agosto",
    defaultTags: ["dgi", "bazin"],
    isJcp: true,
  },
  {
    ticker: "WEGE3",
    name: "WEG S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 48.2,
    dpa: 1.02,
    payout: 52,
    fcfPayout: 48,
    cagr5y: 18.5,
    netDebtEbitda: -0.4,
    roe: 29,
    yearsPaying: 25,
    months: [3, 7, 9, 12],
    nextMonth: "Julho/26",
    consistency: "25 anos sem corte",
    windowCom: "~18 a 22 de Julho",
    defaultTags: ["dgi", "bazin"],
    isJcp: true,
  },
  {
    ticker: "PETR4",
    name: "Petróleo Brasileiro",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 36.4,
    dpa: 5.6,
    payout: 50,
    fcfPayout: 46,
    cagr5y: 15.2,
    netDebtEbitda: 0.9,
    roe: 28,
    yearsPaying: 15,
    months: [3, 5, 8, 11, 12],
    nextMonth: "Maio/26",
    consistency: "4 de 5 anos",
    windowCom: "~12 a 16 de Maio",
    defaultTags: ["bazin"],
    isJcp: true,
  },
  {
    ticker: "VALE3",
    name: "Vale S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 61.2,
    dpa: 5.8,
    payout: 55,
    fcfPayout: 50,
    cagr5y: 4.8,
    netDebtEbitda: 0.8,
    roe: 19,
    yearsPaying: 20,
    months: [3, 8, 12],
    nextMonth: "Agosto/26",
    consistency: "5 de 5 anos",
    windowCom: "~05 a 09 de Agosto",
    defaultTags: ["bazin"],
    isJcp: true,
  },
  {
    ticker: "TRPL4",
    name: "ISA CTEEP",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 25.1,
    dpa: 2.2,
    payout: 75,
    fcfPayout: 70,
    cagr5y: 9.1,
    netDebtEbitda: 2.6,
    roe: 17,
    yearsPaying: 18,
    months: [4, 6, 12],
    nextMonth: "Abril/26",
    consistency: "5 de 5 anos",
    windowCom: "~08 a 12 de Abril",
    defaultTags: ["dgi", "bazin"],
    isJcp: true,
  },
  {
    ticker: "BBSE3",
    name: "BB Seguridade",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 33.2,
    dpa: 3.5,
    payout: 85,
    fcfPayout: 85,
    cagr5y: 14.0,
    netDebtEbitda: null,
    roe: 45,
    yearsPaying: 11,
    months: [2, 8],
    nextMonth: "Agosto/26",
    consistency: "5 de 5 anos",
    windowCom: "~10 a 15 de Agosto",
    defaultTags: ["dgi", "bazin"],
    isJcp: true,
  },
  {
    ticker: "CXSE3",
    name: "Caixa Seguridade",
    type: "STOCK_BR",
    currency: "BRL",
    targetYield: 6.0,
    price: 14.8,
    dpa: 1.1,
    payout: 90,
    fcfPayout: 90,
    cagr5y: 16.5,
    netDebtEbitda: null,
    roe: 40,
    yearsPaying: 5,
    months: [5, 11],
    nextMonth: "Maio/26",
    consistency: "4 de 5 anos",
    windowCom: "~04 a 08 de Maio",
    defaultTags: ["dgi", "bazin"],
    isJcp: true,
  },
  {
    ticker: "KNIP11",
    name: "Kinea Índices FII",
    type: "FII",
    currency: "BRL",
    targetYield: 8.0,
    price: 94.2,
    dpa: 10.5,
    payout: 98,
    fcfPayout: 98,
    cagr5y: 6.2,
    netDebtEbitda: null,
    roe: null,
    pvp: 0.96,
    vacancy: 0.02,
    yearsPaying: 8,
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    nextMonth: "Todo dia 12",
    consistency: "5 de 5 anos",
    windowCom: "Todo último dia útil",
    defaultTags: ["bazin", "monthly"],
  },
  {
    ticker: "BTLG11",
    name: "BTG Pactual Logística",
    type: "FII",
    currency: "BRL",
    targetYield: 8.0,
    price: 98.5,
    dpa: 9.36,
    payout: 95,
    fcfPayout: 94,
    cagr5y: 7.1,
    netDebtEbitda: null,
    roe: null,
    pvp: 0.98,
    vacancy: 0.03,
    yearsPaying: 9,
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    nextMonth: "Todo dia 15",
    consistency: "5 de 5 anos",
    windowCom: "Todo último dia útil",
    defaultTags: ["bazin", "monthly"],
  },
  {
    ticker: "HGLG11",
    name: "CSHG Logística FII",
    type: "FII",
    currency: "BRL",
    targetYield: 8.0,
    price: 161.0,
    dpa: 13.2,
    payout: 92,
    fcfPayout: 90,
    cagr5y: 5.8,
    netDebtEbitda: null,
    roe: null,
    pvp: 0.99,
    vacancy: 0.05,
    yearsPaying: 12,
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    nextMonth: "Todo dia 14",
    consistency: "10 anos consecutivos",
    windowCom: "Todo último dia útil",
    defaultTags: ["bazin", "monthly"],
  },
  {
    ticker: "MXRF11",
    name: "Maxi Renda FII",
    type: "FII",
    currency: "BRL",
    targetYield: 8.0,
    price: 10.08,
    dpa: 1.27,
    payout: 104,
    fcfPayout: 104,
    cagr5y: -2.1,
    netDebtEbitda: null,
    roe: null,
    pvp: 1.02,
    vacancy: 0.0,
    yearsPaying: 9,
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    nextMonth: "Todo dia 14",
    consistency: "Mensal",
    windowCom: "Todo último dia útil",
    defaultTags: ["risk", "monthly"],
    isTrap: true,
  },
  // US Equities & REITs
  {
    ticker: "O",
    name: "Realty Income",
    type: "REIT",
    currency: "USD",
    targetYield: 4.0,
    price: 52.4,
    dpa: 3.12,
    payout: 74,
    fcfPayout: 74,
    cagr5y: 4.2,
    netDebtEbitda: 5.5,
    roe: null,
    pvp: 1.1,
    vacancy: 0.015,
    yearsPaying: 30,
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    nextMonth: "Todo dia 15",
    consistency: "30 anos consecutivos",
    windowCom: "Paga todo dia 15",
    defaultTags: ["dgi", "bazin", "monthly"],
  },
  {
    ticker: "JNJ",
    name: "Johnson & Johnson",
    type: "STOCK_US",
    currency: "USD",
    targetYield: 4.0,
    price: 158.2,
    dpa: 4.96,
    payout: 68,
    fcfPayout: 58,
    cagr5y: 5.8,
    netDebtEbitda: 0.6,
    roe: 26,
    yearsPaying: 62,
    months: [3, 6, 9, 12],
    nextMonth: "Junho/26",
    consistency: "62 anos aumentando",
    windowCom: "~20 a 24 de Maio (ex)",
    defaultTags: ["dgi", "bazin"],
  },
  {
    ticker: "KO",
    name: "Coca-Cola Co",
    type: "STOCK_US",
    currency: "USD",
    targetYield: 4.0,
    price: 62.1,
    dpa: 1.94,
    payout: 70,
    fcfPayout: 65,
    cagr5y: 5.1,
    netDebtEbitda: 1.8,
    roe: 38,
    yearsPaying: 62,
    months: [4, 7, 10, 12],
    nextMonth: "Julho/26",
    consistency: "62 anos aumentando",
    windowCom: "~12 a 16 de Junho",
    defaultTags: ["dgi", "bazin"],
  },
  {
    ticker: "PEP",
    name: "PepsiCo Inc",
    type: "STOCK_US",
    currency: "USD",
    targetYield: 4.0,
    price: 168.0,
    dpa: 5.42,
    payout: 75,
    fcfPayout: 70,
    cagr5y: 6.9,
    netDebtEbitda: 2.2,
    roe: 48,
    yearsPaying: 52,
    months: [1, 3, 6, 9],
    nextMonth: "Junho/26",
    consistency: "52 anos aumentando",
    windowCom: "~02 a 06 de Junho",
    defaultTags: ["dgi", "bazin"],
  },
  {
    ticker: "PG",
    name: "Procter & Gamble",
    type: "STOCK_US",
    currency: "USD",
    targetYield: 4.0,
    price: 165.5,
    dpa: 4.03,
    payout: 62,
    fcfPayout: 56,
    cagr5y: 5.9,
    netDebtEbitda: 1.1,
    roe: 32,
    yearsPaying: 67,
    months: [2, 5, 8, 11],
    nextMonth: "Agosto/26",
    consistency: "67 anos aumentando",
    windowCom: "~18 a 22 de Julho",
    defaultTags: ["dgi", "bazin"],
  },
  {
    ticker: "ABBV",
    name: "AbbVie Inc",
    type: "STOCK_US",
    currency: "USD",
    targetYield: 4.0,
    price: 182.0,
    dpa: 6.2,
    payout: 78,
    fcfPayout: 60,
    cagr5y: 8.5,
    netDebtEbitda: 2.5,
    roe: 60,
    yearsPaying: 51,
    months: [2, 5, 8, 11],
    nextMonth: "Agosto/26",
    consistency: "51 anos aumentando",
    windowCom: "~12 a 16 de Julho",
    defaultTags: ["dgi", "bazin"],
  },
  {
    ticker: "SCHD",
    name: "Schwab US Dividend ETF",
    type: "ETF",
    currency: "USD",
    targetYield: 4.0,
    price: 81.1,
    dpa: 3.08,
    payout: null,
    fcfPayout: null,
    cagr5y: 11.8,
    netDebtEbitda: null,
    roe: null,
    yearsPaying: 12,
    months: [3, 6, 9, 12],
    nextMonth: "Junho/26",
    consistency: "12 anos seguidos",
    windowCom: "~18 a 22 de Junho",
    defaultTags: ["dgi", "bazin"],
  },
  {
    ticker: "JEPI",
    name: "JPMorgan Equity Premium ETF",
    type: "ETF",
    currency: "USD",
    targetYield: 7.0,
    price: 56.4,
    dpa: 4.25,
    payout: null,
    fcfPayout: null,
    cagr5y: 2.5,
    netDebtEbitda: null,
    roe: null,
    yearsPaying: 4,
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    nextMonth: "Todo dia 05",
    consistency: "Mensal",
    windowCom: "1º dia útil do mês",
    defaultTags: ["monthly"],
  },
];

/**
 * Calculates real net dividend yield considering withholding tax reality
 * (IRS 30% via W-8BEN for US assets; 15% IRRF for BR JCP; 100% exempt for FIIs & BR dividends)
 */
export function calculateNetYield(
  dyGross: number,
  currency: string,
  assetType: AssetType,
  isJcp: boolean = false,
  taxJurisdiction?: "BR" | "US",
): number {
  if (typeof dyGross !== "number" || !Number.isFinite(dyGross) || dyGross <= 0) return 0;
  if (currency === "USD") {
    return taxJurisdiction === "US" ? dyGross : dyGross * 0.7; // 30% IRS withholding
  }
  if (assetType === "FII" || assetType === "FII_INFRA") {
    return dyGross; // Isento no Brasil
  }
  if (isJcp) {
    return dyGross * 0.85; // 15% IRRF na fonte
  }
  return dyGross; // Dividendos de ações no Brasil são 100% isentos para PF
}

/**
 * Normalizes live assets and catalog into unified RadarItem collection
 */
export function buildRadarItems(
  liveData?: { br?: any[]; us?: any[] } | null,
  taxJurisdiction?: "BR" | "US",
  locale: string = "pt-BR",
): RadarItem[] {
  const liveMap = new Map<string, any>();
  if (liveData) {
    if (Array.isArray(liveData.br)) {
      for (const asset of liveData.br) {
        if (asset?.ticker) liveMap.set(asset.ticker.toUpperCase(), asset);
      }
    }
    if (Array.isArray(liveData.us)) {
      for (const asset of liveData.us) {
        if (asset?.ticker) liveMap.set(asset.ticker.toUpperCase(), asset);
      }
    }
  }

  return RADAR_CATALOG.map((cat) => {
    const raw = liveMap.get(cat.ticker.toUpperCase());
    const livePrice =
      raw && typeof raw.price === "number" && raw.price > 0 ? raw.price : cat.price;

    let liveDpa = cat.dpa;
    if (raw) {
      if (Array.isArray(raw.dividends3y) && raw.dividends3y.length > 0) {
        const computedAvg = avgDividend(raw.dividends3y);
        if (computedAvg > 0) liveDpa = computedAvg;
      } else if (typeof raw.annualDividend === "number" && raw.annualDividend > 0) {
        liveDpa = raw.annualDividend;
      }
    }

    const teto = ceilingPrice(liveDpa, cat.targetYield);
    const margin = safetyMargin(teto, livePrice);

    const safetyInput: AssetSafetyInput = {
      type: cat.type,
      payoutRatio: cat.payout,
      netDebtToEbitda: cat.netDebtEbitda,
      roe: cat.roe,
      yearsPayingDividends: cat.yearsPaying ?? 10,
      pvp: cat.pvp,
      vacancyRate: cat.vacancy,
      currency: cat.currency,
      locale,
    };
    const safetyResult = calculateDividendSafetyScore(safetyInput, locale);

    const dyGross = livePrice > 0 ? (liveDpa / livePrice) * 100 : 0;
    const dyNet = calculateNetYield(dyGross, cat.currency, cat.type, cat.isJcp, taxJurisdiction);

    const isTrap = Boolean(cat.isTrap || safetyResult.tier === "cut_risk");

    const tags: RadarStrategy[] = ["all"];
    if (cat.defaultTags.includes("dgi")) tags.push("dgi");
    if (cat.defaultTags.includes("monthly")) tags.push("monthly");
    if (margin > 0 && !isTrap) tags.push("bazin");
    if (isTrap || margin < -20 || safetyResult.tier === "caution") tags.push("risk");

    return {
      ticker: cat.ticker,
      name: raw?.name || cat.name,
      type: cat.type,
      currency: cat.currency,
      price: livePrice,
      ceilingPrice: teto,
      margin,
      dpa: liveDpa,
      targetYield: cat.targetYield,
      dyGross,
      dyNet,
      payout: cat.payout,
      fcfPayout: cat.fcfPayout,
      cagr5y: cat.cagr5y,
      netDebtEbitda: cat.netDebtEbitda,
      roe: cat.roe,
      safetyScore: safetyResult.score,
      safetyTier: safetyResult.tier,
      safetyLabel: safetyResult.label,
      safetySummary: safetyResult.summary,
      safetyResult,
      months: cat.months,
      nextMonth: cat.nextMonth,
      consistency: cat.consistency,
      windowCom: cat.windowCom,
      tags,
      isTrap,
    };
  });
}

export interface PortfolioGapAnalysis {
  hasGaps: boolean;
  weakMonths: { month: number; name: string }[];
  suggestedMonth: number;
  suggestedMonthName: string;
  threshold: number;
  portfolioMonthlyAvg: number;
}

const MONTH_NAMES_FALLBACK: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

/**
 * Gap Finder: Detects dry/low-income months in user's portfolio
 */
export function detectPortfolioGaps(
  valuedItems: ValuedWatchlistItem[] = [],
  monthNamesObj?: Record<number, string>,
): PortfolioGapAnalysis {
  const getMonthName = (m: number) => (monthNamesObj ? monthNamesObj[m] : MONTH_NAMES_FALLBACK[m]) || `Mês ${m}`;

  const ownedPositions = valuedItems.filter((i) => !i.isClosedPosition && i.quantity > 0);
  if (ownedPositions.length === 0) {
    // Default discovery state: recommend May (5) and November (11) as historical high-density peak months
    return {
      hasGaps: false,
      weakMonths: [
        { month: 5, name: getMonthName(5) },
        { month: 11, name: getMonthName(11) },
      ],
      suggestedMonth: 5,
      suggestedMonthName: getMonthName(5),
      threshold: 0,
      portfolioMonthlyAvg: 0,
    };
  }

  // Calculate annual estimated income per position
  let totalAnnualIncome = 0;
  const monthSums: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  };

  for (const pos of ownedPositions) {
    const annual = (pos.annualDividend || 0) * (pos.quantity || 0);
    totalAnnualIncome += annual;

    // Distribute across asset's known paying months
    const catMatch = RADAR_CATALOG.find((c) => c.ticker.toUpperCase() === pos.ticker.toUpperCase());
    const payingMonths = catMatch ? catMatch.months : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const perMonth = annual / payingMonths.length;
    for (const m of payingMonths) {
      monthSums[m] = (monthSums[m] || 0) + perMonth;
    }
  }

  const monthlyAvg = totalAnnualIncome / 12;
  const threshold = Math.max(10, monthlyAvg * 0.5);

  const weakMonths: { month: number; name: string }[] = [];
  for (let m = 1; m <= 12; m++) {
    if (monthSums[m] < threshold) {
      weakMonths.push({ month: m, name: getMonthName(m) });
    }
  }

  const hasGaps = weakMonths.length > 0;
  const suggested = weakMonths.length > 0 ? weakMonths[0] : { month: 5, name: getMonthName(5) };

  return {
    hasGaps,
    weakMonths,
    suggestedMonth: suggested.month,
    suggestedMonthName: suggested.name,
    threshold,
    portfolioMonthlyAvg: monthlyAvg,
  };
}

// =========================================================
// AGENDA DIÁRIA & RADAR DATA COM (OPÇÃO E)
// =========================================================

export type DividendEventType = "com" | "pay";
export type DividendTaxType = "dividendo" | "jcp" | "rendimento_fii" | "us_cash" | "bdr" | "amortizacao";
export type MarketRegion = "BR" | "US";
export type AgendaAssetClass = "all" | "STOCK_BR" | "FII" | "ETF_BR" | "BDR" | "STOCK_US" | "REIT" | "ETF_US";

export interface RawAgendaEvent {
  id: string;
  market: MarketRegion;
  dateKey: string; // YYYY-MM-DD
  month: number; // 1 to 12
  isToday?: boolean;
  ticker: string;
  name: string;
  type: AssetType;
  currency: "BRL" | "USD";
  eventType: DividendEventType;
  taxType: DividendTaxType;
  declaredAmount: number;
  reciprocalDate: string; // e.g. "14/10/2026"
  isTrap?: boolean;
}

export interface AgendaDividendEvent {
  id: string;
  market: MarketRegion;
  dateKey: string;
  dateFormatted: string;
  isToday: boolean;
  month: number;
  ticker: string;
  name: string;
  type: AssetType;
  currency: "BRL" | "USD";
  eventType: DividendEventType;
  taxType: DividendTaxType;
  declaredAmount: number;
  reciprocalDateFormatted: string;
  price: number;
  ceilingPrice: number;
  margin: number;
  isBelowCeiling: boolean;
  dyGross: number;
  dyNet: number;
  payout: number | null;
  safetyScore: number;
  safetyTier: DividendSafetyTier;
  safetyLabel: string;
  isTrap: boolean;
  radarItem?: RadarItem;
}

export interface AgendaSummaryStats {
  totalEvents: number;
  totalCom: number;
  totalPay: number;
  totalBelowCeiling: number;
  totalHighSafety: number;
}

export const AGENDA_CATALOG: RawAgendaEvent[] = [
  // ================= BRASIL (B3) =================
  // HOJE (25/Set/2026)
  {
    id: "br-bbas3-20260925-com",
    market: "BR",
    dateKey: "2026-09-25",
    month: 9,
    isToday: true,
    ticker: "BBAS3",
    name: "Banco do Brasil S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    eventType: "com",
    taxType: "jcp",
    declaredAmount: 0.8454,
    reciprocalDate: "14/10/2026",
  },
  {
    id: "br-hglg11-20260925-pay",
    market: "BR",
    dateKey: "2026-09-25",
    month: 9,
    isToday: true,
    ticker: "HGLG11",
    name: "CSHG Logística FII",
    type: "FII",
    currency: "BRL",
    eventType: "pay",
    taxType: "rendimento_fii",
    declaredAmount: 1.1,
    reciprocalDate: "15/09/2026",
  },
  {
    id: "br-cple6-20260925-com",
    market: "BR",
    dateKey: "2026-09-25",
    month: 9,
    isToday: true,
    ticker: "CPLE6",
    name: "Copel Energia",
    type: "STOCK_BR",
    currency: "BRL",
    eventType: "com",
    taxType: "dividendo",
    declaredAmount: 0.285,
    reciprocalDate: "14/10/2026",
  },

  // 28/Set/2026
  {
    id: "br-itsa4-20260928-com",
    market: "BR",
    dateKey: "2026-09-28",
    month: 9,
    ticker: "ITSA4",
    name: "Itaúsa Investimentos",
    type: "STOCK_BR",
    currency: "BRL",
    eventType: "com",
    taxType: "jcp",
    declaredAmount: 0.0512,
    reciprocalDate: "30/10/2026",
  },
  {
    id: "br-xpml11-20260928-com",
    market: "BR",
    dateKey: "2026-09-28",
    month: 9,
    ticker: "XPML11",
    name: "XP Malls FII",
    type: "FII",
    currency: "BRL",
    eventType: "com",
    taxType: "rendimento_fii",
    declaredAmount: 0.92,
    reciprocalDate: "14/10/2026",
  },

  // 29/Set/2026
  {
    id: "br-taee11-20260929-pay",
    market: "BR",
    dateKey: "2026-09-29",
    month: 9,
    ticker: "TAEE11",
    name: "Taesa Transmissora",
    type: "STOCK_BR",
    currency: "BRL",
    eventType: "pay",
    taxType: "dividendo",
    declaredAmount: 0.984,
    reciprocalDate: "12/09/2026",
  },

  // 30/Set/2026 (Fechamento Mensal)
  {
    id: "br-vale3-20260930-pay",
    market: "BR",
    dateKey: "2026-09-30",
    month: 9,
    ticker: "VALE3",
    name: "Vale S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    eventType: "pay",
    taxType: "jcp",
    declaredAmount: 1.8245,
    reciprocalDate: "10/09/2026",
  },
  {
    id: "br-petr4-20260930-com",
    market: "BR",
    dateKey: "2026-09-30",
    month: 9,
    ticker: "PETR4",
    name: "Petróleo Brasileiro S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    eventType: "com",
    taxType: "dividendo",
    declaredAmount: 1.352,
    reciprocalDate: "20/11/2026",
    isTrap: true,
  },
  {
    id: "br-knip11-20260930-pay",
    market: "BR",
    dateKey: "2026-09-30",
    month: 9,
    ticker: "KNIP11",
    name: "Kinea Rendimentos Imobiliários FII",
    type: "FII",
    currency: "BRL",
    eventType: "pay",
    taxType: "rendimento_fii",
    declaredAmount: 0.85,
    reciprocalDate: "15/09/2026",
  },
  {
    id: "br-aapl34-20260930-pay",
    market: "BR",
    dateKey: "2026-09-30",
    month: 9,
    ticker: "AAPL34",
    name: "Apple Inc BDR B3",
    type: "STOCK_US",
    currency: "BRL",
    eventType: "pay",
    taxType: "bdr",
    declaredAmount: 0.3812,
    reciprocalDate: "11/09/2026",
  },

  // OUTUBRO
  {
    id: "br-trpl4-20261005-com",
    market: "BR",
    dateKey: "2026-10-05",
    month: 10,
    ticker: "TRPL4",
    name: "ISA CTEEP S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    eventType: "com",
    taxType: "jcp",
    declaredAmount: 0.623,
    reciprocalDate: "28/10/2026",
  },
  {
    id: "br-bbas3-20261014-pay",
    market: "BR",
    dateKey: "2026-10-14",
    month: 10,
    ticker: "BBAS3",
    name: "Banco do Brasil S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    eventType: "pay",
    taxType: "jcp",
    declaredAmount: 0.8454,
    reciprocalDate: "25/09/2026",
  },
  {
    id: "br-ivvb11-20261030-pay",
    market: "BR",
    dateKey: "2026-10-30",
    month: 10,
    ticker: "IVVB11",
    name: "iShares S&P 500 ETF B3",
    type: "ETF",
    currency: "BRL",
    eventType: "pay",
    taxType: "amortizacao",
    declaredAmount: 2.1,
    reciprocalDate: "15/10/2026",
  },

  // ================= ESTADOS UNIDOS (NYSE/NASDAQ) =================
  // HOJE (25/Sep/2026)
  {
    id: "us-o-20260925-pay",
    market: "US",
    dateKey: "2026-09-25",
    month: 9,
    isToday: true,
    ticker: "O",
    name: "Realty Income Corp",
    type: "REIT",
    currency: "USD",
    eventType: "pay",
    taxType: "us_cash",
    declaredAmount: 0.2635,
    reciprocalDate: "01/09/2026",
  },
  {
    id: "us-jnj-20260928-com",
    market: "US",
    dateKey: "2026-09-28",
    month: 9,
    ticker: "JNJ",
    name: "Johnson & Johnson",
    type: "STOCK_US",
    currency: "USD",
    eventType: "com",
    taxType: "us_cash",
    declaredAmount: 1.24,
    reciprocalDate: "15/10/2026",
  },
  {
    id: "us-pg-20260929-com",
    market: "US",
    dateKey: "2026-09-29",
    month: 9,
    ticker: "PG",
    name: "Procter & Gamble Co.",
    type: "STOCK_US",
    currency: "USD",
    eventType: "com",
    taxType: "us_cash",
    declaredAmount: 1.0065,
    reciprocalDate: "15/10/2026",
  },
  {
    id: "us-ko-20260930-pay",
    market: "US",
    dateKey: "2026-09-30",
    month: 9,
    ticker: "KO",
    name: "The Coca-Cola Company",
    type: "STOCK_US",
    currency: "USD",
    eventType: "pay",
    taxType: "us_cash",
    declaredAmount: 0.485,
    reciprocalDate: "13/09/2026",
  },
  {
    id: "us-vici-20260930-com",
    market: "US",
    dateKey: "2026-09-30",
    month: 9,
    ticker: "VICI",
    name: "VICI Properties Inc.",
    type: "REIT",
    currency: "USD",
    eventType: "com",
    taxType: "us_cash",
    declaredAmount: 0.4325,
    reciprocalDate: "15/10/2026",
  },
  {
    id: "us-vym-20260930-pay",
    market: "US",
    dateKey: "2026-09-30",
    month: 9,
    ticker: "VYM",
    name: "Vanguard High Dividend Yield ETF",
    type: "ETF",
    currency: "USD",
    eventType: "pay",
    taxType: "us_cash",
    declaredAmount: 0.942,
    reciprocalDate: "18/09/2026",
  },
  {
    id: "us-schd-20261002-com",
    market: "US",
    dateKey: "2026-10-02",
    month: 10,
    ticker: "SCHD",
    name: "Schwab US Dividend Equity ETF",
    type: "ETF",
    currency: "USD",
    eventType: "com",
    taxType: "us_cash",
    declaredAmount: 0.751,
    reciprocalDate: "15/10/2026",
  },
  {
    id: "us-msft-20261015-pay",
    market: "US",
    dateKey: "2026-10-15",
    month: 10,
    ticker: "MSFT",
    name: "Microsoft Corp",
    type: "STOCK_US",
    currency: "USD",
    eventType: "pay",
    taxType: "us_cash",
    declaredAmount: 0.83,
    reciprocalDate: "20/09/2026",
  },
];

/**
 * Builds normalized daily agenda events enriched with SSOT Valuation and Dividend Safety Score
 */
export function buildAgendaEvents(
  radarItems: RadarItem[] = [],
  locale: string = "pt-BR",
  customCatalog?: RawAgendaEvent[],
): AgendaDividendEvent[] {
  const catalog = customCatalog || AGENDA_CATALOG;
  const radarMap = new Map<string, RadarItem>();
  for (const r of radarItems) {
    radarMap.set(r.ticker.toUpperCase(), r);
  }

  return catalog.map((raw) => {
    const radar = radarMap.get(raw.ticker.toUpperCase());

    const price = radar ? radar.price : raw.currency === "USD" ? 50.0 : 30.0;
    const ceiling = radar ? radar.ceilingPrice : price * 1.15;
    const margin = radar ? radar.margin : safetyMargin(ceiling, price);
    const isBelowCeiling = margin > 0;
    const dyGross = radar ? radar.dyGross : (raw.declaredAmount * 4) / price * 100;
    const dyNet = radar ? radar.dyNet : dyGross;
    const payout = radar ? radar.payout : 60;
    const safetyScore = radar ? radar.safetyScore : 90;
    const safetyTier = radar ? radar.safetyTier : "safe";
    const safetyLabel = radar ? radar.safetyLabel : "Seguro";
    const isTrap = Boolean(raw.isTrap || (radar ? radar.isTrap : false));

    // Formatar data de forma legível de acordo com o locale
    let dateFormatted = raw.dateKey;
    try {
      const [y, m, d] = raw.dateKey.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const weekday = dateObj.toLocaleDateString(locale, { weekday: "long" });
      const day = String(d).padStart(2, "0");
      const monthLong = dateObj.toLocaleDateString(locale, { month: "long" });
      const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      const capMonth = monthLong.charAt(0).toUpperCase() + monthLong.slice(1);
      dateFormatted = `${capWeekday}, ${day} de ${capMonth} de ${y}`;
    } catch {
      dateFormatted = raw.dateKey;
    }

    return {
      id: raw.id,
      market: raw.market,
      dateKey: raw.dateKey,
      dateFormatted,
      isToday: Boolean(raw.isToday),
      month: raw.month,
      ticker: raw.ticker,
      name: raw.name,
      type: raw.type,
      currency: raw.currency,
      eventType: raw.eventType,
      taxType: raw.taxType,
      declaredAmount: raw.declaredAmount,
      reciprocalDateFormatted: raw.reciprocalDate,
      price,
      ceilingPrice: ceiling,
      margin,
      isBelowCeiling,
      dyGross,
      dyNet,
      payout,
      safetyScore,
      safetyTier,
      safetyLabel,
      isTrap,
      radarItem: radar,
    };
  });
}

/**
 * Computes quantitative monthly summary statistics for the agenda banner
 */
export function computeAgendaStats(events: AgendaDividendEvent[]): AgendaSummaryStats {
  return {
    totalEvents: events.length,
    totalCom: events.filter((e) => e.eventType === "com").length,
    totalPay: events.filter((e) => e.eventType === "pay").length,
    totalBelowCeiling: events.filter((e) => e.isBelowCeiling).length,
    totalHighSafety: events.filter((e) => e.safetyScore >= 80).length,
  };
}

