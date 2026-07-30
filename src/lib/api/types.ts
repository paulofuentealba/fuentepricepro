import type { AssetType, Currency, DividendYearPoint, DividendEvent } from "../domain";

export interface ApiAsset {
  ticker: string;
  name: string;
  type: AssetType;
  currency: Currency;
  currentPrice: number;
  /** Total annual dividends per share for previous 3 full calendar years (oldest first). */
  dividends3y: number[];
  dividendHistory: DividendYearPoint[];
  exDividendDate: string | null;
  epsCurrent: number | null;
  epsNext: number | null;
  paymentMonths: number[];
  sector: string | null;
  /** Raw dividend events (up to 5y), parallel to dividendHistory. Does NOT affect valuation. */
  dividendEvents: DividendEvent[];
  metrics: {
    peRatio: number | null;
    pbRatio: number | null;
    eps: number | null;
    roe: number | null;
    currentDy: number | null;
    capRate: number | null;
    vacancy: number | null;
    expenseRatio: number | null;
    aum: number | null;
    trackingError: number | null;
    payoutRatio: number | null;
    dividendCagr5y: number | null;
  };
}

export interface SearchHit {
  ticker: string;
  name: string;
  type: AssetType;
  sector: string | null;
}

export interface LiveQuote {
  ticker: string;
  price: number;
  changePct: number | null;
}

export interface QuoteSummary {
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  returnOnEquity: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  exDividendDate: number | null;
  payoutRatio: number | null;
  sector: string | null;
}
