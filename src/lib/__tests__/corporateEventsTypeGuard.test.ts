import { describe, it, expect } from "vitest";
import { isPendingCorporateEvent } from "../corporateEvents";

describe("isPendingCorporateEvent Type Guard (Prompt 111)", () => {
  it("returns true for valid PendingCorporateEvent objects", () => {
    const validSplit = {
      eventId: "split-123",
      date: 1715000000000,
      type: "split",
      ratio: 2,
    };
    expect(isPendingCorporateEvent(validSplit)).toBe(true);

    const validGrouping = {
      eventId: "group-456",
      date: 1715100000000,
      type: "grouping",
      ratio: 0.1,
    };
    expect(isPendingCorporateEvent(validGrouping)).toBe(true);
  });

  it("returns false for invalid shapes", () => {
    expect(isPendingCorporateEvent(null)).toBe(false);
    expect(isPendingCorporateEvent(undefined)).toBe(false);
    expect(isPendingCorporateEvent("string")).toBe(false);
    expect(isPendingCorporateEvent(123)).toBe(false);
    expect(isPendingCorporateEvent({})).toBe(false);

    // Missing eventId
    expect(isPendingCorporateEvent({ date: 123, type: "split", ratio: 2 })).toBe(false);

    // Invalid type
    expect(isPendingCorporateEvent({ eventId: "e1", date: 123, type: "dividend", ratio: 2 })).toBe(false);

    // Invalid ratio (negative or 0 or NaN)
    expect(isPendingCorporateEvent({ eventId: "e1", date: 123, type: "split", ratio: 0 })).toBe(false);
    expect(isPendingCorporateEvent({ eventId: "e1", date: 123, type: "split", ratio: -1 })).toBe(false);
    expect(isPendingCorporateEvent({ eventId: "e1", date: 123, type: "split", ratio: NaN })).toBe(false);
  });
});
