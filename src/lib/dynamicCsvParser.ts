import { isBrTicker } from "./classify";
import { normalizeTicker } from "./ticker";

export interface ParsedTransaction {
  lineIndex: number;
  ticker: string;
  type: "BUY" | "SELL";
  isFallbackType: boolean;
  quantity: number;
  price: number;
  costs: number;
  date: Date;
  rawDate: string;
  notes?: string;
}

export interface IgnoredRow {
  lineIndex: number;
  rawValues: Record<string, unknown>;
  reason: string;
}

export type ConfidenceLevel = "exact" | "alias" | "substring" | "none";

export interface ColumnMatch {
  sourceHeader: string | null;
  sourceIndex: number;
  confidence: ConfidenceLevel;
}

export interface ColumnMapping {
  ticker: ColumnMatch;
  operationType: ColumnMatch;
  quantity: ColumnMatch;
  price: ColumnMatch;
  costs: ColumnMatch;
  date: ColumnMatch;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  ignored: IgnoredRow[];
  columnMapping: ColumnMapping;
  headers: string[];
  totalRows: number;
}

/**
 * Canonical export headers (first element of each array) and their semantic aliases.
 * The 1st item in each array is by definition the canonical header used for platform exports.
 */
export const COLUMN_SEMANTIC_ALIASES = {
  ticker: [
    "Ticker",
    "Ativo",
    "Papel",
    "Código",
    "Instrumento",
    "Símbolo",
    "Cod Negociação",
    "Especificação do Ativo",
    "Descrição",
    "Asset",
    "Symbol",
  ],
  operationType: [
    "Tipo",
    "Operação",
    "C/V",
    "Natureza",
    "Tipo Operação",
    "Movimentação",
    "Compra/Venda",
    "Sentido",
    "Side",
    "Type",
    "Operation",
  ],
  quantity: [
    "Quantidade",
    "Qtd",
    "Qtde",
    "Volume",
    "Posição",
    "Shares",
    "Quantity",
    "Qty",
  ],
  price: [
    "Preço",
    "Valor",
    "PU",
    "Preço Unitário",
    "Valor Unitário",
    "Cotação",
    "Preço Médio",
    "Price",
    "UnitPrice",
    "AvgPrice",
  ],
  costs: [
    "Taxas",
    "Custos",
    "Corretagem",
    "Emolumentos",
    "ISS",
    "Total Taxas",
    "Taxas B3",
    "Taxas Liquidadas",
    "Costs",
    "Fees",
    "Commission",
  ],
  date: [
    "Data",
    "Data Pregão",
    "Data Operação",
    "Data Negociação",
    "Data Liquidação",
    "Negociação",
    "Trade Date",
    "Date",
  ],
} as const;

export type MappableColumn = keyof typeof COLUMN_SEMANTIC_ALIASES;

/**
 * Normalizes header string: removes accents, whitespace, punctuation, lowercases, and parenthetical notes.
 */
export function normalizeHeader(header: string): string {
  if (!header || typeof header !== "string") return "";
  return header
    .replace(/\(.*?\)/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Matches extracted spreadsheet headers to semantic target columns.
 * 3-Tier confidence:
 * 1. Exact match with canonical header (Tier 1) -> confidence: "exact"
 * 2. Exact match with any known alias (Tier 2) -> confidence: "alias"
 * 3. Substring match (Tier 3) -> confidence: "substring"
 */
export function matchColumn(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    ticker: { sourceHeader: null, sourceIndex: -1, confidence: "none" },
    operationType: { sourceHeader: null, sourceIndex: -1, confidence: "none" },
    quantity: { sourceHeader: null, sourceIndex: -1, confidence: "none" },
    price: { sourceHeader: null, sourceIndex: -1, confidence: "none" },
    costs: { sourceHeader: null, sourceIndex: -1, confidence: "none" },
    date: { sourceHeader: null, sourceIndex: -1, confidence: "none" },
  };

  const normalizedHeaders = headers.map(normalizeHeader);
  const usedIndices = new Set<number>();

  const categories = Object.keys(COLUMN_SEMANTIC_ALIASES) as MappableColumn[];

  // Tier 1: Canonical Exact Match
  for (const cat of categories) {
    const canonical = normalizeHeader(COLUMN_SEMANTIC_ALIASES[cat][0]);
    const idx = normalizedHeaders.findIndex(
      (h, i) => !usedIndices.has(i) && h === canonical,
    );
    if (idx !== -1) {
      mapping[cat] = {
        sourceHeader: headers[idx],
        sourceIndex: idx,
        confidence: "exact",
      };
      usedIndices.add(idx);
    }
  }

  // Tier 2: Alias Exact Match
  for (const cat of categories) {
    if (mapping[cat].confidence !== "none") continue;
    const aliases = COLUMN_SEMANTIC_ALIASES[cat].map(normalizeHeader);
    const idx = normalizedHeaders.findIndex(
      (h, i) => !usedIndices.has(i) && aliases.includes(h),
    );
    if (idx !== -1) {
      mapping[cat] = {
        sourceHeader: headers[idx],
        sourceIndex: idx,
        confidence: "alias",
      };
      usedIndices.add(idx);
    }
  }

  // Tier 3: Substring Match
  for (const cat of categories) {
    if (mapping[cat].confidence !== "none") continue;
    const aliases = COLUMN_SEMANTIC_ALIASES[cat].map(normalizeHeader);
    const idx = normalizedHeaders.findIndex((h, i) => {
      if (usedIndices.has(i) || !h) return false;
      return aliases.some((alias) => alias && (h.includes(alias) || alias.includes(h)));
    });
    if (idx !== -1) {
      mapping[cat] = {
        sourceHeader: headers[idx],
        sourceIndex: idx,
        confidence: "substring",
      };
      usedIndices.add(idx);
    }
  }

  return mapping;
}

/**
 * Parses raw operation type into BUY or SELL with fallback detection.
 */
export function parseOperationType(raw: string | null | undefined): {
  type: "BUY" | "SELL";
  isFallback: boolean;
} {
  if (!raw || typeof raw !== "string") {
    return { type: "BUY", isFallback: true };
  }

  const norm = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const buyKeywords = ["compra", "c", "buy", "b", "aplicacao", "entrada", "subscricao"];
  const sellKeywords = ["venda", "v", "sell", "s", "resgate", "saida", "alienacao"];

  if (buyKeywords.includes(norm) || buyKeywords.some((k) => norm.startsWith(k))) {
    return { type: "BUY", isFallback: false };
  }

  if (sellKeywords.includes(norm) || sellKeywords.some((k) => norm.startsWith(k))) {
    return { type: "SELL", isFallback: false };
  }

  return { type: "BUY", isFallback: true };
}

/**
 * Parses numeric/monetary strings with BR vs International formatting detection.
 */
export function parseNumericValue(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;

  let str = String(raw).trim();
  if (!str) return null;

  // Clean currency symbols and non-breaking spaces
  str = str
    .replace(/[R$US€£]/gi, "")
    .replace(/\s+/g, "")
    .trim();

  // If both . and , exist:
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // BR format: 1.250,50 -> 1250.50
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 1,250.50 -> 1250.50
      str = str.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // Only comma: 25,30 -> 25.30
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parses dates supporting BR (DD/MM/YYYY), US (MM/DD/YYYY), ISO (YYYY-MM-DD) and Excel serial numbers.
 */
export function parseDateValue(
  raw: string | number | null | undefined,
): Date | null {
  if (raw === null || raw === undefined) return null;

  // Handle Excel Serial Number (e.g. 45150)
  if (
    typeof raw === "number" ||
    (!isNaN(Number(raw)) &&
      !String(raw).includes("-") &&
      !String(raw).includes("/") &&
      !String(raw).includes("."))
  ) {
    const serial = Number(raw);
    if (serial > 1000 && serial < 100000) {
      // Excel epoch begins 1899-12-30 due to historical leap year bug
      const utcDate = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(utcDate.getTime())) {
        return new Date(
          utcDate.getUTCFullYear(),
          utcDate.getUTCMonth(),
          utcDate.getUTCDate(),
        );
      }
    }
  }

  const str = String(raw).trim();
  if (!str) return null;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const brMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10) - 1;
    const year = parseInt(y, 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Validates if an asset ticker is supported for investment tracking.
 * Identifies and filters out derivatives/options, futures, and unsupported crypto.
 */
export function isSupportedAsset(ticker: string): {
  isSupported: boolean;
  reason?: string;
} {
  if (!ticker || typeof ticker !== "string") {
    return { isSupported: false, reason: "Ticker vazio ou inválido" };
  }

  const clean = normalizeTicker(ticker);

  // 1. Detect B3 Options: 4 letters + option series letter (A-L call, M-X put) + strike numbers (e.g. PETRL300, VALEA60)
  if (/^[A-Z]{4}[A-X]\d+$/.test(clean)) {
    return { isSupported: false, reason: `Derivativo/Opção não suportado (${clean})` };
  }

  // 2. Detect B3 Futures (WIN, WDO, IND, DOL, CCM, BGI, etc.)
  if (/^(WIN|WDO|IND|DOL|CCM|BGI|ICF|DI1)[A-Z0-9]+$/.test(clean)) {
    return { isSupported: false, reason: `Contrato futuro não suportado (${clean})` };
  }

  // 3. Detect standalone crypto without ETF wrapper (BTC, ETH, SOL, USDT, USDC)
  const standaloneCrypto = new Set(["BTC", "ETH", "SOL", "USDT", "USDC", "XRP", "ADA"]);
  if (standaloneCrypto.has(clean)) {
    return { isSupported: false, reason: `Criptoativo avulso não suportado (${clean})` };
  }

  // 4. Valid B3 tickers (PETR4, HGLG11, AAPL34, BIVB39, SANB11, etc.)
  if (isBrTicker(clean) || /^[A-Z]{4}\d{1,2}[B]?$/.test(clean)) {
    return { isSupported: true };
  }

  // 5. Valid US tickers (AAPL, MSFT, O, BRK.B, etc.)
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(clean)) {
    return { isSupported: true };
  }

  // Permissive fallback: if 2-8 alphanumeric characters, accept as valid asset
  if (/^[A-Z0-9]{2,8}$/.test(clean)) {
    return { isSupported: true };
  }

  return { isSupported: false, reason: `Ticker com padrão desconhecido (${clean})` };
}

/**
 * Pure file parsing orchestrator. Receives raw spreadsheet rows and headers, applies
 * column mapping, parses each row, and partitions into parsed transactions and ignored rows.
 */
export function parseFile(
  rows: unknown[][],
  headers: string[],
  manualMapping?: Partial<Record<MappableColumn, number>>,
): ParseResult {
  const autoMapping = matchColumn(headers);
  const columnMapping: ColumnMapping = { ...autoMapping };

  // Apply manual overrides if provided
  if (manualMapping) {
    for (const [colKey, srcIdx] of Object.entries(manualMapping)) {
      const key = colKey as MappableColumn;
      if (srcIdx !== undefined && srcIdx >= 0 && srcIdx < headers.length) {
        columnMapping[key] = {
          sourceHeader: headers[srcIdx],
          sourceIndex: srcIdx,
          confidence: "exact",
        };
      }
    }
  }

  const transactions: ParsedTransaction[] = [];
  const ignored: IgnoredRow[] = [];

  const tickerIdx = columnMapping.ticker.sourceIndex;
  const typeIdx = columnMapping.operationType.sourceIndex;
  const qtyIdx = columnMapping.quantity.sourceIndex;
  const priceIdx = columnMapping.price.sourceIndex;
  const costsIdx = columnMapping.costs.sourceIndex;
  const dateIdx = columnMapping.date.sourceIndex;

  for (let i = 0; i < rows.length; i++) {
    const lineIndex = i + 2; // +1 for 0-index, +1 for header row
    const row = rows[i];
    if (!row || row.length === 0 || row.every((c) => c === null || c === undefined || c === "")) {
      continue; // Skip empty rows
    }

    const rawValues: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      rawValues[h || `Col_${idx + 1}`] = row[idx];
    });

    // 1. Ticker extraction and validation
    const rawTicker = tickerIdx !== -1 ? String(row[tickerIdx] ?? "").trim() : "";
    if (!rawTicker) {
      ignored.push({ lineIndex, rawValues, reason: "Ticker não informado ou coluna ausente" });
      continue;
    }

    const assetCheck = isSupportedAsset(rawTicker);
    if (!assetCheck.isSupported) {
      ignored.push({
        lineIndex,
        rawValues,
        reason: assetCheck.reason || `Ativo não suportado (${rawTicker})`,
      });
      continue;
    }

    const ticker = normalizeTicker(rawTicker);

    // 2. Quantity extraction and validation
    const rawQty = qtyIdx !== -1 ? row[qtyIdx] : null;
    const quantity = parseNumericValue(rawQty as string | number);
    if (quantity === null || quantity <= 0) {
      ignored.push({ lineIndex, rawValues, reason: `Quantidade inválida (${rawQty})` });
      continue;
    }

    // 3. Price extraction and validation
    const rawPrice = priceIdx !== -1 ? row[priceIdx] : null;
    const price = parseNumericValue(rawPrice as string | number);
    if (price === null || price < 0) {
      ignored.push({ lineIndex, rawValues, reason: `Preço inválido (${rawPrice})` });
      continue;
    }

    // 4. Operation Type
    const rawType = typeIdx !== -1 ? String(row[typeIdx] ?? "") : undefined;
    const { type, isFallback } = parseOperationType(rawType);

    // 5. Costs
    const rawCosts = costsIdx !== -1 ? row[costsIdx] : null;
    const costs = parseNumericValue(rawCosts as string | number) ?? 0;

    // 6. Date
    const rawDateVal = dateIdx !== -1 ? row[dateIdx] : null;
    const date = parseDateValue(rawDateVal as string | number) ?? new Date();

    transactions.push({
      lineIndex,
      ticker,
      type,
      isFallbackType: isFallback,
      quantity,
      price,
      costs,
      date,
      rawDate: rawDateVal !== null && rawDateVal !== undefined ? String(rawDateVal) : "",
    });
  }

  return {
    transactions,
    ignored,
    columnMapping,
    headers,
    totalRows: rows.length,
  };
}
