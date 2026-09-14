import { describe, it, expect } from "vitest";
import {
  reconcileCorporateEvents,
  generateEventId,
  type RawCorporateEvent,
} from "../corporateEventsReconciler.server";

describe("corporateEventsReconciler", () => {
  it("generates deterministic eventId", () => {
    const id1 = generateEventId("PETR4", 1716508800000, "split", 4);
    const id2 = generateEventId("petr4", 1716508800000, "split", 4.0);
    expect(id1).toBe(id2);
    expect(id1).toContain("petr4");
    expect(id1).toContain("split");
  });

  it("marks event as confirmed (Fast-Path) when 2 sources agree on type and ratio within 5 days", () => {
    const baseDate = new Date("2024-05-24T12:00:00Z").getTime();
    const yahooEvents: RawCorporateEvent[] = [
      {
        source: "yahoo",
        type: "grouping",
        ratio: 0.1,
        date: baseDate,
      },
    ];
    const brapiEvents: RawCorporateEvent[] = [
      {
        source: "brapi",
        type: "grouping",
        ratio: 0.1,
        date: baseDate - 24 * 60 * 60 * 1000, // 1 day earlier (Data COM)
      },
    ];

    const result = reconcileCorporateEvents("MGLU3", yahooEvents, brapiEvents);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe("confirmed");
    expect(result[0].sources).toEqual(["yahoo", "brapi"]);
    expect(result[0].type).toBe("grouping");
    expect(result[0].ratio).toBe(0.1);
    expect(result[0].rawDetails?.yahoo).toBeDefined();
    expect(result[0].rawDetails?.brapi).toBeDefined();
  });

  it("marks event as divergent (Slow-Path) when ratio differs between sources", () => {
    const baseDate = new Date("2024-05-24T12:00:00Z").getTime();
    const yahooEvents: RawCorporateEvent[] = [
      { source: "yahoo", type: "split", ratio: 4, date: baseDate },
    ];
    const brapiEvents: RawCorporateEvent[] = [
      { source: "brapi", type: "split", ratio: 2, date: baseDate },
    ];

    const result = reconcileCorporateEvents("PETR4", yahooEvents, brapiEvents);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe("divergent");
    expect(result[0].sources).toEqual(["yahoo", "brapi"]);
  });

  it("marks event as divergent (Slow-Path) when type differs between sources", () => {
    const baseDate = new Date("2024-05-24T12:00:00Z").getTime();
    const yahooEvents: RawCorporateEvent[] = [
      { source: "yahoo", type: "split", ratio: 4, date: baseDate },
    ];
    const brapiEvents: RawCorporateEvent[] = [
      { source: "brapi", type: "grouping", ratio: 0.25, date: baseDate },
    ];

    const result = reconcileCorporateEvents("PETR4", yahooEvents, brapiEvents);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe("divergent");
  });

  it("marks event as single_source (Slow-Path) when only Yahoo has it", () => {
    const baseDate = new Date("2024-05-24T12:00:00Z").getTime();
    const yahooEvents: RawCorporateEvent[] = [
      { source: "yahoo", type: "split", ratio: 2, date: baseDate },
    ];

    const result = reconcileCorporateEvents("AAPL", yahooEvents, []);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe("single_source");
    expect(result[0].sources).toEqual(["yahoo"]);
  });

  it("marks event as single_source (Slow-Path) when only Brapi has it", () => {
    const baseDate = new Date("2024-05-24T12:00:00Z").getTime();
    const brapiEvents: RawCorporateEvent[] = [
      { source: "brapi", type: "split", ratio: 3, date: baseDate },
    ];

    const result = reconcileCorporateEvents("VALE3", [], brapiEvents);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe("single_source");
    expect(result[0].sources).toEqual(["brapi"]);
  });

  it("treats events as separate single_source events if dates are more than 5 days apart", () => {
    const date1 = new Date("2024-05-01T12:00:00Z").getTime();
    const date2 = new Date("2024-05-20T12:00:00Z").getTime(); // 19 days apart
    const yahooEvents: RawCorporateEvent[] = [
      { source: "yahoo", type: "split", ratio: 2, date: date1 },
    ];
    const brapiEvents: RawCorporateEvent[] = [
      { source: "brapi", type: "split", ratio: 2, date: date2 },
    ];

    const result = reconcileCorporateEvents("B3SA3", yahooEvents, brapiEvents);

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.confidence === "single_source")).toBe(true);
  });
});
