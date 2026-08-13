import type { AssetType } from "./domain";
import type { WatchlistItem } from "./watchlist";

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
  quantity: number;
  averagePrice: number | null;
}

function csvEscape(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildWatchlistCsv(items: WatchlistItem[]): string {
  const header = ["Ticker", "Type", "Quantity", "AveragePrice"];
  const rows = items.map((it) =>
    [it.ticker, it.type, it.quantity, it.averagePrice ?? ""].map(csvEscape).join(","),
  );
  return [header.join(","), ...rows].join("\n");
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

/**
 * Robust CSV parser for watchlist imports. Never throws — malformed
 * input returns an empty array so callers can show a friendly toast.
 */
export function parseWatchlistCsv(text: string): ParsedCsvRow[] {
  try {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idx = {
      ticker: header.findIndex((h) => h === "ticker" || h === "symbol"),
      type: header.findIndex((h) => h === "type" || h === "assettype"),
      qty: header.findIndex((h) => h === "quantity" || h === "qty" || h === "shares"),
      avg: header.findIndex(
        (h) => h === "averageprice" || h === "avgprice" || h === "avg" || h === "cost",
      ),
    };
    if (idx.ticker < 0) return [];
    const rows: ParsedCsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const ticker = (cols[idx.ticker] || "").toUpperCase().trim();
      if (!ticker) continue;
      const rawType = idx.type >= 0 ? (cols[idx.type] || "").toUpperCase().trim() : "";
      const type = (VALID_TYPES as string[]).includes(rawType) ? (rawType as AssetType) : null;
      const qty = idx.qty >= 0 ? Number(cols[idx.qty]) : NaN;
      const avg = idx.avg >= 0 && cols[idx.avg] !== "" ? Number(cols[idx.avg]) : null;
      rows.push({
        ticker,
        type,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 0,
        averagePrice: avg != null && Number.isFinite(avg) ? avg : null,
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
  return stripAccents(s.toLowerCase()).replace(/\s+/g, "");
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
