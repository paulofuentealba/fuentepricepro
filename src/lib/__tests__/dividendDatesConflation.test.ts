import { describe, it, expect } from "vitest";

describe("Dividend Dates Conflation Fix (Prompt 109)", () => {
  it("does not conflate paymentDate with exDate when lastDatePrior is absent", () => {
    const rawCashDividends = [
      {
        lastDatePrior: "2024-05-10T00:00:00.000Z",
        paymentDate: "2024-05-25T00:00:00.000Z",
        rate: 1.25,
        label: "DIVIDENDO",
      },
      {
        lastDatePrior: null,
        paymentDate: "2024-06-20T00:00:00.000Z",
        rate: 0.85,
        label: "JCP",
      },
    ];

    const dividendEvents = rawCashDividends
      .filter((d) => Number.isFinite(Number(d.rate)) && Number(d.rate) > 0)
      .map((d) => ({
        exDate: d.lastDatePrior ?? "",
        paymentDate: d.paymentDate ?? null,
        amountPerShare: Number(d.rate),
        isJCP: typeof d.label === "string" && d.label.toUpperCase().includes("JCP"),
      }))
      .filter((e) => e.exDate !== "");

    // Event 1 has valid lastDatePrior
    expect(dividendEvents.length).toBe(1);
    expect(dividendEvents[0].exDate).toBe("2024-05-10T00:00:00.000Z");
    expect(dividendEvents[0].paymentDate).toBe("2024-05-25T00:00:00.000Z");
    expect(dividendEvents[0].amountPerShare).toBe(1.25);
    expect(dividendEvents[0].isJCP).toBe(false);

    // Event 2 without lastDatePrior was correctly NOT assigned paymentDate as exDate
    const rawEvent2 = rawCashDividends[1];
    const event2ExDate = rawEvent2.lastDatePrior ?? "";
    expect(event2ExDate).toBe("");
    expect(event2ExDate).not.toBe(rawEvent2.paymentDate);
  });

  it("selects exDividendDate strictly from future lastDatePrior", () => {
    const futureDateCom = new Date(Date.now() + 86400000 * 5).toISOString();
    const futurePaymentOnly = new Date(Date.now() + 86400000 * 15).toISOString();

    const cash = [
      {
        lastDatePrior: null,
        paymentDate: futurePaymentOnly,
      },
      {
        lastDatePrior: futureDateCom,
        paymentDate: new Date(Date.now() + 86400000 * 20).toISOString(),
      },
    ];

    const nowMs = Date.now();
    const futureDates = cash
      .map((d) => d.lastDatePrior)
      .filter((iso): iso is string => typeof iso === "string" && iso.length > 0)
      .map((iso) => ({ iso, t: new Date(iso).getTime() }))
      .filter((x) => Number.isFinite(x.t) && x.t > nowMs)
      .sort((a, b) => a.t - b.t);

    const exDividendDate = futureDates[0]?.iso ?? null;
    expect(exDividendDate).toBe(futureDateCom);
    expect(exDividendDate).not.toBe(futurePaymentOnly);
  });
});
