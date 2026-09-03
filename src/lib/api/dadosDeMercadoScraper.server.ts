import { UA, fetchWithRetry, createTtlMemoryCache } from "./http.server";
import { getAdminFirestore } from "../../integrations/firebase/admin";
import type { DividendEvent } from "../domain";
import { reportIngestionStatus } from "./ingestionLog.server";
import { DADOS_DE_MERCADO_CACHE_TTL_MS } from "./cacheConfig.server";

const CACHE_TTL_MS = DADOS_DE_MERCADO_CACHE_TTL_MS;
const MAX_MEMORY_CACHE_ENTRIES = 5000;

export interface DadosDeMercadoFundamentals {
  pvp?: number;
  pl?: number;
  roe?: number;
  dy?: number;
}

export interface DadosDeMercadoResult {
  dividendEvents: DividendEvent[];
  fundamentals: DadosDeMercadoFundamentals;
  cachedAt?: number;
}

type CachedDadosDeMercadoResult = DadosDeMercadoResult & { cachedAt: number };

// Memory cache
const memoryCache = createTtlMemoryCache<CachedDadosDeMercadoResult>(CACHE_TTL_MS, MAX_MEMORY_CACHE_ENTRIES);

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function fetchDadosDeMercado(ticker: string): Promise<DadosDeMercadoResult | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  if (!cleanTicker) return null;

  // 1. Try memory
  const mem = memoryCache.get(cleanTicker);
  if (mem) {
    return mem;
  }

  // 2. Try Firestore
  const adminDb = getAdminFirestore();
  if (adminDb) {
    try {
      const doc = await adminDb.collection("dadosDeMercadoCache").doc(cleanTicker).get();
      if (doc.exists) {
        const data = doc.data() as DadosDeMercadoResult;
        if (data.cachedAt && Date.now() - data.cachedAt < CACHE_TTL_MS) {
          memoryCache.set(cleanTicker, data as CachedDadosDeMercadoResult);
          return data;
        }
      }
    } catch (err) {
      console.error(`[DadosDeMercado] DB read error for ${cleanTicker}`, err);
    }
  }

  // 3. Fetch from origin
  const baseUrl = `https://www.dadosdemercado.com.br/acoes/${cleanTicker.toLowerCase()}`;
  let htmlMain = "";
  let htmlDiv = "";

  try {
    const [resMain, resDiv] = await Promise.all([
      fetchWithRetry(baseUrl, "dadosdemercado", { headers: { "User-Agent": UA } }, { timeoutMs: 3000, retries: 1 }),
      fetchWithRetry(`${baseUrl}/dividendos`, "dadosdemercado", { headers: { "User-Agent": UA } }, { timeoutMs: 3000, retries: 1 })
    ]);

    if (resMain.ok) htmlMain = await resMain.text();
    if (resDiv.ok) htmlDiv = await resDiv.text();
  } catch (err) {
    console.error(`[DadosDeMercado] HTTP error for ${cleanTicker}`, err);
    if (adminDb) {
      await reportIngestionStatus("dadosdemercado", "FAILED", `Fetch failed: ${(err as Error).message}`, cleanTicker);
    }
    return null;
  }

  if (!htmlMain || !htmlDiv) {
    if (adminDb) {
      await reportIngestionStatus("dadosdemercado", "FAILED", `Missing HTML for main or dividends`, cleanTicker);
    }
    return null;
  }

  // EXPLICIT LGPD PROTECTION
  // Strip the entire admins block before parsing anything
  htmlMain = htmlMain.replace(/<div[^>]*id="admins"[^>]*>[\s\S]*?<\/div>\s*<\/div>/is, "");

  const result: DadosDeMercadoResult = {
    dividendEvents: [],
    fundamentals: {}
  };

  // Parse Fundamentals
  const marketRatioMatch = htmlMain.match(/<div[^>]*id="marketratios"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (marketRatioMatch) {
    const tableHtml = marketRatioMatch[1];
    
    // We only need P/VP, P/L, ROE, DY for display
    const extractMetric = (label: string): number | undefined => {
      // Look for the row containing the label, grab the first numeric value
      const rowRegex = new RegExp(`<tr>\\s*<td>\\s*${escapeRegExp(label)}\\s*</td>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>`, 'i');
      const rowMatch = tableHtml.match(rowRegex);
      if (rowMatch) {
        const text = rowMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text === "-" || !text) return undefined;
        // Parse "1,23" or "1.234,56" or "10,50%" -> float
        const clean = text.replace('%', '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? undefined : num;
      }
      return undefined;
    };

    result.fundamentals.pvp = extractMetric("P/VP");
    result.fundamentals.pl = extractMetric("P/L");
    result.fundamentals.roe = extractMetric("ROE");
    result.fundamentals.dy = extractMetric("Dividend Yield");
  }

  // Parse Dividends
  // According to rule: Select table preceded by "Histórico de dividendos de"
  // Anchor on that exact text
  const anchorRegex = new RegExp(`Histórico de dividendos de ${escapeRegExp(cleanTicker)}[\\s\\S]*?(<table class="normal-table">[\\s\\S]*?</table>)`, 'i');
  const divMatch = htmlDiv.match(anchorRegex);
  
  if (divMatch) {
    const tableHtml = divMatch[1];
    // Find tbody
    const tbodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    if (tbodyMatch) {
      const rows = tbodyMatch[1].match(/<tr>([\s\S]*?)<\/tr>/gi);
      if (rows) {
        for (const row of rows) {
          const cols = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
          if (cols && cols.length >= 5) {
            // cols[0]: Tipo, cols[1]: Valor, cols[2]: Registro, cols[3]: Ex, cols[4]: Pagamento
            const type = cols[0].replace(/<[^>]+>/g, '').trim();
            const valStr = cols[1].replace(/<[^>]+>/g, '').trim().replace(/\./g, '').replace(',', '.');
            const amount = parseFloat(valStr);
            
            // Expected format DD/MM/YYYY
            const parseDate = (dStr: string) => {
              const clean = dStr.replace(/<[^>]+>/g, '').trim();
              if (clean === "-" || !clean) return null;
              const parts = clean.split('/');
              if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`; // UTC format for our domain
              }
              return null;
            };

            const exDate = parseDate(cols[3]);
            const paymentDate = parseDate(cols[4]);

            if (amount > 0 && exDate) {
              result.dividendEvents.push({
                exDate,
                paymentDate,
                amountPerShare: amount,
                isJCP: type.toLowerCase().includes('jcp'),
                paymentDateEstimated: false
              });
            }
          }
        }
      }
    }
  }

  result.cachedAt = Date.now();
  memoryCache.set(cleanTicker, result as CachedDadosDeMercadoResult);

  if (adminDb) {
    try {
      await adminDb.collection("dadosDeMercadoCache").doc(cleanTicker).set(result, { merge: true });
      await reportIngestionStatus("dadosdemercado", "PASSED", "Scraped successfully", cleanTicker);
    } catch (err) {
      console.error(`[DadosDeMercado] DB write error for ${cleanTicker}`, err);
    }
  }

  return result;
}
