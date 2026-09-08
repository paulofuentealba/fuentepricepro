import { describe, it, expect } from "vitest";
import { checkWashSaleRisk } from "../washSaleRisk";
import { runAsk } from "../engine";
import type { AskContext, Strategy, StrategyCandidate } from "../types";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Transaction } from "@/lib/transactionsLogic";

describe("Wash Sale Prevention in AskEngine (IRC § 1091)", () => {
  const asOfDate = new Date("2026-03-15T12:00:00Z");
  const asOfTs = asOfDate.getTime();

  it("detects recent loss sale within 30 days and returns alert details", () => {
    // AAPL: bought at $180, sold 10 days ago (2026-03-05) at $150 -> $30 loss/share * 10 shares = $300 loss
    const transactions: Transaction[] = [
      {
        id: "tx_buy",
        ticker: "AAPL",
        type: "buy",
        date: new Date("2026-01-10T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 180,
        broker: "Fidelity",
        accountType: "taxable",
      },
      {
        id: "tx_sell",
        ticker: "AAPL",
        type: "sell",
        date: new Date("2026-03-05T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 150,
        broker: "Fidelity",
        accountType: "taxable",
      },
    ];

    const alert = checkWashSaleRisk("AAPL", transactions, asOfTs);
    expect(alert).toBeDefined();
    expect(alert?.disallowedLossEstimate).toBe(300);
    expect(alert?.daysRemaining).toBe(20); // 30 - 10 = 20 days remaining
    expect(alert?.salePrice).toBe(150);
  });

  it("returns undefined when sale happened more than 30 days ago", () => {
    // Sold 40 days ago (2026-02-03)
    const transactions: Transaction[] = [
      {
        id: "tx_buy",
        ticker: "AAPL",
        type: "buy",
        date: new Date("2026-01-01T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 180,
        broker: "Fidelity",
        accountType: "taxable",
      },
      {
        id: "tx_sell",
        ticker: "AAPL",
        type: "sell",
        date: new Date("2026-02-03T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 150,
        broker: "Fidelity",
        accountType: "taxable",
      },
    ];

    const alert = checkWashSaleRisk("AAPL", transactions, asOfTs);
    expect(alert).toBeUndefined();
  });

  it("returns undefined when the recent sale was profitable", () => {
    // Bought at $150, sold at $200 -> gain
    const transactions: Transaction[] = [
      {
        id: "tx_buy",
        ticker: "AAPL",
        type: "buy",
        date: new Date("2026-01-10T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 150,
        broker: "Fidelity",
        accountType: "taxable",
      },
      {
        id: "tx_sell",
        ticker: "AAPL",
        type: "sell",
        date: new Date("2026-03-05T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 200,
        broker: "Fidelity",
        accountType: "taxable",
      },
    ];

    const alert = checkWashSaleRisk("AAPL", transactions, asOfTs);
    expect(alert).toBeUndefined();
  });

  it("returns undefined when sale occurred inside a Roth IRA", () => {
    const transactions: Transaction[] = [
      {
        id: "tx_buy",
        ticker: "AAPL",
        type: "buy",
        date: new Date("2026-01-10T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 180,
        broker: "Fidelity",
        accountType: "roth_ira",
      },
      {
        id: "tx_sell",
        ticker: "AAPL",
        type: "sell",
        date: new Date("2026-03-05T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 150,
        broker: "Fidelity",
        accountType: "roth_ira",
      },
    ];

    const alert = checkWashSaleRisk("AAPL", transactions, asOfTs);
    expect(alert).toBeUndefined();
  });

  it("attaches washSaleRisk to allocation in runAsk", () => {
    const mockPosition: ValuedWatchlistItem = {
      id: "pos-1",
      ticker: "AAPL",
      name: "Apple Inc.",
      type: "STOCK_US",
      currency: "USD",
      currentPrice: 150,
      livePrice: 150,
      annualDividend: 1.0,
      targetYield: 2,
      ceilingPrice: 200,
      safetyMargin: 33,
      quantity: 10,
      averagePrice: 150,
      paymentMonths: [2, 5, 8, 11],
      payoutRatio: 15,
      sector: "Technology",
      addedAt: 1700000000000,
      investingSince: 1700000000000,
      isClosedPosition: false,
      isBffMode: true,
      valuation: {} as any,
    } as unknown as ValuedWatchlistItem;

    const transactions: Transaction[] = [
      {
        id: "tx_buy",
        ticker: "AAPL",
        type: "buy",
        date: new Date("2026-01-10T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 180,
        broker: "Fidelity",
        accountType: "taxable",
      },
      {
        id: "tx_sell",
        ticker: "AAPL",
        type: "sell",
        date: new Date("2026-03-05T10:00:00Z").getTime(),
        quantity: 10,
        pricePerShare: 140,
        broker: "Fidelity",
        accountType: "taxable",
      },
    ];

    const mockStrategy: Strategy = {
      id: "test-strategy",
      labelKey: "test",
      requiresTargets: false,
      run: () => [
        {
          ticker: "AAPL",
          suggestedQuantity: 5,
          reasonKey: "reasons.opportunity",
        },
      ],
    };

    const ctx: AskContext = {
      positions: [mockPosition],
      availableAmount: 1000,
      settings: {},
      asOf: asOfDate.toISOString(),
      transactions,
    };

    const result = runAsk(ctx, mockStrategy);
    expect(result.state).toBe("success");
    expect(result.allocations.length).toBe(1);
    expect(result.allocations[0].ticker).toBe("AAPL");
    expect(result.allocations[0].washSaleRisk).toBeDefined();
    expect(result.allocations[0].washSaleRisk?.disallowedLossEstimate).toBe(400); // 10 * (180 - 140)
    expect(result.allocations[0].washSaleRisk?.daysRemaining).toBe(20);
  });
});
