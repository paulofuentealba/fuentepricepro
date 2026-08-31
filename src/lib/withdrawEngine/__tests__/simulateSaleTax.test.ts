import { describe, it, expect } from "vitest";
import { computeMarginalTaxBRL, currentPeriodResult, resolveWithdrawTaxTrack } from "../simulateSaleTax";
import type { WithdrawTaxState } from "../types";
import type { RealizedGainEvent } from "@/lib/tax/types";

describe("resolveWithdrawTaxTrack", () => {
  it("routes each asset type/currency combination to its SSOT tax track", () => {
    expect(resolveWithdrawTaxTrack("STOCK_BR", "BRL")).toBe("STOCK_BR");
    expect(resolveWithdrawTaxTrack("FII", "BRL")).toBe("FII");
    expect(resolveWithdrawTaxTrack("FIAGRO", "BRL")).toBe("FII");
    expect(resolveWithdrawTaxTrack("FII_INFRA", "BRL")).toBe("FII_INFRA");
    expect(resolveWithdrawTaxTrack("ETF", "BRL")).toBe("ETF_BR");
    expect(resolveWithdrawTaxTrack("ETF", "USD")).toBe("FOREIGN");
    expect(resolveWithdrawTaxTrack("STOCK_US", "USD")).toBe("FOREIGN");
    expect(resolveWithdrawTaxTrack("REIT", "USD")).toBe("FOREIGN");
    expect(resolveWithdrawTaxTrack("FIXED_INCOME", "BRL")).toBeNull();
    expect(resolveWithdrawTaxTrack(undefined, "BRL")).toBeNull();
  });
});

describe("computeMarginalTaxBRL — sell order matters (the prototype's core insight)", () => {
  const tsThisMonth = new Date(2026, 7, 20).getTime(); // Aug 2026

  const taxState = (realizedGainEvents: RealizedGainEvent[]): WithdrawTaxState => ({
    realizedGainEvents,
    assetTypeByTicker: new Map([
      ["BBAS3", "STOCK_BR"],
      ["MXRF11", "FII"],
      ["O", "REIT"],
    ]),
    currencyByTicker: new Map([
      ["BBAS3", "BRL"],
      ["MXRF11", "BRL"],
      ["O", "USD"],
    ]),
    fxRate: 5,
  });

  it("is 0 for a lot that alone keeps the month within the R$20k stock exemption", () => {
    const candidate: RealizedGainEvent = {
      ticker: "BBAS3",
      saleDate: tsThisMonth,
      quantity: 100,
      salePrice: 30,
      proceeds: 3000,
      costBasis: 2500,
      gain: 500,
      assetType: "STOCK_BR",
    };
    const tax = computeMarginalTaxBRL("STOCK_BR", candidate, [], taxState([]));
    expect(tax).toBe(0);
  });

  it("becomes taxable once the SAME lot pushes cumulative monthly proceeds past R$20k", () => {
    const priorRealSale: RealizedGainEvent = {
      ticker: "BBAS3",
      saleDate: tsThisMonth - 1000,
      quantity: 500,
      salePrice: 30,
      proceeds: 15000,
      costBasis: 10000,
      gain: 5000,
      assetType: "STOCK_BR",
    };
    const candidate: RealizedGainEvent = {
      ticker: "BBAS3",
      saleDate: tsThisMonth,
      quantity: 300,
      salePrice: 33.33,
      proceeds: 10000,
      costBasis: 8000,
      gain: 2000,
      assetType: "STOCK_BR",
    };

    // Alone (no prior sales this month) the R$10k lot would be exempt.
    const taxAlone = computeMarginalTaxBRL("STOCK_BR", candidate, [], taxState([]));
    expect(taxAlone).toBe(0);

    // Combined with the R$15k prior REAL sale (already in taxState's history, not a pending
    // simulated event — hence [] for acceptedEventsSoFarForTrack), total proceeds = 25k > 20k
    // threshold: BOTH become taxable — 15% of the combined R$7,000 gain = R$1,050 is attributed
    // to this candidate, since it's what tipped the month over the exemption.
    const taxCombined = computeMarginalTaxBRL("STOCK_BR", candidate, [], taxState([priorRealSale]));
    expect(taxCombined).toBe(1050);
  });

  it("FII_INFRA is always 0% regardless of gain (Lei 12.431/2011)", () => {
    const candidate: RealizedGainEvent = {
      ticker: "VGIR11",
      saleDate: tsThisMonth,
      quantity: 1000,
      salePrice: 100,
      proceeds: 100000,
      costBasis: 50000,
      gain: 50000,
      assetType: "FII_INFRA",
    };
    expect(computeMarginalTaxBRL("FII_INFRA", candidate, [], taxState([]))).toBe(0);
  });

  it("converts the FOREIGN track's native-currency (USD) tax into BRL via fxRate", () => {
    const candidate: RealizedGainEvent = {
      ticker: "O",
      saleDate: tsThisMonth,
      quantity: 100,
      salePrice: 60,
      proceeds: 6000,
      costBasis: 4000,
      gain: 2000,
      assetType: "REIT",
    };
    // 15% flat on USD 2,000 gain = USD 300 -> BRL 300 * fxRate(5) = BRL 1,500.
    const tax = computeMarginalTaxBRL("FOREIGN", candidate, [], taxState([]));
    expect(tax).toBe(1500);
  });
});

describe("currentPeriodResult", () => {
  it("reports lossCarryforwardUsed for the STOCK_BR track but not for FOREIGN", () => {
    const events: RealizedGainEvent[] = [
      {
        // Non-exempt month (proceeds > R$20k) so the loss actually accrues to carryforward —
        // an exempt month's loss is void per calculateMonthlyCapitalGainsTax's own rule.
        ticker: "BBAS3",
        saleDate: new Date(2026, 6, 10).getTime(),
        quantity: 1000,
        salePrice: 25,
        proceeds: 25000,
        costBasis: 31000,
        gain: -6000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "BBAS3",
        saleDate: new Date(2026, 7, 10).getTime(),
        quantity: 500,
        salePrice: 60,
        proceeds: 30000,
        costBasis: 20000,
        gain: 10000,
        assetType: "STOCK_BR",
      },
    ];
    const result = currentPeriodResult(
      "STOCK_BR",
      events,
      new Map([["BBAS3", "STOCK_BR"]]),
      new Map([["BBAS3", "BRL"]]),
    );
    expect(result.lossCarryforwardUsed).toBe(6000);
    expect(result.taxDue).toBe(600); // 15% of (10000 - 6000)
  });
});
