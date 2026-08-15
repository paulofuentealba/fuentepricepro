export type Tone = "success" | "danger";

export type StatusKey = "undervalued" | "fairlyPriced";

export interface MockCard {
  kind?: "asset";
  ticker: string;
  name: string;
  flag: string;
  type: string;
  currency: "USD" | "BRL";
  currentPrice: string;
  priceChange: string;
  priceTone: Tone;
  ceiling: string;
  margin: string;
  marginTone: Tone;
  statusKey: StatusKey;
}

export interface ProCard {
  kind: "pro";
  variant: "allocation" | "forecast";
}

export type Card = MockCard | ProCard;

/** Strip the .SA / .S.A. / " S.A." suffixes so tickers display cleanly. */
export function cleanTicker(t: string): string {
  return t.replace(/\.S\.A\.$/i, "").replace(/\s+S\.?A\.?$/i, "");
}

export const CARDS: Card[] = [
  {
    ticker: "O",
    name: "Realty Income",
    flag: "🇺🇸",
    type: "US REIT",
    currency: "USD",
    currentPrice: "$54.10",
    priceChange: "+1.24%",
    priceTone: "success",
    ceiling: "$64.20",
    margin: "+18.7%",
    marginTone: "success",
    statusKey: "undervalued",
  },
  {
    ticker: "BBSE3",
    name: "BB Seguridade",
    flag: "🇧🇷",
    type: "BR Ação",
    currency: "BRL",
    currentPrice: "R$ 38.20",
    priceChange: "+0.86%",
    priceTone: "success",
    ceiling: "R$ 46.90",
    margin: "+22.8%",
    marginTone: "success",
    statusKey: "undervalued",
  },
  { kind: "pro", variant: "allocation" },
  {
    ticker: "SPYI",
    name: "NEOS S&P 500 High Income ETF",
    flag: "🇺🇸",
    type: "US ETF",
    currency: "USD",
    currentPrice: "$51.80",
    priceChange: "-0.42%",
    priceTone: "danger",
    ceiling: "$49.10",
    margin: "-5.2%",
    marginTone: "danger",
    statusKey: "fairlyPriced",
  },
  {
    ticker: "MXRF11",
    name: "Maxi Renda FII",
    flag: "🇧🇷",
    type: "BR FII",
    currency: "BRL",
    currentPrice: "R$ 10.24",
    priceChange: "+0.39%",
    priceTone: "success",
    ceiling: "R$ 11.80",
    margin: "+15.2%",
    marginTone: "success",
    statusKey: "undervalued",
  },
  { kind: "pro", variant: "forecast" },
  {
    ticker: "VALE S.A.",
    name: "Vale S.A.",
    flag: "🇧🇷",
    type: "BR Ação",
    currency: "BRL",
    currentPrice: "R$ 63.00",
    priceChange: "+2.10%",
    priceTone: "success",
    ceiling: "R$ 78.40",
    margin: "+24.4%",
    marginTone: "success",
    statusKey: "undervalued",
  },
  {
    ticker: "HGLG11.SA",
    name: "CSHG Logística FII",
    flag: "🇧🇷",
    type: "BR FII",
    currency: "BRL",
    currentPrice: "R$ 158.30",
    priceChange: "-0.18%",
    priceTone: "danger",
    ceiling: "R$ 172.10",
    margin: "+8.7%",
    marginTone: "success",
    statusKey: "undervalued",
  },
];
