import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchReconciledCorporateEvents,
  scanBatchCorporateEvents,
  persistCorporateEventsToFirestore,
  getCorporateEventsFromFirestore,
} from "../corporateEventsScan.server";
import * as httpModule from "../http.server";
import * as adminModule from "../../../integrations/firebase/admin";

vi.mock("../../../integrations/firebase/admin", () => ({
  getAdminFirestore: vi.fn(),
}));

describe("corporateEventsScan.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reconciles events for a B3 ticker when Yahoo and Brapi both return splits", async () => {
    const baseDate = new Date("2024-05-24T12:00:00Z").getTime();

    // Mock Yahoo fetch
    vi.spyOn(httpModule, "fetchWithRetry").mockImplementation(async (url: string) => {
      if (url.includes("yahoo.com")) {
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  events: {
                    splits: {
                      "1": { date: baseDate / 1000, numerator: 1, denominator: 10 },
                    },
                  },
                },
              ],
            },
          }),
        } as any;
      }
      if (url.includes("brapi.dev")) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                dividendsData: {
                  stockDividends: [
                    {
                      label: "GRUPAMENTO",
                      factor: 0.1,
                      lastDatePrior: "2024-05-24T03:00:00.000Z",
                    },
                  ],
                },
              },
            ],
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const events = await fetchReconciledCorporateEvents("MGLU3", 0);

    expect(events).toHaveLength(1);
    expect(events[0].confidence).toBe("confirmed");
    expect(events[0].type).toBe("grouping");
    expect(events[0].ratio).toBe(0.1);
    expect(events[0].sources).toEqual(["yahoo", "brapi"]);
  });

  it("persists corporate events idempotently via Firestore Admin SDK", async () => {
    const mockSet = vi.fn().mockResolvedValue(undefined);
    const mockDoc = vi.fn().mockReturnValue({ set: mockSet });
    const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

    vi.mocked(adminModule.getAdminFirestore).mockReturnValue({
      collection: mockCollection,
    } as any);

    const success = await persistCorporateEventsToFirestore("MGLU3", [
      {
        eventId: "mglu3_20240524_grouping_0.1",
        ticker: "MGLU3",
        type: "grouping",
        ratio: 0.1,
        date: 1716508800000,
        effectiveDate: "2024-05-24",
        confidence: "confirmed",
        sources: ["yahoo", "brapi"],
      },
    ]);

    expect(success).toBe(true);
    expect(mockCollection).toHaveBeenCalledWith("corporateEvents");
    expect(mockDoc).toHaveBeenCalledWith("MGLU3");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "MGLU3",
        events: expect.any(Array),
      }),
      { merge: true },
    );
  });

  it("reads stored corporate events from Firestore public collection", async () => {
    const mockData = {
      ticker: "PETR4",
      events: [
        {
          eventId: "petr4_20240524_split_4",
          ticker: "PETR4",
          type: "split",
          ratio: 4,
          date: 1716508800000,
          effectiveDate: "2024-05-24",
          confidence: "confirmed",
          sources: ["yahoo", "brapi"],
        },
      ],
      updatedAt: Date.now(),
    };

    const mockGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });
    const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
    const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

    vi.mocked(adminModule.getAdminFirestore).mockReturnValue({
      collection: mockCollection,
    } as any);

    const result = await getCorporateEventsFromFirestore("PETR4");

    expect(result).toHaveLength(1);
    expect(result?.[0].eventId).toBe("petr4_20240524_split_4");
    expect(result?.[0].confidence).toBe("confirmed");
  });
});
