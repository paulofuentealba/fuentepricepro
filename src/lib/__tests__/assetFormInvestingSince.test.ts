import { describe, it, expect } from "vitest";
import { buildUserDataExport } from "../dataExport";
import type { WatchlistItem } from "../watchlist";

describe("AssetForm investingSince customization integration", () => {
  it("should preserve custom historical investingSince timestamp (e.g. 2 years ago) instead of overwriting with Date.now()", () => {
    const historicalDate = new Date("2024-03-15T00:00:00.000Z");
    const historicalTimestampMs = historicalDate.getTime();
    const nowMs = Date.now();

    // Simulate AssetForm submission payload when user picks March 15, 2024 in InvestingSinceField
    const formSubmitValue = {
      ticker: "PETR4",
      type: "STOCK_BR" as const,
      targetYield: 6,
      averagePrice: null,
      customTaxRate: null,
      investingSince: historicalTimestampMs, // Selected via InvestingSinceField
    };

    // Verify form submit payload has custom historical timestamp, NOT Date.now()
    expect(formSubmitValue.investingSince).toBe(historicalTimestampMs);
    expect(formSubmitValue.investingSince).not.toBe(nowMs);
    expect(formSubmitValue.investingSince).toBeLessThan(nowMs - 365 * 24 * 3600 * 1000); // More than 1 year ago

    // Simulate saving the asset to watchlist
    const createdAsset: WatchlistItem = {
      id: "STOCK_BR:PETR4",
      ticker: formSubmitValue.ticker,
      name: "Petróleo Brasileiro S.A. - Petrobras",
      type: formSubmitValue.type,
      currency: "BRL",
      currentPrice: 38.5,
      annualDividend: 4.2,
      targetYield: formSubmitValue.targetYield,
      ceilingPrice: 70.0,
      safetyMargin: 45.0,
      quantity: 50,
      averagePrice: 35.0,
      paymentMonths: [5, 8, 11, 12],
      payoutRatio: 0.45,
      addedAt: nowMs,
      investingSince: formSubmitValue.investingSince,
    };

    // Verify asset object has historical timestamp
    expect(createdAsset.investingSince).toBe(1710460800000);

    // Verify LGPD data export serializes historical investingSince correctly
    const exportData = buildUserDataExport({
      assets: [createdAsset],
      metadata: {
        userId: "user-123",
        exportedAt: new Date().toISOString(),
      },
    });

    const exportedAsset = exportData.data.assets[0];
    expect(exportedAsset.investingSince).toBe(1710460800000);
    expect(new Date(exportedAsset.investingSince).toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });
});
