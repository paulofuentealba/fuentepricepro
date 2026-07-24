export interface TradeRecord {
  ticker: string;
  quantity: number;
  price: number;
  date: string;
}

export interface ParseResult {
  success: boolean;
  trades?: TradeRecord[];
  error?: string;
  broker?: string;
}

/**
 * Parses a Brazilian formatted float string (e.g., "1.500,00" or "45,00") into a valid number.
 */
export function parseB3Float(value: string): number {
  if (!value) throw new Error('Invalid value');
  const clean = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num)) throw new Error('Not a number');
  return num;
}

export function detectBroker(rawText: string): "XP" | "CLEAR" | null {
  // CNPJ approach for maximum resiliency
  if (rawText.includes("02.332.886/0001-04") || rawText.includes("XP INVESTIMENTOS")) {
    return "XP";
  }
  if (rawText.includes("02.332.886/0011-78") || rawText.includes("CLEAR CORRETORA")) {
    return "CLEAR";
  }
  
  return null;
}

/**
 * Extracts trades using the standard B3 SINACOR layout guidelines.
 */
export function parseSinacorLayout(rawText: string): TradeRecord[] {
  const trades: TradeRecord[] = [];
  const lines = rawText.split('\n');
  
  // Look for standard B3 note date format: "15/07/2026"
  const dateMatch = rawText.match(/(\d{2}\/\d{2}\/\d{4})/);
  const documentDate = dateMatch ? dateMatch[1] : 'Unknown';

  for (const line of lines) {
    // Look for indicators of a trade line in Bovespa notes
    if (line.includes('1-BOVESPA') || line.includes('VISTA')) {
      const tickerMatch = line.match(/\b([A-Z]{4}\d{1,2}[F]?)\b/);
      if (tickerMatch) {
        const rawTicker = tickerMatch[1];
        
        // Only look for numbers AFTER the ticker to avoid catching "1" from "1-BOVESPA"
        const afterTicker = line.substring(tickerMatch.index! + rawTicker.length);
        const numbers = afterTicker.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{2,4})?)\b/g);

        if (numbers && numbers.length >= 2) {
          // Strip the trailing 'F' from fractional market tickers so they match our standard (e.g. PETR4F -> PETR4)
          const ticker = rawTicker.endsWith('F') && rawTicker.length > 5 
            ? rawTicker.slice(0, -1) 
            : rawTicker;

          const quantity = parseB3Float(numbers[0]);
          const price = parseB3Float(numbers[1]);
          
          trades.push({
            ticker,
            quantity,
            price,
            date: documentDate
          });
        }
      }
    }
  }

  return trades;
}

/**
 * The main factory entry point. Detects broker and routes to the correct extractor.
 */
export function parseB3BrokerNote(rawText: string): ParseResult {
  if (!rawText || rawText.trim() === '') {
    return { success: false, error: 'Empty file' };
  }

  try {
    const broker = detectBroker(rawText);
    
    if (!broker) {
      return { success: false, error: 'unknown_broker' };
    }

    let trades: TradeRecord[] = [];
    
    if (broker === "XP" || broker === "CLEAR") {
      trades = parseSinacorLayout(rawText);
    }

    if (trades.length === 0) {
      return { success: false, error: 'Malformed file', broker };
    }

    return { success: true, trades, broker };
  } catch (error) {
    return { success: false, error: 'Malformed file' };
  }
}
