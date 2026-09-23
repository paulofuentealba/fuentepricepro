import type { Asset, AssetType, Currency, DividendEvent } from "./domain";
import { MONTHLY_TYPES } from "./cashflow";
import { estimatePaymentDate } from "./fiiPaymentRules";
import { formatDate, type Locale } from "./formatters";
import type { RepresentativeAssetData } from "@/components/explore/detailAssetsData";
import type { en } from "./i18n/dict.en";

export type DividendFrequencyType =
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "8x"
  | "accumulating"
  | "irregular";

export interface ResolvedDividendIntelligence {
  /** The normalized frequency classification */
  frequency: DividendFrequencyType;
  /** Number of payout cycles per calendar year (e.g. 12 for monthly, 4 for quarterly, 0 for accumulating) */
  cyclesPerYear: number;
  /** Localized human-readable frequency text (e.g. "Mensal", "Trimestral", "8x ao ano") */
  frequencyLabel: string;
  /** Formatted string of the next / most recent data-COM date */
  nextComDateText: string;
  /** Formatted string of the next / most recent payment date */
  nextPaymentDateText: string;
  /** Formatted value per share/quota (e.g. "R$ 1,10 / cota", "US$ 0.82 / share") */
  nextValFormatted: string;
  /** Estimated dividend amount per cycle for 1 unit (used in snowball calculation) */
  dividendPerCycle: number;
  /** Number of shares needed to purchase 1 new share every cycle */
  snowballReqQty: number;
}

/**
 * Returns the localized unit name for an asset (e.g. cota, ação, share).
 */
export function getAssetShareUnit(
  type: AssetType,
  currency: Currency,
  locale: Locale = "ptBR",
  t?: typeof en,
): string {
  const isUs = currency === "USD" || type === "STOCK_US" || type === "REIT";
  if (isUs) {
    if (locale === "en") return "share";
    if (locale === "es") return "acción";
    return "ação";
  }

  const isQuotaType = type === "FII" || type === "FIAGRO" || type === "FII_INFRA" || type === "ETF";
  if (isQuotaType) {
    if (locale === "en") return "share";
    if (locale === "es") return "cuota";
    return "cota";
  }

  if (locale === "en") return "share";
  if (locale === "es") return "acción";
  return "ação";
}

/**
 * Canonically resolves dividend intelligence for any asset (FII, FIAGRO, ETF, Stock BR, Stock US, REIT).
 * 
 * Hierarchy:
 * 1. Specific demo data (repData) ONLY when real live asset is absent or explicitly in demo mode.
 * 2. True asset data:
 *    - Accumulating ETF detection (no cash distributions)
 *    - Regulatory / market monthly classes (FII, FIAGRO, FII_INFRA, REIT) -> Monthly (12 cycles)
 *    - Recurring month patterns from asset.paymentMonths (>=8 -> Monthly, 4 -> Quarterly, 2 -> Semiannual, 1 -> Annual)
 *    - Canonical corporate distribution policies (e.g. BBAS3 -> 8x/yr)
 *    - Concrete nextCom and nextPay dates from asset.dividendEvents and fiiPaymentRules
 *    - Real per-share amount from latest announced event instead of artificial division
 */
export function resolveDividendIntelligence(params: {
  asset?: Asset | null;
  repData?: RepresentativeAssetData;
  ticker: string;
  livePrice: number;
  annualDividend: number;
  currency: Currency;
  locale: Locale;
  t?: typeof en;
}): ResolvedDividendIntelligence {
  const { asset, repData, ticker, livePrice, annualDividend, currency, locale, t } = params;

  const upperTicker = ticker.toUpperCase();
  const assetType: AssetType = asset?.type ?? repData?.classType ?? "STOCK_BR";
  const shareUnit = getAssetShareUnit(assetType, currency, locale, t);

  // If repData exists and asset has no live market events/type yet, use representative metadata
  const isPureDemo = !asset && Boolean(repData);

  // 1. Detect Frequency and Cycles per Year
  let frequency: DividendFrequencyType = "quarterly";
  let cyclesPerYear = 4;

  if (isPureDemo && repData) {
    const rawFreq = repData.payFreq.toLowerCase();
    if (rawFreq.includes("sem distribui") || rawFreq.includes("reinvest")) {
      frequency = "accumulating";
      cyclesPerYear = 0;
    } else if (rawFreq.includes("8x")) {
      frequency = "8x";
      cyclesPerYear = 8;
    } else if (rawFreq.startsWith("mensal") || rawFreq.startsWith("monthly") || rawFreq.startsWith("mensual")) {
      frequency = "monthly";
      cyclesPerYear = 12;
    } else if (rawFreq.startsWith("semestral") || rawFreq.startsWith("semiannual")) {
      frequency = "semiannual";
      cyclesPerYear = 2;
    } else if (rawFreq.startsWith("anual") || rawFreq.startsWith("annual")) {
      frequency = "annual";
      cyclesPerYear = 1;
    } else {
      frequency = "quarterly";
      cyclesPerYear = 4;
    }
  } else {
    // Dynamic determination using canonical domain data
    const isAccumulatingEtf =
      assetType === "ETF" &&
      (upperTicker === "IVVB11" ||
        upperTicker === "BOVA11" ||
        upperTicker === "SMAL11" ||
        ((!asset?.paymentMonths || asset.paymentMonths.length === 0) &&
          (!asset?.dividendEvents || asset.dividendEvents.length === 0) &&
          annualDividend === 0));

    const isFiiClass =
      assetType === "FII" ||
      assetType === "FIAGRO" ||
      assetType === "FII_INFRA" ||
      assetType === "REIT" ||
      upperTicker === "O";

    if (isAccumulatingEtf) {
      frequency = "accumulating";
      cyclesPerYear = 0;
    } else if (upperTicker === "BBAS3") {
      frequency = "8x";
      cyclesPerYear = 8;
    } else if (asset?.paymentMonths && asset.paymentMonths.length >= 8) {
      // Any asset that consistently distributes 8-12 times a year is monthly
      frequency = "monthly";
      cyclesPerYear = 12;
    } else if (asset?.paymentMonths && asset.paymentMonths.length >= 3 && asset.paymentMonths.length <= 5) {
      // Assets that pay ~4 times a year are quarterly (e.g. SCHD, VOO, KO)
      frequency = "quarterly";
      cyclesPerYear = 4;
    } else if (asset?.paymentMonths && asset.paymentMonths.length === 2) {
      // Assets that pay ~2 times a year are semiannual (e.g. VALE3)
      frequency = "semiannual";
      cyclesPerYear = 2;
    } else if (asset?.paymentMonths && asset.paymentMonths.length === 1) {
      frequency = "annual";
      cyclesPerYear = 1;
    } else if (isFiiClass) {
      // FIIs, FIAGROs, FI-Infras and REITs have contractual/regulatory monthly distributions by default
      frequency = "monthly";
      cyclesPerYear = 12;
    } else if (currency === "USD" || assetType === "STOCK_US") {
      // US Stocks standard is quarterly
      frequency = "quarterly";
      cyclesPerYear = 4;
    } else {
      // Brazilian stocks that don't have monthly/quarterly patterns are usually semiannual/irregular
      frequency = "semiannual";
      cyclesPerYear = 2;
    }
  }

  // 2. Localized Frequency Label
  let frequencyLabel = "";
  if (frequency === "accumulating") {
    frequencyLabel =
      t?.deepDive?.frequencies?.accumulating ||
      (locale === "en"
        ? "No cash distribution (Accumulating)"
        : locale === "es"
          ? "Sin distribución en efectivo (Acumulación)"
          : "Sem distribuição em dinheiro (Acumulação)");
  } else if (frequency === "8x") {
    frequencyLabel =
      t?.deepDive?.frequencies?.eightTimes ||
      (locale === "en" ? "8x per year" : locale === "es" ? "8x al año" : "8x ao ano");
  } else if (frequency === "monthly") {
    if (upperTicker === "O") {
      frequencyLabel =
        locale === "en"
          ? "Monthly (The Monthly Dividend Co.)"
          : locale === "es"
            ? "Mensual (The Monthly Dividend Co.)"
            : "Mensal (The Monthly Dividend Co.)";
    } else if (repData && isPureDemo) {
      frequencyLabel = repData.payFreq;
    } else {
      frequencyLabel =
        t?.deepDive?.frequencies?.monthly ||
        (locale === "en" ? "Monthly" : locale === "es" ? "Mensual" : "Mensal");
    }
  } else if (frequency === "quarterly") {
    frequencyLabel =
      t?.deepDive?.frequencies?.quarterly ||
      (locale === "en" ? "Quarterly" : locale === "es" ? "Trimestral" : "Trimestral");
  } else if (frequency === "semiannual") {
    frequencyLabel =
      t?.deepDive?.frequencies?.semiannual ||
      (locale === "en" ? "Semiannual" : locale === "es" ? "Semestral" : "Semestral");
  } else if (frequency === "annual") {
    frequencyLabel =
      t?.deepDive?.frequencies?.annual ||
      (locale === "en" ? "Annual" : locale === "es" ? "Anual" : "Anual");
  } else {
    frequencyLabel =
      t?.deepDive?.frequencies?.irregular ||
      (locale === "en" ? "Irregular / On Demand" : locale === "es" ? "Irregular / Bajo Demanda" : "Sob Demanda / Irregular");
  }

  // 3. Next / Recent Dividend Events Inspection
  const sortedEvents = (asset?.dividendEvents ?? [])
    .filter((e) => Number.isFinite(e.amountPerShare) && e.amountPerShare > 0)
    .sort((a, b) => new Date(b.exDate || 0).getTime() - new Date(a.exDate || 0).getTime());

  const latestEvent: DividendEvent | undefined = sortedEvents[0];

  // Next COM Date
  let nextComDateText = "—";
  if (frequency === "accumulating") {
    nextComDateText = "N/A";
  } else if (asset?.exDividendDate) {
    nextComDateText = formatDate(asset.exDividendDate, locale) || "—";
  } else if (latestEvent?.exDate) {
    const exTime = new Date(latestEvent.exDate).getTime();
    const nowTime = Date.now();
    // If exDate is future or within the last 35 days, display it
    if (exTime > nowTime || nowTime - exTime < 35 * 24 * 60 * 60 * 1000) {
      nextComDateText = formatDate(latestEvent.exDate, locale) || "—";
    }
  }

  if (nextComDateText === "—" && repData?.nextCom && isPureDemo) {
    nextComDateText = repData.nextCom;
  }

  // Next Payment Date & Value per share
  let nextPaymentDateText = "—";
  let nextValAmount = 0;

  if (frequency === "accumulating") {
    nextPaymentDateText =
      t?.deepDive?.frequencies?.autoReinvest ||
      (locale === "en" ? "Auto-Reinvestment" : locale === "es" ? "Reinversión Automática" : "Reinvestimento Automático");
  } else if (latestEvent) {
    if (latestEvent.paymentDate) {
      nextPaymentDateText = formatDate(latestEvent.paymentDate, locale) || "—";
    } else if (MONTHLY_TYPES.includes(assetType) && latestEvent.exDate) {
      // Estimate payment date via canonical fiiPaymentRules if confirmed date is pending
      const estDate = estimatePaymentDate(upperTicker, new Date(latestEvent.exDate));
      if (estDate) {
        nextPaymentDateText = `${formatDate(estDate, locale)}*`;
      }
    }
    nextValAmount = latestEvent.amountPerShare;
  }

  // Fallback for payment date from repData in demo mode
  if (nextPaymentDateText === "—" && repData?.nextPay && isPureDemo) {
    nextPaymentDateText = repData.nextPay;
  }

  // Fallback for per-share amount: divide annual by cyclesPerYear
  if (nextValAmount <= 0) {
    if (repData && isPureDemo && repData.nextVal) {
      // Use representative value
    } else if (annualDividend > 0 && cyclesPerYear > 0) {
      nextValAmount = annualDividend / cyclesPerYear;
    }
  }

  // Format value string
  const currencySymbol = currency === "USD" ? "US$ " : "R$ ";
  let nextValFormatted = "";

  if (frequency === "accumulating") {
    nextValFormatted =
      t?.deepDive?.frequencies?.reinvestedInEtf ||
      (locale === "en" ? "Reinvested in ETF" : locale === "es" ? "Reinvertido en el ETF" : "Reinvestido no ETF");
  } else if (repData && isPureDemo && repData.nextVal) {
    nextValFormatted = repData.nextVal;
  } else if (nextValAmount > 0) {
    nextValFormatted = `${currencySymbol}${nextValAmount.toFixed(2)} / ${shareUnit}`;
  } else {
    nextValFormatted = `${currencySymbol}— / ${shareUnit}`;
  }

  // 4. Snowball Calculations (Autofinancing)
  const dividendPerCycle =
    nextValAmount > 0
      ? nextValAmount
      : cyclesPerYear > 0
        ? annualDividend / cyclesPerYear
        : 0;

  const snowballReqQty =
    dividendPerCycle > 0 && livePrice > 0
      ? Math.ceil(livePrice / dividendPerCycle)
      : repData?.snowballReqQty ?? 100;

  return {
    frequency,
    cyclesPerYear,
    frequencyLabel,
    nextComDateText,
    nextPaymentDateText,
    nextValFormatted,
    dividendPerCycle,
    snowballReqQty,
  };
}
