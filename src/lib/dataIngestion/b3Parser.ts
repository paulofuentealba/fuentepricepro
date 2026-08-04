export interface TradeRecord {
  ticker: string;
  quantity: number;
  price: number;
  date: string;
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

/**
 * B3 Broker Note Parser
 * To see the list of supported brokers and instructions on how to add new ones,
 * please check the Wiki documentation at: /app/docs#supported-brokers
 */

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
    rawText.includes("00.801.279/0001-81") ||
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
export function parseSinacorLayout(rawText: string): TradeRecord[] {
  const trades: TradeRecord[] = [];
  const lines = rawText.split("\n");

  // Look for standard B3 note date format: "15/07/2026"
  const dateMatch = rawText.match(/(\d{2}\/\d{2}\/\d{4})/);
  const documentDate = dateMatch ? dateMatch[1] : "Unknown";

  for (const line of lines) {
    // Look for indicators of a trade line in Bovespa notes
    if (line.includes("1-BOVESPA") || line.includes("VISTA")) {
      const tickerMatch = line.match(/\b([A-Z]{4}\d{1,2}[F]?)\b/);
      if (tickerMatch) {
        const rawTicker = tickerMatch[1];

        // Only look for numbers AFTER the ticker to avoid catching "1" from "1-BOVESPA"
        const afterTicker = line.substring(tickerMatch.index! + rawTicker.length);
        const numbers = afterTicker.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{2,4})?)\b/g);

        if (numbers && numbers.length >= 2) {
          // Strip the trailing 'F' from fractional market tickers so they match our standard (e.g. PETR4F -> PETR4)
          const ticker =
            rawTicker.endsWith("F") && rawTicker.length > 5 ? rawTicker.slice(0, -1) : rawTicker;

          const quantity = parseB3Float(numbers[0]);
          const price = parseB3Float(numbers[1]);

          trades.push({
            ticker,
            quantity,
            price,
            date: documentDate,
          });
        }
      }
    }
  }

  return trades;
}

/**
 * The main factory entry point. Detects broker and routes to the correct extractor.
 * Supports manual broker hints and divergence reporting.
 */
export function parseB3BrokerNote(
  rawText: string,
  hintBroker?: BrokerType | "AUTO" | null
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

    if (ALL_SINACOR_BROKERS.includes(broker)) {
      trades = parseSinacorLayout(rawText);
    }

    if (trades.length === 0) {
      console.warn(`[b3Parser] Could not extract trades from detected broker: ${broker}`);
      return {
        success: false,
        error: "broker_layout_unsupported",
        broker,
        brokerDivergence,
      };
    }

    return { success: true, trades, broker, brokerDivergence };
  } catch (error) {
    return { success: false, error: "Malformed file" };
  }
}
