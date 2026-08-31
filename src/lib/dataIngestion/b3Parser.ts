export interface TradeRecord {
  ticker: string;
  quantity: number;
  price: number;
  date: string;
  type?: "buy" | "sell";
  fees?: number;
}

export interface UnresolvedTradeRecord {
  id: string;
  rawLine: string;
  rawSpecification: string;
  normalizedKey: string;
  quantity: number;
  price: number;
  date: string;
  type: "buy" | "sell";
}

export type BrokerType =
  | "XP"
  | "CLEAR"
  | "RICO"
  | "MODAL"
  | "BTG"
  | "INTER"
  | "NUINVEST"
  | "ORAMA"
  | "GENIAL"
  | "ITAU"
  | "BRADESCO"
  | "SANTANDER"
  | "BB"
  | "CAIXA";

export interface ParseResult {
  success: boolean;
  trades?: TradeRecord[];
  unresolvedTrades?: UnresolvedTradeRecord[];
  error?: string;
  broker?: BrokerType;
  brokerDivergence?: {
    selected: BrokerType;
    detected: BrokerType;
  };
}

export const ALL_SINACOR_BROKERS: BrokerType[] = [
  "XP",
  "CLEAR",
  "RICO",
  "MODAL",
  "BTG",
  "INTER",
  "NUINVEST",
  "ORAMA",
  "GENIAL",
  "ITAU",
  "BRADESCO",
  "SANTANDER",
  "BB",
  "CAIXA",
];

export const B3_SHORT_NAME_MAP: Record<string, string> = {
  OI: "OIBR",
  PETROBRAS: "PETR",
  VALE: "VALE",
  "VALE R DOCE": "VALE",
  ITAUUNIBANCO: "ITUB",
  ITAU: "ITUB",
  "ITAU UNIBANCO": "ITUB",
  BRADESCO: "BBDC",
  "MAGAZ LUIZA": "MGLU",
  MAGAZINE: "MGLU",
  MGLU: "MGLU",
  WEG: "WEGE",
  KLABIN: "KLBN",
  "KLABIN S/A": "KLBN",
  AMBEV: "ABEV",
  "AMBEV S/A": "ABEV",
  USIMINAS: "USIM",
  GERDAU: "GERD",
  ELETROBRAS: "ELET",
  SANTANDER: "SANB",
  "BANCO DO BRASIL": "BBAS",
  BRASIL: "BBAS",
  TAESA: "TAEE",
  SANPAR: "SAPR",
  SANEPAR: "SAPR",
  COPEL: "CPLE",
  SUZANO: "SUZB",
  JBS: "JBSS",
  COSAN: "CSAN",
  B3: "B3SA",
  LOCALIZA: "RENT",
  EQUATORIAL: "EQTL",
  RAIADROGASIL: "RADL",
  HAPVIDA: "HAPV",
  PRIO: "PRIO",
};

const GOVERNANCE_TAGS = new Set(["N1", "N2", "NM", "EJ", "ED", "EX", "ER", "MB", "DRN"]);

const CLASS_SUFFIX_MAP: Record<string, string> = {
  ON: "3",
  PN: "4",
  PNA: "5",
  PNB: "6",
  PNC: "7",
  PND: "8",
  UNT: "11",
  UNIT: "11",
};

/**
 * Normalizes a raw issuer specification by removing governance/segment tags
 * (e.g. "OI ON N1" -> "OI ON") while keeping issuer name and stock class.
 */
export function normalizeIssuerSpecification(rawSpec: string): string {
  if (!rawSpec) return "";
  const tokens = rawSpec.trim().toUpperCase().split(/\s+/);
  const filtered = tokens.filter((t) => !GOVERNANCE_TAGS.has(t));
  return filtered.join(" ");
}

/**
 * Parses a Brazilian formatted float string (e.g., "1.500,00" or "45,00") into a valid number.
 */
export function parseB3Float(value: string): number {
  if (!value) throw new Error("Invalid value");
  const clean = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  if (isNaN(num)) throw new Error("Not a number");
  return num;
}

export interface PdfTextItem {
  str: string;
  transform?: number[];
}

/**
 * Reconstructs visual line breaks from a pdfjs-dist TextContent items array. pdfjs returns
 * items in reading order with no inherent newlines; grouping by each item's baseline Y
 * coordinate (transform[5]) recovers table rows so the line-based SINACOR parser below sees
 * one broker-note trade per line instead of an entire multi-row table flattened into one line
 * (which made it only ever capture the first ticker's first two numbers).
 */
export function reconstructRowsFromTextItems(items: PdfTextItem[]): string {
  const rows: { y: number; parts: { x: number; str: string }[] }[] = [];
  const Y_TOLERANCE = 2;

  for (const item of items) {
    if (!item.str) continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    let row = rows.find((r) => Math.abs(r.y - y) <= Y_TOLERANCE);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, str: item.str });
  }

  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((r) =>
      r.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(" "),
    )
    .join("\n");
}

export function detectBroker(rawText: string): BrokerType | null {
  // Grupo XP
  if (rawText.includes("02.332.886/0001-04") || rawText.includes("XP INVESTIMENTOS")) return "XP";
  if (rawText.includes("02.332.886/0011-78") || rawText.includes("CLEAR CORRETORA")) return "CLEAR";
  if (rawText.includes("02.332.886/0016-82") || rawText.includes("RICO INVESTIMENTOS"))
    return "RICO";
  if (rawText.includes("05.389.174/0001-01") || rawText.includes("MODAL")) return "MODAL";

  // Corretoras Digitais SINACOR
  if (rawText.includes("43.815.158/0001-22") || rawText.includes("BTG PACTUAL")) return "BTG";
  if (rawText.includes("18.945.670/0001-46") || rawText.includes("INTER DTVM")) return "INTER";
  if (rawText.includes("62.169.875/0001-79") || rawText.includes("NU INVEST")) return "NUINVEST";
  if (rawText.includes("13.293.225/0001-25") || rawText.includes("ORAMA")) return "ORAMA";
  if (rawText.includes("27.652.684/0001-62") || rawText.includes("GENIAL")) return "GENIAL";

  // Bancos Tradicionais
  if (rawText.includes("61.194.353/0001-64") || rawText.includes("ITAU CORRETORA")) return "ITAU";
  if (
    rawText.includes("74.014.747/0001-35") ||
    rawText.includes("AGORA") ||
    rawText.includes("61.855.048/0001-07") ||
    rawText.includes("BRADESCO CORRETORA")
  )
    return "BRADESCO";
  if (
    rawText.includes("51.014.223/0001-49") ||
    rawText.includes("SANTANDER CORRETORA") ||
    rawText.includes("29.162.769/0001-98") ||
    rawText.includes("TORO")
  )
    return "SANTANDER";
  if (
    rawText.includes("24.933.830/0001-30") ||
    rawText.includes("00.000.000/0001-91") ||
    rawText.includes("BB BANCO DE INVESTIMENTO") ||
    rawText.includes("BANCO DO BRASIL")
  )
    return "BB";
  if (
    rawText.includes("00.360.305/0001-04") ||
    rawText.includes("42.040.639/0001-40") ||
    rawText.includes("CAIXA ECONOMICA") ||
    rawText.includes("CAIXA DTVM")
  )
    return "CAIXA";

  return null;
}

/**
 * Extracts trades using the standard B3 SINACOR layout guidelines.
 */
export function parseSinacorLayout(
  rawText: string,
  userMappings: Record<string, string> = {}
): { trades: TradeRecord[]; unresolvedTrades: UnresolvedTradeRecord[] } {
  const trades: TradeRecord[] = [];
  const unresolvedTrades: UnresolvedTradeRecord[] = [];
  const lines = rawText.split("\n");

  const dateMatch = rawText.match(/(\d{2}\/\d{2}\/\d{4})/);
  const documentDate = dateMatch ? dateMatch[1] : "Unknown";

  let unresolvedIndex = 0;

  for (const line of lines) {
    if (line.includes("1-BOVESPA") || line.includes("VISTA") || line.includes("FRACIONARIO")) {
      let type: "buy" | "sell" = "buy";
      if (/\bV\b/.test(line) && !/\bC\b/.test(line.split("VISTA")[0] || line)) {
        type = "sell";
      }

      // Step 1: Standard Ticker Match (4 letters + 1-2 digits + optional F)
      const tickerMatch = line.match(/\b([A-Z]{4}\d{1,2}[F]?)\b/);
      if (tickerMatch) {
        const rawTicker = tickerMatch[1];
        const afterTicker = line.substring(tickerMatch.index! + rawTicker.length);
        const numbers = afterTicker.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{2,4})?)\b/g);

        if (numbers && numbers.length >= 2) {
          const ticker =
            rawTicker.endsWith("F") && rawTicker.length > 5 ? rawTicker.slice(0, -1) : rawTicker;
          const quantity = parseB3Float(numbers[0]);
          const price = parseB3Float(numbers[1]);

          trades.push({
            ticker,
            quantity,
            price,
            date: documentDate,
            type,
          });
          continue;
        }
      }

      // Fallback: If standard ticker is not present, extract specification text and numbers
      const marketAnchorMatch =
        line.match(/(?:VISTA|FRACIONARIO)\s+(.+)/) || line.match(/BOVESPA\s+[CV]\s+(.+)/);

      if (marketAnchorMatch) {
        const afterMarket = marketAnchorMatch[1];
        const numbersAfterMarket = afterMarket.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{2,4})?)\b/g);
        if (numbersAfterMarket && numbersAfterMarket.length >= 2) {
          const quantityStr = numbersAfterMarket[0];
          const priceStr = numbersAfterMarket[1];
          const quantity = parseB3Float(quantityStr);
          const price = parseB3Float(priceStr);

          const qtyIdx = afterMarket.indexOf(quantityStr);
          const rawSpecification = qtyIdx >= 0 ? afterMarket.substring(0, qtyIdx).trim() : afterMarket.trim();

          const normalizedKey = normalizeIssuerSpecification(rawSpecification);

          let resolvedTicker: string | null = null;

          // Step 2: Check B3_SHORT_NAME_MAP
          const tokens = normalizedKey.split(/\s+/);
          let classSuffix = "3";
          const issuerTokens: string[] = [];

          for (const token of tokens) {
            if (CLASS_SUFFIX_MAP[token]) {
              classSuffix = CLASS_SUFFIX_MAP[token];
            } else {
              issuerTokens.push(token);
            }
          }
          const shortNameCandidate = issuerTokens.join(" ");

          if (B3_SHORT_NAME_MAP[shortNameCandidate]) {
            resolvedTicker = B3_SHORT_NAME_MAP[shortNameCandidate] + classSuffix;
          } else if (issuerTokens.length === 1 && B3_SHORT_NAME_MAP[issuerTokens[0]]) {
            resolvedTicker = B3_SHORT_NAME_MAP[issuerTokens[0]] + classSuffix;
          }

          // Step 3: Check userMappings
          if (!resolvedTicker && userMappings[normalizedKey]) {
            resolvedTicker = userMappings[normalizedKey].trim().toUpperCase();
          }

          if (resolvedTicker) {
            trades.push({
              ticker: resolvedTicker,
              quantity,
              price,
              date: documentDate,
              type,
            });
          } else {
            // Step 4: Unresolved trade
            unresolvedTrades.push({
              id: `unresolved-${unresolvedIndex++}`,
              rawLine: line,
              rawSpecification,
              normalizedKey,
              quantity,
              price,
              date: documentDate,
              type,
            });
          }
        }
      }
    }
  }

  const totalVolume = trades.reduce((acc, t) => acc + t.quantity * t.price, 0);
  const totalFees = extractSinacorTotalFees(rawText, totalVolume);

  if (totalFees != null && totalFees > 0 && totalVolume > 0) {
    for (const trade of trades) {
      const tradeVolume = trade.quantity * trade.price;
      trade.fees = Number(((tradeVolume / totalVolume) * totalFees).toFixed(2));
    }
  }

  return { trades, unresolvedTrades };
}

/**
 * Attempts to extract total fees from the financial summary ("Resumo Financeiro")
 * of a B3 SINACOR broker note.
 *
 * Implements a strict sanity check: total fees must be positive and <= 2% of the total
 * trading volume. If no fees are found, or if the extracted fees exceed 2% of total volume,
 * returns null to prevent erroneous fee attribution (safe fallback).
 */
export function extractSinacorTotalFees(rawText: string, totalVolume: number): number | null {
  if (!rawText || totalVolume <= 0) return null;

  let totalFees = 0;
  let foundFee = false;

  const feeRegexes = [
    /Taxa\s+de\s+liquida[cç][aã]o\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /Taxa\s+de\s+Registro\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /Emolumentos\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /Taxa\s+de\s+termo(?:\/op[cç][oõ]es)?\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /Taxa\s+A\.?N\.?A\.?\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /Taxa\s+de\s+Cust[oó]dia\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /(?:Total\s+)?Corretagem(?:\s*\/\s*Despesas)?\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /I\.?S\.?S\.?\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /Outros\s+Custos\s*[:]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
  ];

  for (const regex of feeRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      try {
        const val = parseB3Float(match[1]);
        if (Number.isFinite(val) && val > 0) {
          totalFees += val;
          foundFee = true;
        }
      } catch {
        // ignore malformed float
      }
    }
  }

  if (!foundFee || totalFees <= 0) return null;

  // Sanity check: B3 retail fees are typically < 0.1% - 0.5% of total volume.
  // A 2% ceiling ensures that any erroneously captured trading amount line is rejected.
  const MAX_SANITY_FEE_RATIO = 0.02;
  if (totalFees > totalVolume * MAX_SANITY_FEE_RATIO) {
    return null;
  }

  return Number(totalFees.toFixed(2));
}

/**
 * The main factory entry point. Detects broker and routes to the correct extractor.
 * Supports manual broker hints, user mappings, and divergence reporting.
 */
export function parseB3BrokerNote(
  rawText: string,
  hintBroker?: BrokerType | "AUTO" | null,
  userMappings: Record<string, string> = {}
): ParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty file" };
  }

  try {
    const detected = detectBroker(rawText);
    const selected = hintBroker && hintBroker !== "AUTO" ? hintBroker : null;

    let broker: BrokerType | null = detected || selected;
    let brokerDivergence: { selected: BrokerType; detected: BrokerType } | undefined;

    if (selected && detected && selected !== detected) {
      brokerDivergence = { selected, detected };
      broker = detected; // Auto-detected header is source of truth for parsing
    }

    if (!broker) {
      return { success: false, error: "unknown_broker" };
    }

    let trades: TradeRecord[] = [];
    let unresolvedTrades: UnresolvedTradeRecord[] = [];

    if (ALL_SINACOR_BROKERS.includes(broker)) {
      const parsed = parseSinacorLayout(rawText, userMappings);
      trades = parsed.trades;
      unresolvedTrades = parsed.unresolvedTrades;
    }

    if (trades.length === 0 && unresolvedTrades.length === 0) {
      console.warn(`[b3Parser] Could not extract trades from detected broker: ${broker}`);
      return {
        success: false,
        error: "broker_layout_unsupported",
        broker,
        brokerDivergence,
      };
    }

    return { success: true, trades, unresolvedTrades, broker, brokerDivergence };
  } catch (error) {
    return { success: false, error: "Malformed file" };
  }
}
