import type { Asset } from "./domain";
import type { ValuationResult } from "./calculations";
import { formatCurrency, formatPercent, type Locale } from "./i18n";
import { getDividendTypeLabel } from "./dividendLabel";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function getMonthNames(locale: Locale): string[] {
  if (locale === "en") return MONTH_NAMES_EN;
  if (locale === "es") return MONTH_NAMES_ES;
  return MONTH_NAMES_PT;
}

export function generateDynamicAssetFaq(
  asset: Asset,
  valuation: ValuationResult | null | undefined,
  t: any,
  locale: Locale = "ptBR",
): FaqItem[] {
  const faq: FaqItem[] = [];
  const ticker = asset.ticker;
  const currency = asset.currency;
  const monthNames = getMonthNames(locale);

  // 1. Current Price
  const formattedPrice = formatCurrency(asset.currentPrice, currency, locale);
  const qPrice = (t.assetFaq?.qPrice || "Qual a cotação de {{ticker}} hoje?").replace(
    "{{ticker}}",
    ticker,
  );
  const aPrice = (t.assetFaq?.aPrice || "A cotação atual de {{ticker}} é {{price}}.")
    .replace("{{ticker}}", ticker)
    .replace("{{price}}", formattedPrice);

  faq.push({
    id: "price",
    question: qPrice,
    answer: aPrice,
  });

  // 2. Dividends & Payment Months
  const divLabel = getDividendTypeLabel(asset.type, false, t);
  const qDividends = (
    t.assetFaq?.qDividends || "Quando {{ticker}} paga {{dividendType}}?"
  )
    .replace("{{ticker}}", ticker)
    .replace("{{dividendType}}", divLabel.toLowerCase());

  let aDividends = "";
  const months = (asset.paymentMonths ?? []).map((m) => monthNames[m - 1]).filter(Boolean);
  if (months.length > 0) {
    const monthsText = months.join(", ");
    aDividends = (
      t.assetFaq?.aDividendsMonths ||
      "{{ticker}} costuma realizar pagamentos habitualmente nos meses de: {{months}}."
    )
      .replace("{{ticker}}", ticker)
      .replace("{{months}}", monthsText);
  } else {
    aDividends = (
      t.assetFaq?.aDividendsUnknown ||
      "{{ticker}} não possui histórico de meses regulares de proventos cadastrado."
    ).replace("{{ticker}}", ticker);
  }

  faq.push({
    id: "dividends",
    question: qDividends,
    answer: aDividends,
  });

  // 3. Ceiling Price & Safety Margin
  const qCeiling = (
    t.assetFaq?.qCeiling || "Qual o Preço Teto estimado para {{ticker}}?"
  ).replace("{{ticker}}", ticker);

  let aCeiling = "";
  if (valuation && valuation.activeCeiling > 0 && !valuation.isUnavailable) {
    const ceilingFormatted = formatCurrency(valuation.activeCeiling, currency, locale);
    const marginFormatted = formatPercent(valuation.margin, locale);
    aCeiling = (
      t.assetFaq?.aCeiling ||
      "Pelo Consenso de Valuation, o Preço Teto estimado é {{ceilingPrice}}, com margem de segurança de {{margin}}."
    )
      .replace("{{ceilingPrice}}", ceilingFormatted)
      .replace("{{margin}}", marginFormatted);
  } else {
    aCeiling = (
      t.assetFaq?.aCeilingUnavailable ||
      "Não foi possível estimar um Preço Teto confiável com os modelos atuais para este ativo."
    ).replace("{{ticker}}", ticker);
  }

  faq.push({
    id: "ceiling",
    question: qCeiling,
    answer: aCeiling,
  });

  // 4. Is it worth investing? (Strictly neutral & factual)
  const qWorthIt = (t.assetFaq?.qWorthIt || "{{ticker}} vale a pena?").replace(
    "{{ticker}}",
    ticker,
  );

  const dyFormatted =
    asset.metrics?.currentDy != null
      ? formatPercent(asset.metrics.currentDy, locale)
      : valuation?.dividendYield != null
        ? formatPercent(valuation.dividendYield, locale)
        : "—";

  const marginFormatted =
    valuation?.margin != null ? formatPercent(valuation.margin, locale) : "—";

  const aWorthIt = (
    t.assetFaq?.aWorthIt ||
    "A decisão de investir em {{ticker}} depende da sua estratégia e horizonte. Atualmente, o ativo negocia a {{price}}, com Dividend Yield de {{dy}} e margem de segurança de {{margin}}. Lembramos que o Fuente Price Pro é uma ferramenta analítica e não realiza recomendação de compra ou venda."
  )
    .replace("{{ticker}}", ticker)
    .replace("{{price}}", formattedPrice)
    .replace("{{dy}}", dyFormatted)
    .replace("{{margin}}", marginFormatted);

  faq.push({
    id: "worthIt",
    question: qWorthIt,
    answer: aWorthIt,
  });

  return faq;
}
