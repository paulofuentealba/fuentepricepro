import { describe, expect, it, vi } from "vitest";
import { fetchNasdaqDividends } from "../api/nasdaq.server";

describe("nasdaq.server", () => {
  it("returns mapped payment dates for a valid Nasdaq response", async () => {
    const mockJson = {
      data: {
        dividends: {
          rows: [
            {
              exOrEffDate: "08/10/2026",
              paymentDate: "08/13/2026",
              amount: "$0.27",
            },
            {
              exOrEffDate: "05/11/2026",
              paymentDate: "05/14/2026",
              amount: "$0.27",
            },
          ],
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockJson), { status: 200 })
    );

    const map = await fetchNasdaqDividends("AAPL");
    expect(map.size).toBe(2);
    expect(map.get("2026-08-10")).toBe("2026-08-13");
    expect(map.get("2026-05-11")).toBe("2026-05-14");

    vi.restoreAllMocks();
  });

  it("returns empty map gracefully for NYSE stock returning rows: null", async () => {
    const mockJson = {
      data: {
        dividends: {
          rows: null,
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockJson), { status: 200 })
    );

    const map = await fetchNasdaqDividends("O");
    expect(map.size).toBe(0);

    vi.restoreAllMocks();
  });

  it("returns empty map gracefully on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Forbidden", { status: 403 })
    );

    const map = await fetchNasdaqDividends("ERROR_TICKER");
    expect(map.size).toBe(0);

    vi.restoreAllMocks();
  });
});
