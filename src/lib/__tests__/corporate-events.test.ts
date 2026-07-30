import { describe, it, expect } from "vitest";
import {
  applyCorporateEvent,
  type AssetPosition,
  type CorporateEventPayload,
} from "../corporateEvents";

describe("Corporate Events Engine", () => {
  it("should multiply asset quantity by 4 and divide average price by 4 during a 1:4 split", () => {
    const position: AssetPosition = { ticker: "WEGE3", quantity: 100, averagePrice: 40.0 };
    const event: CorporateEventPayload = { type: "split", factor: 4 };

    const result = applyCorporateEvent(position, event);

    expect(result.quantity).toBe(400);
    expect(result.averagePrice).toBe(10.0);
  });

  it("should ensure Total Invested Capital remains exactly equal before and after a split", () => {
    const position: AssetPosition = { ticker: "PETR4", quantity: 250, averagePrice: 32.5 };
    const initialCapital = position.quantity * position.averagePrice; // 8125

    // Simulate an unusual 1:3 split
    const event: CorporateEventPayload = { type: "split", factor: 3 };
    const result = applyCorporateEvent(position, event);

    const finalCapital = result.quantity * result.averagePrice;

    // Allow for small floating point variations
    expect(finalCapital).toBeCloseTo(initialCapital, 4);
    expect(result.quantity).toBe(750);
  });

  it("should correctly handle fractional shares resulting from groupings (Inplit)", () => {
    const position: AssetPosition = { ticker: "OIBR3", quantity: 15, averagePrice: 2.0 }; // Capital: $30

    // 10:1 grouping (1 new share for every 10 old shares)
    // 15 old shares -> 1.5 new shares.
    // Liquidated fraction: 0.5 shares. Whole shares: 1.
    const event: CorporateEventPayload = { type: "grouping", factor: 0.1 };

    // Liquidation defaults to the new average price (which would be $20.00)
    const result = applyCorporateEvent(position, event, true);

    expect(result.quantity).toBe(1); // 1 whole share
    expect(result.averagePrice).toBe(20.0); // 2.00 / 0.1
    expect(result.fractionalCash).toBe(10.0); // 0.5 fractional * $20.00

    // Ensure conservation of value (Value of shares + Cash == Initial Capital)
    const finalCapitalAndCash =
      result.quantity * result.averagePrice + (result.fractionalCash || 0);
    const initialCapital = position.quantity * position.averagePrice;

    expect(finalCapitalAndCash).toBeCloseTo(initialCapital, 4);
  });

  it("should calculate fractional cash using current market price when grouping fractionals", () => {
    const position: AssetPosition = { ticker: "OIBR3", quantity: 15, averagePrice: 2.0 }; // Avg price = 2, Capital = 30
    const event: CorporateEventPayload = { type: "grouping", factor: 0.1 };

    // Let's say market price skyrocketed to $5.00 before grouping (so new market price is $50.00)
    const marketPriceAfterGrouping = 50.0;
    const result = applyCorporateEvent(position, event, true, marketPriceAfterGrouping);

    expect(result.quantity).toBe(1);
    expect(result.averagePrice).toBe(20.0); // Internal accounting average price stays the same mathematically
    expect(result.fractionalCash).toBe(25.0); // 0.5 fractional * $50.00 market price
  });
});
