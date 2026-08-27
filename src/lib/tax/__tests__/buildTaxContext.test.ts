import { describe, it, expect } from "vitest";
import { buildTaxContext } from "../buildTaxContext";
import { calculateRealizedGains } from "../br/capitalGains";
import type { Transaction } from "@/lib/transactionsLogic";
import type { WatchlistItem } from "@/lib/watchlist";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";
import { getLocalDateISOString } from "@/lib/formatters";

describe("buildTaxContext (Prompt 142 / Item 2.2)", () => {
  it("builds assetTypeByTicker correctly from WatchlistItem[]", () => {
    const watchlistItems = [
      {
        ticker: "PETR4",
        type: "STOCK_BR" as const,
        quantity: 100,
        averagePrice: 30,
        annualDividend: 2.5,
        currency: "BRL" as const,
      },
      {
        ticker: "HGLG11",
        type: "FII" as const,
        quantity: 50,
        averagePrice: 160,
        annualDividend: 13.2,
        currency: "BRL" as const,
      },
      {
        ticker: "AAPL",
        type: "STOCK_US" as const,
        quantity: 10,
        averagePrice: 180,
        annualDividend: 1.0,
        currency: "USD" as const,
      },
    ] as WatchlistItem[];

    const context = buildTaxContext([], watchlistItems);

    expect(context.assetTypeByTicker.get("PETR4")).toBe("STOCK_BR");
    expect(context.assetTypeByTicker.get("HGLG11")).toBe("FII");
    expect(context.assetTypeByTicker.get("AAPL")).toBe("STOCK_US");
  });

  it("produces identical costBasis and gain as calling calculateRealizedGains directly on multiple buys + partial sell", () => {
    const ts1 = new Date(2026, 0, 10).getTime();
    const ts2 = new Date(2026, 1, 15).getTime();
    const ts3 = new Date(2026, 2, 20).getTime();

    // Buy 1: 100 shares @ R$ 20.00 (Total = R$ 2,000)
    // Buy 2: 100 shares @ R$ 30.00 (Total = R$ 3,000) -> Average price = (2000 + 3000)/200 = R$ 25.00
    // Sell: 50 shares @ R$ 35.00, fees = R$ 5.00
    // Expected: proceeds = (50 * 35) - 5 = 1745
    // Expected: costBasis = 50 * 25.00 = 1250
    // Expected: gain = 1745 - 1250 = 495
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        ticker: "PETR4",
        type: "buy",
        quantity: 100,
        pricePerShare: 20,
        date: ts1,
      },
      {
        id: "tx-2",
        ticker: "PETR4",
        type: "buy",
        quantity: 100,
        pricePerShare: 30,
        date: ts2,
      },
      {
        id: "tx-3",
        ticker: "PETR4",
        type: "sell",
        quantity: 50,
        pricePerShare: 35,
        fees: 5,
        date: ts3,
      },
    ];

    const watchlistItems = [
      {
        ticker: "PETR4",
        type: "STOCK_BR" as const,
        quantity: 150,
        averagePrice: 25,
        annualDividend: 2.0,
        currency: "BRL" as const,
      },
    ] as WatchlistItem[];

    // 1. Direct call to SSOT
    const directEvents = calculateRealizedGains(transactions);

    // 2. Call via buildTaxContext
    const context = buildTaxContext(transactions, watchlistItems);

    expect(context.realizedGainEvents).toEqual(directEvents);
    expect(context.realizedGainEvents).toHaveLength(1);

    const event = context.realizedGainEvents[0];
    expect(event.ticker).toBe("PETR4");
    expect(event.quantity).toBe(50);
    expect(event.salePrice).toBe(35);
    expect(event.proceeds).toBe(1745);
    expect(event.costBasis).toBe(1250);
    expect(event.gain).toBe(495);
    expect(event.fees).toBe(5);
  });

  it("populates currentYear and currentMonthKey using local calendar date", () => {
    const context = buildTaxContext([], []);
    const nowLocal = getLocalDateISOString();

    expect(context.currentYear).toBe(parseInt(nowLocal.slice(0, 4), 10));
    expect(context.currentMonthKey).toBe(nowLocal.slice(0, 7));
  });

  it("processes dividend events through Phase 2 tax adapters without double-taxation", () => {
    const currentYear = getLocalDateISOString().slice(0, 4);

    const watchlistItems = [
      {
        ticker: "BBAS3",
        type: "STOCK_BR" as const,
        quantity: 100,
        averagePrice: 25,
        annualDividend: 2.0,
        currency: "BRL" as const,
      },
      {
        ticker: "TAEE11",
        type: "STOCK_BR" as const,
        quantity: 200,
        averagePrice: 35,
        annualDividend: 3.0,
        currency: "BRL" as const,
      },
      {
        ticker: "AAPL",
        type: "STOCK_US" as const,
        quantity: 10,
        averagePrice: 150,
        annualDividend: 1.0,
        currency: "USD" as const,
      },
    ] as WatchlistItem[];

    const realizedEvents: RealizedIncomeEvent[] = [
      // 1. JCP event: Gross R$ 100,00, Phase 1 net R$ 85,00
      // Phase 2 adapter must compute 15% on R$ 100,00 -> Net R$ 85,00 (NOT 85 * 0.85 = 72.25)
      {
        ticker: "BBAS3",
        currency: "BRL",
        exDate: `${currentYear}-03-01`,
        paymentDate: `${currentYear}-03-15`,
        isPaid: true,
        quantityHeld: 100,
        amountPerShareGross: 1.0,
        amountGross: 100,
        amountNet: 85,
        taxType: "jcp",
      },
      // 2. BR Ordinary Dividend: Gross R$ 200,00 -> 0% tax -> Net R$ 200,00
      {
        ticker: "TAEE11",
        currency: "BRL",
        exDate: `${currentYear}-04-01`,
        paymentDate: `${currentYear}-04-15`,
        isPaid: true,
        quantityHeld: 200,
        amountPerShareGross: 1.0,
        amountGross: 200,
        amountNet: 200,
        taxType: "dividend",
      },
      // 3. US Dividend: Gross USD 100,00 -> 30% withholding -> Net USD 70,00 * FX 5.0 = BRL 350,00
      {
        ticker: "AAPL",
        currency: "USD",
        exDate: `${currentYear}-05-01`,
        paymentDate: `${currentYear}-05-15`,
        isPaid: true,
        quantityHeld: 10,
        amountPerShareGross: 10.0,
        amountGross: 100,
        amountNet: 70,
        taxType: "us_dividend",
      },
    ];

    const fxRate = 5.0;
    const context = buildTaxContext([], watchlistItems, realizedEvents, fxRate);

    // Verify JCP: strictly R$ 85,00 (tax = R$ 15,00)
    expect(context.jcpTaxResult.totalGross).toBe(100);
    expect(context.jcpTaxResult.totalTax).toBe(15);
    expect(context.jcpTaxResult.totalNet).toBe(85);
    expect(context.totalNetJcp).toBe(85);

    // Verify BR Ordinary Dividends: strictly R$ 200,00 (tax = 0)
    expect(context.brDividendsTaxResult.totalGross).toBe(200);
    expect(context.brDividendsTaxResult.totalTax).toBe(0);
    expect(context.brDividendsTaxResult.totalNet).toBe(200);
    expect(context.totalNetDividends).toBe(200);

    // Verify US Withholding: strictly USD 70,00 net (USD 30,00 tax) -> BRL 350,00 net (BRL 150,00 tax)
    expect(context.usWithholdingTaxResult.totalGross).toBe(100);
    expect(context.usWithholdingTaxResult.totalTax).toBe(30);
    expect(context.usWithholdingTaxResult.totalNet).toBe(70);
    expect(context.totalNetUsBrl).toBe(350);

    // Aggregates:
    // totalDividendNet = 200 + 85 + 350 = 635 BRL
    // totalWithheldTax = 15 (JCP) + 150 (US @ 5.0) = 165 BRL
    expect(context.totalDividendNet).toBe(635);
    expect(context.totalWithheldTax).toBe(165);
  });
});
