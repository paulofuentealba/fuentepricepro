import type { AssetType, Currency } from "./domain";
import type { WatchlistItem } from "./watchlist";
import type { Transaction } from "./transactions";

const VALID_TYPES: AssetType[] = [
  "STOCK_US",
  "STOCK_BR",
  "REIT",
  "FII",
  "FII_INFRA",
  "FIAGRO",
  "ETF",
];

export interface ParsedCsvRow {
  ticker: string;
  type: AssetType | null;
  name?: string | null;
  quantity: number;
  averagePrice: number | null;
  targetYield?: number | null;
  ceilingPrice?: number | null;
  safetyMargin?: number | null;
  annualDividend?: number | null;
  sector?: string | null;
  currency?: Currency | null;
  targetMonthlyIncome?: number | null;
  customTaxRate?: number | null;
  investingSince?: number | null;
}

function csvEscape(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Legacy 4-column quick CSV export format.
 */
export function buildWatchlistCsv(items: WatchlistItem[]): string {
  const header = ["Ticker", "Type", "Quantity", "AveragePrice"];
  const rows = items.map((it) =>
    [it.ticker, it.type, it.quantity, it.averagePrice ?? ""].map(csvEscape).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

/**
 * Full Transactions CSV Export using canonical headers (Ticker, Tipo, Quantidade, Preço, Taxas, Data, Notas).
 */
export function buildTransactionsCsv(transactions: Transaction[]): string {
  const header = ["Ticker", "Tipo", "Quantidade", "Preço", "Taxas", "Data", "Notas"];
  const rows = transactions.map((t) => {
    const typeLabel = t.type === "sell" ? "Venda" : t.type === "corporate_action" ? "Evento" : "Compra";
    const dateStr = t.date ? new Date(t.date).toISOString().split("T")[0] : "";
    return [
      t.ticker,
      typeLabel,
      t.quantity,
      t.pricePerShare,
      t.fees || 0,
      dateStr,
      t.notes || "",
    ]
      .map(csvEscape)
      .join(",");
  });
  return [header.map(csvEscape).join(","), ...rows].join("\n");
}

/**
 * Full Watchlist Positions CSV Export with rich analytical columns (Symmetric with Import).
 */
export function buildWatchlistFullCsv(items: WatchlistItem[]): string {
  const header = [
    "Ticker",
    "Nome",
    "Tipo",
    "Quantidade",
    "Preço Médio",
    "Preço Teto",
    "Margem de Segurança (%)",
    "Yield Alvo (%)",
    "Dividendo Anual",
    "Setor",
    "Moeda",
    "Meta Renda Mensal",
    "Alíquota IR (%)",
    "Data Início",
  ];
  const rows = items.map((it) => {
    const investingSinceStr = it.investingSince
      ? new Date(it.investingSince).toISOString().split("T")[0]
      : "";
    return [
      it.ticker,
      it.name || "",
      it.type,
      it.quantity,
      it.averagePrice ?? "",
      it.ceilingPrice ?? "",
      it.safetyMargin != null ? Number(it.safetyMargin).toFixed(2) : "",
      it.targetYield ?? "",
      it.annualDividend ?? "",
      it.sector || "",
      it.currency,
      it.targetMonthlyIncome ?? "",
      it.customTaxRate ?? "",
      investingSinceStr,
    ]
      .map(csvEscape)
      .join(",");
  });
  return [header.map(csvEscape).join(","), ...rows].join("\n");
}

export interface ComparatorExportRow {
  ticker: string;
  name: string;
  type: string;
  currentPrice: number;
  ceilingPrice: number | null;
  safetyMargin: number | null;
  dividendYield: number | null;
  cagr5y: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  consensus: number | null;
}

export function buildComparatorCsv(rows: ComparatorExportRow[]): string {
  const header = [
    "Ticker",
    "Nome",
    "Tipo",
    "Preço Atual",
    "Preço Teto",
    "Margem de Segurança (%)",
    "Dividend Yield (%)",
    "CAGR 5A (%)",
    "P/L",
    "P/VP",
    "Bazin",
    "Graham",
    "Gordon",
    "Consenso",
  ];
  const csvRows = rows.map((r) =>
    [
      r.ticker,
      r.name,
      r.type,
      r.currentPrice,
      r.ceilingPrice ?? "",
      r.safetyMargin ?? "",
      r.dividendYield ?? "",
      r.cagr5y ?? "",
      r.peRatio ?? "",
      r.pbRatio ?? "",
      r.bazin ?? "",
      r.graham ?? "",
      r.gordon ?? "",
      r.consensus ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.map(csvEscape).join(","), ...csvRows].join("\n");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseAssetType(raw: string): AssetType | null {
  if (!raw) return null;
  const s = stripAccents(raw.toUpperCase().trim()).replace(/[-\s]/g, "_");
  if (VALID_TYPES.includes(s as AssetType)) return s as AssetType;
  if (s === "ACAO" || s === "ACOES" || s === "ACAO_BR" || s === "ACOES_BR" || s === "STOCK" || s === "BRAZILIAN_STOCK") return "STOCK_BR";
  if (s === "ACAO_EUA" || s === "ACOES_EUA" || s === "ACAO_US" || s === "ACOES_US" || s === "US_STOCK" || s === "STOCK_US" || s === "STOCK_EUA") return "STOCK_US";
  if (s === "FUNDO_IMOBILIARIO" || s === "FUNDOS_IMOBILIARIOS" || s === "FII") return "FII";
  if (s === "INFRA" || s === "FII_INFRA" || s === "FUNDO_INFRA" || s === "FII_INFRAESTRUTURA" || s === "FII-INFRA") return "FII_INFRA";
  if (s === "AGRO" || s === "FIAGRO" || s === "FUNDO_AGRO") return "FIAGRO";
  if (s === "REIT" || s === "REITS") return "REIT";
  if (s === "ETF") return "ETF";
  return null;
}

function parseCurrency(raw: string): Currency | null {
  if (!raw) return null;
  const s = raw.toUpperCase().trim();
  if (s === "BRL" || s === "R$" || s === "REAL") return "BRL";
  if (s === "USD" || s === "US$" || s === "$" || s === "DOLAR" || s === "DOLLAR") return "USD";
  return null;
}

/**
 * Robust CSV parser for watchlist imports. Supports both 4-column quick format
 * and full 14-column symmetric round-trip format with Portuguese/English aliases.
 * Never throws — malformed input returns an empty array so callers can show a friendly toast.
 */
export function parseWatchlistCsv(text: string): ParsedCsvRow[] {
  try {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = parseCsvLine(lines[0]).map(normalizeHeaderCell);
    const idx = {
      ticker: header.findIndex((h) => h === "ticker" || h === "symbol" || h === "ativo" || h === "papel" || h === "codigo"),
      name: header.findIndex((h) => h === "nome" || h === "name" || h === "empresa" || h === "company" || h === "descricao"),
      type: header.findIndex((h) => h === "tipo" || h === "type" || h === "assettype" || h === "classe"),
      qty: header.findIndex((h) => h === "quantidade" || h === "quantity" || h === "qtd" || h === "qtde" || h === "shares" || h === "volume" || h === "posicao" || h === "cantidad" || h === "cant"),
      avg: header.findIndex((h) => h === "precomedio" || h === "averageprice" || h === "avgprice" || h === "avg" || h === "cost" || h === "preco" || h === "price" || h === "pu"),
      ceiling: header.findIndex((h) => h === "precoteto" || h === "ceilingprice" || h === "teto" || h === "preciotecho"),
      margin: header.findIndex((h) => h === "margemdeseguranca" || h === "safetymargin" || h === "margem" || h === "margin"),
      targetYield: header.findIndex((h) => h === "yieldalvo" || h === "targetyield" || h === "yieldmeta" || h === "dyalvo"),
      annualDividend: header.findIndex((h) => h === "dividendoanual" || h === "annualdividend" || h === "dividendo" || h === "dividend"),
      sector: header.findIndex((h) => h === "setor" || h === "sector" || h === "segmento"),
      currency: header.findIndex((h) => h === "moeda" || h === "currency" || h === "curr"),
      targetMonthlyIncome: header.findIndex((h) => h === "metarendamensal" || h === "rendamensalalvo" || h === "targetmonthlyincome" || h === "metaderendamensal"),
      customTaxRate: header.findIndex((h) => h === "aliquotair" || h === "customtaxrate" || h === "taxrate" || h === "imposto" || h === "aliquotadeir"),
      investingSince: header.findIndex((h) => h === "datainicio" || h === "investingsince" || h === "dataprimeiroaporte" || h === "since" || h === "iniciodoinvestimento"),
    };
    if (idx.ticker < 0) return [];
    const rows: ParsedCsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const ticker = (cols[idx.ticker] || "").toUpperCase().trim();
      if (!ticker) continue;
      const rawType = idx.type >= 0 ? (cols[idx.type] || "") : "";
      const type = parseAssetType(rawType);
      const qtyRaw = idx.qty >= 0 ? parseCurrencyValue(cols[idx.qty]) : NaN;
      const avgRaw = idx.avg >= 0 && cols[idx.avg] !== "" ? parseCurrencyValue(cols[idx.avg]) : NaN;
      const targetYieldRaw = idx.targetYield >= 0 && cols[idx.targetYield] !== "" ? parseCurrencyValue(cols[idx.targetYield]) : NaN;
      const ceilingRaw = idx.ceiling >= 0 && cols[idx.ceiling] !== "" ? parseCurrencyValue(cols[idx.ceiling]) : NaN;
      const marginRaw = idx.margin >= 0 && cols[idx.margin] !== "" ? parseCurrencyValue(cols[idx.margin]) : NaN;
      const annualDivRaw = idx.annualDividend >= 0 && cols[idx.annualDividend] !== "" ? parseCurrencyValue(cols[idx.annualDividend]) : NaN;
      const monthlyIncomeRaw = idx.targetMonthlyIncome >= 0 && cols[idx.targetMonthlyIncome] !== "" ? parseCurrencyValue(cols[idx.targetMonthlyIncome]) : NaN;
      const taxRateRaw = idx.customTaxRate >= 0 && cols[idx.customTaxRate] !== "" ? parseCurrencyValue(cols[idx.customTaxRate]) : NaN;
      const investingSinceRaw = idx.investingSince >= 0 && cols[idx.investingSince] !== "" ? parseCsvDate(cols[idx.investingSince]) : null;

      rows.push({
        ticker,
        name: idx.name >= 0 && cols[idx.name] ? cols[idx.name].trim() : null,
        type,
        quantity: Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 0,
        averagePrice: Number.isFinite(avgRaw) && avgRaw > 0 ? avgRaw : null,
        targetYield: Number.isFinite(targetYieldRaw) ? targetYieldRaw : null,
        ceilingPrice: Number.isFinite(ceilingRaw) ? ceilingRaw : null,
        safetyMargin: Number.isFinite(marginRaw) ? marginRaw : null,
        annualDividend: Number.isFinite(annualDivRaw) ? annualDivRaw : null,
        sector: idx.sector >= 0 && cols[idx.sector] ? cols[idx.sector].trim() : null,
        currency: idx.currency >= 0 && cols[idx.currency] ? parseCurrency(cols[idx.currency]) : null,
        targetMonthlyIncome: Number.isFinite(monthlyIncomeRaw) ? monthlyIncomeRaw : null,
        customTaxRate: Number.isFinite(taxRateRaw) ? taxRateRaw : null,
        investingSince: investingSinceRaw,
      });
    }
    return rows;
  } catch (err) {
    console.error("[csv] parse failed", err);
    return [];
  }
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParsedTransactionTemplateRow {
  ticker: string;
  date: number;
  quantity: number;
  pricePerShare: number;
  type: "buy" | "sell" | "corporate_action";
  /** Only set when type === "corporate_action". */
  factor?: number;
}

export function buildTransactionTemplateCsv(): string {
  const header = ["Ticker", "Data da Compra", "Quantidade", "Valor Unitário", "Tipo"];
  const exampleRow = ["VALE3", "2024-03-15", "100", "62.50", "Compra"];
  return [header.join(","), exampleRow.join(",")].join("\n");
}

/**
 * Decodes raw CSV bytes to text, detecting UTF-8 vs. Windows-1252/Latin-1.
 * Brazilian brokerage exports are frequently Windows-1252, which corrupts
 * accented characters (ç, á, ã, ...) into U+FFFD replacement chars when
 * naively decoded as UTF-8 (e.g. via `File.text()`).
 */
export function decodeCsvBytes(buffer: ArrayBuffer): string {
  // Strip BOM if present, which is a strong UTF-8 signal.
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer);
  }
  try {
    // Fatal UTF-8 decode: throws on any invalid byte sequence, which
    // Windows-1252 accented bytes (0x80-0xFF outside valid UTF-8 continuation
    // patterns) reliably trigger.
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** Removes diacritics for loose, accent-insensitive comparisons. */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeHeaderCell(s: string): string {
  return stripAccents(s.toLowerCase()).replace(/[^a-z0-9]/g, "");
}

/**
 * Parses a numeric string that may carry a currency prefix (R$, US$, $) and
 * either a Brazilian (1.234,56) or US (1,234.56) thousand/decimal convention.
 * Returns NaN if the value cannot be parsed.
 */
export function parseCurrencyValue(raw: string): number {
  if (raw == null) return NaN;
  let s = String(raw)
    .trim()
    // Strip currency prefixes: R$, US$, $, with/without space (incl. NBSP).
    .replace(/^(r\$|us\$|\$)\s*/i, "")
    .replace(/[ \s]/g, "");
  if (!s) return NaN;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal separator.
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Brazilian: '.' thousands, ',' decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // US: ',' thousands, '.' decimal
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only comma present: treat as decimal separator (BR convention).
    s = s.replace(/\./g, "").replace(",", ".");
  }
  // Only dot, or neither: already valid JS numeric format.

  const num = Number(s);
  return num;
}

function parseCsvDate(str: string): number {
  if (!str) return Date.now();
  const s = str.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    const parts = s.split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  // DD-MM-AA (2-digit year), e.g. "17-06-26" -> 2026-06-17.
  if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(s)) {
    const parts = s.split("-");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = 2000 + parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  // DD-MM-AAAA (4-digit year, dash separator).
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
    const parts = s.split("-");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.getTime();
  const num = Number(s);
  if (Number.isFinite(num) && num > 0) return num;
  return Date.now();
}

const CORPORATE_ACTION_KEYWORDS = [
  "desdobramento",
  "grupamento",
  "split",
  "bonificacao", // accent-stripped form of "bonificação"
  "inplit",
];

/** Parses "De 1 para 2" / "De 1 para 10" style corporate action ratios. */
function parseCorporateActionFactor(raw: string): number | null {
  const s = stripAccents(raw.toLowerCase()).trim();
  const m = s.match(/de\s+([\d.,]+)\s+para\s+([\d.,]+)/);
  if (!m) return null;
  const from = parseCurrencyValue(m[1]);
  const to = parseCurrencyValue(m[2]);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to <= 0) return null;
  return to / from;
}

/**
 * Detects whether a CSV's header matches the Phase 3 advanced transaction
 * template (date + price columns recognizable) or falls back to the Phase 1
 * simple watchlist format. Reuses the exact same tolerant column-matching
 * criteria as `parseTransactionTemplateCsv` (single source of truth) so this
 * detector never drifts out of sync with what the parser actually accepts.
 */
export function detectCsvFormat(text: string): "advanced" | "simple" {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return "simple";
  const header = parseCsvLine(lines[0]).map(normalizeHeaderCell);
  const hasDate = header.some((h) => h.includes("data") || h.includes("date") || h === "fecha");
  const hasPrice = header.some(
    (h) =>
      h.includes("valorunitario") ||
      h.includes("precounitario") ||
      h === "preco" ||
      h === "price" ||
      h === "unitprice" ||
      h.includes("precocota") ||
      h === "valor" ||
      h === "precio",
  );
  return hasDate && hasPrice ? "advanced" : "simple";
}

export function parseTransactionTemplateCsv(text: string): ParsedTransactionTemplateRow[] {
  try {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = parseCsvLine(lines[0]).map(normalizeHeaderCell);
    const idx = {
      ticker: header.findIndex((h) => h === "ticker" || h === "symbol" || h === "ativo"),
      date: header.findIndex((h) => h.includes("data") || h.includes("date") || h === "fecha"),
      qty: header.findIndex(
        (h) =>
          h.includes("quantidade") ||
          h === "qty" ||
          h.includes("quantity") ||
          h === "shares" ||
          h.includes("cantidad") ||
          h === "cant",
      ),
      price: header.findIndex(
        (h) =>
          h.includes("valorunitario") ||
          h.includes("precounitario") ||
          h === "preco" ||
          h === "price" ||
          h === "unitprice" ||
          h.includes("precocota") ||
          h === "valor" ||
          h === "precio",
      ),
      type: header.findIndex(
        (h) => h.includes("tipo") || h === "type" || h.includes("operacao") || h.includes("ordem"),
      ),
    };
    if (idx.ticker < 0) return [];

    const rows: ParsedTransactionTemplateRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const ticker = (cols[idx.ticker] || "").toUpperCase().trim();
      if (!ticker) continue;

      const rawDate = idx.date >= 0 ? cols[idx.date] : "";
      const date = parseCsvDate(rawDate);

      const rawTypeCell = idx.type >= 0 ? (cols[idx.type] || "") : "";
      const normalizedType = stripAccents(rawTypeCell.toLowerCase()).trim();
      const isCorporateAction = CORPORATE_ACTION_KEYWORDS.some((kw) => normalizedType.includes(kw));

      if (isCorporateAction) {
        const rawQtyCell = idx.qty >= 0 ? cols[idx.qty] || "" : "";
        const factor = parseCorporateActionFactor(rawQtyCell);
        if (factor == null) {
          // Doesn't match "De X para Y" — skip the row rather than
          // misparsing it as a broken buy/sell.
          console.warn("[csv] skipping unrecognized corporate action row", lines[i]);
          continue;
        }
        rows.push({
          ticker,
          date,
          quantity: 0,
          pricePerShare: 0,
          type: "corporate_action",
          factor,
        });
        continue;
      }

      const qty = idx.qty >= 0 ? parseCurrencyValue(cols[idx.qty]) : NaN;
      const price = idx.price >= 0 && cols[idx.price] !== "" ? parseCurrencyValue(cols[idx.price]) : NaN;

      let type: "buy" | "sell" = "buy";
      if (normalizedType === "venda" || normalizedType === "sell" || normalizedType === "venta") {
        type = "sell";
      } else if (normalizedType === "compra" || normalizedType === "buy") {
        type = "buy";
      }

      rows.push({
        ticker,
        date,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 0,
        pricePerShare: Number.isFinite(price) && price > 0 ? price : 0,
        type,
      });
    }
    return rows;
  } catch (err) {
    console.error("[csv] parseTransactionTemplateCsv failed", err);
    return [];
  }
}
