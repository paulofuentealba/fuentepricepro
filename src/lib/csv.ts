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
