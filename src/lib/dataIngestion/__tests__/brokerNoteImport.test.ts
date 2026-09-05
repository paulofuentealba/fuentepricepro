import { describe, it, expect } from "vitest";
import { consolidateTradesToWatchlistItems } from "../brokerNoteImport";

describe("consolidateTradesToWatchlistItems — broker persistence", () => {
  const trade = { ticker: "BBAS3", quantity: 100, price: 25.5, date: "01/06/2024" };

  it("sets broker from the label map when detectedBroker is provided", () => {
    const items = consolidateTradesToWatchlistItems([trade], [], [], {}, "BTG");
    expect(items).toHaveLength(1);
    expect(items[0].broker).toBe("BTG Pactual");
  });

  it("sets broker to null when detectedBroker is omitted", () => {
    const items = consolidateTradesToWatchlistItems([trade], [], []);
    expect(items).toHaveLength(1);
    expect(items[0].broker).toBeNull();
  });
});
