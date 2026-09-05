import { describe, it, expect } from "vitest";
import { KNOWN_BROKER_LABELS, type SupportedBroker } from "../brokers";

describe("KNOWN_BROKER_LABELS", () => {
  it("has a label for every SupportedBroker key", () => {
    const keys = Object.keys(KNOWN_BROKER_LABELS) as SupportedBroker[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(typeof KNOWN_BROKER_LABELS[key]).toBe("string");
      expect(KNOWN_BROKER_LABELS[key].length).toBeGreaterThan(0);
    }
  });

  it("includes BTG and SCHWAB (matching the prototype's example brokers)", () => {
    expect(KNOWN_BROKER_LABELS.BTG).toBe("BTG Pactual");
    expect(KNOWN_BROKER_LABELS.SCHWAB).toBe("Charles Schwab");
  });
});
