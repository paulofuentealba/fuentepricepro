import { describe, expect, it } from "vitest";
import { calculateIrr, buildCashFlowsFromPortfolio, getEffectiveTransactions, isUsdAsset, type CashFlow } from "../portfolioIrr";
import { type Transaction } from "../transactionsLogic";
import { type RealizedIncomeEvent } from "../realizedIncome";

describe("portfolioIrr", () => {
  describe("calculateIrr", () => {
    it("returns null for insufficient or invalid cash flows", () => {
      expect(calculateIrr([])).toBeNull();
      expect(calculateIrr([{ date: 1000, amount: -100 }])).toBeNull();
      expect(calculateIrr([{ date: 1000, amount: 100 }, { date: 2000, amount: 200 }])).toBeNull(); // no outflows
      expect(calculateIrr([{ date: 1000, amount: -100 }, { date: 2000, amount: -200 }])).toBeNull(); // no inflows
    });

    it("scenario 1: single buy of 10,000 one year ago doubling to 20,000 -> IRR ~100%", () => {
      const now = new Date("2026-01-01T00:00:00Z").getTime();
      const oneYearAgo = now - 365.25 * 24 * 60 * 60 * 1000;

      const flows: CashFlow[] = [
        { date: oneYearAgo, amount: -10000 },
        { date: now, amount: 20000 },
      ];

      const irr = calculateIrr(flows);
      expect(irr).not.toBeNull();
      expect(irr).toBeCloseTo(1.0, 3); // 100% a.a.
    });

    it("scenario 2: buy 10,000 1yr ago + dividend 500 at 6mo (paymentDate) + final value 11,000 -> IRR ~15.3705%", () => {
      const t0 = new Date("2025-01-01T00:00:00Z").getTime();
      const t1 = t0 + 182.625 * 24 * 60 * 60 * 1000; // 0.5 years (6 months)
      const t2 = t0 + 365.25 * 24 * 60 * 60 * 1000; // 1.0 year

      const flows: CashFlow[] = [
        { date: t0, amount: -10000 },
        { date: t1, amount: 500 },
        { date: t2, amount: 11000 },
      ];

      const irr = calculateIrr(flows);
      expect(irr).not.toBeNull();
      // Analytical solution derived in prompt review: r = (1.07410675)^2 - 1 = 15.3705%
      expect(irr).toBeCloseTo(0.1537, 4);
    });

    it("scenario 3: handles bisection fallback for complex multi-period flows gracefully", () => {
      const t0 = new Date("2024-01-01").getTime();
      const t1 = new Date("2024-07-01").getTime();
      const t2 = new Date("2025-01-01").getTime();
      const t3 = new Date("2025-07-01").getTime();

      const flows: CashFlow[] = [
        { date: t0, amount: -50000 },
        { date: t1, amount: -20000 },
        { date: t2, amount: 3000 },
        { date: t3, amount: 80000 },
      ];

      const irr = calculateIrr(flows);
      expect(irr).not.toBeNull();
      expect(typeof irr).toBe("number");
      expect(irr!).toBeGreaterThan(0.05);
      expect(irr!).toBeLessThan(0.30);
    });
  });

  describe("buildCashFlowsFromPortfolio", () => {
    it("uses paymentDate for dividends (falling back to exDate ONLY when paymentDate is null)", () => {
      const t0 = new Date("2025-01-01").getTime();
      const txs: Transaction[] = [
        {
          id: "tx1",
          ticker: "PETR4.SA",
          type: "buy",
          date: t0,
          quantity: 100,
          pricePerShare: 30,
        },
      ];

      const realized: RealizedIncomeEvent[] = [
        {
          ticker: "PETR4.SA",
          currency: "BRL",
          exDate: "2025-04-01",
          paymentDate: "2025-05-15", // Payment date is 1.5 months after exDate!
          isPaid: true,
          quantityHeld: 100,
          amountPerShareGross: 1.0,
          amountGross: 100,
          amountNet: 100,
          taxType: "dividend",
        },
        {
          ticker: "AAPL",
          currency: "USD",
          exDate: "2025-06-01",
          paymentDate: null, // Fallback to exDate!
          isPaid: true,
          quantityHeld: 10,
          amountPerShareGross: 0.5,
          amountGross: 5,
          amountNet: 3.5,
          taxType: "us_dividend",
        },
      ];

      const now = new Date("2025-12-31").getTime();
      const flows = buildCashFlowsFromPortfolio(txs, realized, 3500, now, 5.0, {
        "PETR4.SA": "BRL",
        AAPL: "USD",
      });

      expect(flows).toHaveLength(4); // 1 buy + 2 dividends + 1 terminal value

      // Check buy
      expect(flows[0].amount).toBe(-3000);

      // Check PETR4 dividend -> MUST use paymentDate ("2025-05-15")
      const petr4Flow = flows.find((f) => f.amount === 100)!;
      expect(new Date(petr4Flow.date).toISOString().slice(0, 10)).toBe("2025-05-15");

      // Check AAPL dividend -> fallback to exDate ("2025-06-01") converted to BRL (3.5 * 5.0 = 17.5)
      const aaplFlow = flows.find((f) => f.amount === 17.5)!;
      expect(new Date(aaplFlow.date).toISOString().slice(0, 10)).toBe("2025-06-01");

      // Check terminal value
      expect(flows[3].amount).toBe(3500);
      expect(flows[3].date).toBe(now);
    });

    it("correctly classifies closed BR positions without .SA as BRL (rate = 1) even when absent from assetCurrencies", () => {
      const t0 = new Date("2024-01-01").getTime();
      const t1 = new Date("2024-06-01").getTime();

      // Closed BR position for PETR4 (no .SA suffix, position is 0 so omitted from active watchlist assetCurrencies map)
      const txs: Transaction[] = [
        {
          id: "tx-buy",
          ticker: "PETR4",
          type: "buy",
          date: t0,
          quantity: 100,
          pricePerShare: 30,
        },
        {
          id: "tx-sell",
          ticker: "PETR4",
          type: "sell",
          date: t1,
          quantity: 100,
          pricePerShare: 35,
        },
      ];

      // assetCurrencies is empty because PETR4 is closed and not in active watchlist
      const flows = buildCashFlowsFromPortfolio(txs, [], 0, Date.now(), 5.5, {});

      expect(flows).toHaveLength(2);
      // Buy should be -3000 (NOT converted by fxRate 5.5)
      expect(flows[0].amount).toBe(-3000);
      // Sell should be +3500 (NOT converted by fxRate 5.5)
      expect(flows[1].amount).toBe(3500);
    });

    it("filters cashflows strictly by targetCurrency without applying FX conversion", () => {
      const t0 = new Date("2025-01-01").getTime();
      const txs: Transaction[] = [
        { id: "tx1", ticker: "PETR4.SA", type: "buy", date: t0, quantity: 100, pricePerShare: 30 },
        { id: "tx2", ticker: "AAPL", type: "buy", date: t0, quantity: 10, pricePerShare: 150 },
      ];

      const realized: RealizedIncomeEvent[] = [
        {
          ticker: "PETR4.SA",
          currency: "BRL",
          exDate: "2025-04-01",
          paymentDate: "2025-05-15",
          isPaid: true,
          quantityHeld: 100,
          amountPerShareGross: 1.0,
          amountGross: 100,
          amountNet: 100,
          taxType: "dividend",
        },
        {
          ticker: "AAPL",
          currency: "USD",
          exDate: "2025-06-01",
          paymentDate: "2025-06-15",
          isPaid: true,
          quantityHeld: 10,
          amountPerShareGross: 0.5,
          amountGross: 5,
          amountNet: 3.5,
          taxType: "us_dividend",
        },
      ];

      const assetCurrencies = { "PETR4.SA": "BRL" as const, AAPL: "USD" as const };

      const endOfYear = new Date("2025-12-31").getTime();

      // Filter BRL ONLY: Should include PETR4 buy (-3000) and PETR4 dividend (+100), excluding AAPL
      const brlFlows = buildCashFlowsFromPortfolio(txs, realized, 3500, endOfYear, 5.0, assetCurrencies, "BRL");
      expect(brlFlows.some((f) => f.amount === -3000)).toBe(true);
      expect(brlFlows.some((f) => f.amount === 100)).toBe(true);
      expect(brlFlows.some((f) => f.amount === -1500 || f.amount === -7500)).toBe(false); // No AAPL buy
      expect(brlFlows.some((f) => f.amount === 3.5 || f.amount === 17.5)).toBe(false); // No AAPL dividend

      // Filter USD ONLY: Should include AAPL buy (-1500, rate = 1) and AAPL dividend (+3.5, rate = 1), excluding PETR4
      const usdFlows = buildCashFlowsFromPortfolio(txs, realized, 1800, endOfYear, 5.0, assetCurrencies, "USD");
      expect(usdFlows.some((f) => f.amount === -1500)).toBe(true);
      expect(usdFlows.some((f) => f.amount === 3.5)).toBe(true);
      expect(usdFlows.some((f) => f.amount === -3000)).toBe(false); // No PETR4 buy
      expect(usdFlows.some((f) => f.amount === 100)).toBe(false); // No PETR4 dividend
    });

    it("returns empty cashflow list for targetCurrency when portfolio has no assets in that currency", () => {
      const t0 = new Date("2025-01-01").getTime();
      const txs: Transaction[] = [
        { id: "tx1", ticker: "VALE3.SA", type: "buy", date: t0, quantity: 100, pricePerShare: 60 },
      ];

      const assetCurrencies = { "VALE3.SA": "BRL" as const };

      // Portfolio has ONLY BRL assets. Requesting USD cashflows should yield no buy/sell flows.
      const usdFlows = buildCashFlowsFromPortfolio(txs, [], 0, t0 + 1000, 5.0, assetCurrencies, "USD");
      expect(usdFlows).toEqual([]);
    });

    it("regression test: generates effective USD transactions for USD watchlist items even when explicit transactions are missing or mismatched", () => {
      const now = Date.now();
      const mockItems: any[] = [
        {
          id: "us_stock:MSFT",
          ticker: "MSFT",
          name: "Microsoft Corporation",
          type: "STOCK_US",
          currency: "USD",
          quantity: 10,
          averagePrice: 400.0,
          currentPrice: 420.0,
          investingSince: now - 365 * 24 * 60 * 60 * 1000,
        },
        {
          id: "brazilian_stock:PETR4.SA",
          ticker: "PETR4.SA",
          name: "Petróleo Brasileiro S.A.",
          type: "STOCK_BR",
          currency: "BRL",
          quantity: 100,
          averagePrice: 30.0,
          currentPrice: 35.0,
          investingSince: now - 365 * 24 * 60 * 60 * 1000,
        },
      ];

      const assetCurrencies = { MSFT: "USD" as const, "PETR4.SA": "BRL" as const };

      // Case A: Explicit transactions list is empty for USD assets
      const explicitTxs: Transaction[] = [];
      const effectiveTxs = getEffectiveTransactions(explicitTxs, mockItems);

      expect(effectiveTxs.some((t) => t.ticker === "MSFT")).toBe(true);

      const usdCashFlows = buildCashFlowsFromPortfolio(
        effectiveTxs,
        [],
        4200, // 10 * 420
        now,
        1,
        assetCurrencies,
        "USD",
      );

      expect(usdCashFlows.length).toBeGreaterThanOrEqual(2); // Buy outflow + terminal value
      const irr = calculateIrr(usdCashFlows);
      expect(irr).not.toBeNull();

      // Case B: Ticker format mismatch (e.g. lowercase "msft" or ticker without .SA)
      expect(isUsdAsset("msft", assetCurrencies)).toBe(true);
      expect(isUsdAsset("PETR4", assetCurrencies)).toBe(false);
    });

    it("correctly subtracts fees on sell transactions and adds fees on buy transactions", () => {
      const t0 = new Date("2025-01-01").getTime();
      const t1 = new Date("2025-06-01").getTime();

      const txs: Transaction[] = [
        {
          id: "tx-buy",
          ticker: "PETR4.SA",
          type: "buy",
          date: t0,
          quantity: 100,
          pricePerShare: 20, // Gross: 2000
          fees: 10,          // Total outflow: 2000 + 10 = 2010
        },
        {
          id: "tx-sell",
          ticker: "PETR4.SA",
          type: "sell",
          date: t1,
          quantity: 100,
          pricePerShare: 30, // Gross: 3000
          fees: 15,          // Total inflow: 3000 - 15 = 2985
        },
      ];

      const flows = buildCashFlowsFromPortfolio(txs, [], 0, t1 + 1000, 1.0, { "PETR4.SA": "BRL" }, "BRL");

      const buyFlow = flows.find((f) => f.date === t0);
      const sellFlow = flows.find((f) => f.date === t1);

      expect(buyFlow).toBeDefined();
      expect(buyFlow?.amount).toBe(-2010); // Buy adds fees to cost basis (more cash out)

      expect(sellFlow).toBeDefined();
      expect(sellFlow?.amount).toBe(+2985); // Sell subtracts fees from proceeds (less cash in)
    });

    it("yields a strictly lower IRR when sell transaction has fees compared to zero fees", () => {
      const t0 = new Date("2025-01-01").getTime();
      const t1 = new Date("2025-12-31").getTime();

      const txsNoFee: Transaction[] = [
        { id: "b", ticker: "VALE3.SA", type: "buy", date: t0, quantity: 100, pricePerShare: 50, fees: 0 },
        { id: "s", ticker: "VALE3.SA", type: "sell", date: t1, quantity: 100, pricePerShare: 60, fees: 0 },
      ];

      const txsWithFee: Transaction[] = [
        { id: "b", ticker: "VALE3.SA", type: "buy", date: t0, quantity: 100, pricePerShare: 50, fees: 0 },
        { id: "s", ticker: "VALE3.SA", type: "sell", date: t1, quantity: 100, pricePerShare: 60, fees: 500 }, // 500 in fees
      ];

      const flowsNoFee = buildCashFlowsFromPortfolio(txsNoFee, [], 0, t1 + 1000, 1.0, { "VALE3.SA": "BRL" }, "BRL");
      const flowsWithFee = buildCashFlowsFromPortfolio(txsWithFee, [], 0, t1 + 1000, 1.0, { "VALE3.SA": "BRL" }, "BRL");

      const irrNoFee = calculateIrr(flowsNoFee);
      const irrWithFee = calculateIrr(flowsWithFee);

      expect(irrNoFee).not.toBeNull();
      expect(irrWithFee).not.toBeNull();
      expect(irrWithFee!).toBeLessThan(irrNoFee!);
    });

    it("synthesizes transaction with pricePerShare 0 (not currentPrice) when averagePrice is missing (Item 3)", () => {
      const now = Date.now();
      const mockItems: any[] = [
        {
          id: "item-no-cost",
          ticker: "VALE3",
          name: "Vale S.A.",
          type: "STOCK_BR",
          currency: "BRL",
          quantity: 100,
          averagePrice: null, // Unknown cost basis
          currentPrice: 65.0, // Live quote today
          investingSince: now - 180 * 24 * 60 * 60 * 1000,
        },
      ];

      const effectiveTxs = getEffectiveTransactions([], mockItems);
      expect(effectiveTxs).toHaveLength(1);
      expect(effectiveTxs[0].ticker).toBe("VALE3");
      expect(effectiveTxs[0].quantity).toBe(100);
      // Critical check: Never uses currentPrice (65.0) as cost basis!
      expect(effectiveTxs[0].pricePerShare).toBe(0);

      // Verify that buildCashFlowsFromPortfolio does not create a cash outflow for pricePerShare 0
      const cashFlows = buildCashFlowsFromPortfolio(effectiveTxs, [], 6500, now, 1.0, { VALE3: "BRL" }, "BRL");
      const buyFlow = cashFlows.find((f) => f.amount < 0);
      expect(buyFlow).toBeUndefined(); // Zero cost = no fake cash outflow
    });
  });
});
