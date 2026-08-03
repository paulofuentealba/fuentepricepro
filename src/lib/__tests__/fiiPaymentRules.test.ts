import { describe, expect, it } from "vitest";
import { estimatePaymentDate, FII_PAYMENT_RULES } from "../fiiPaymentRules";

describe("fiiPaymentRules", () => {
  it("has exactly 10 confirmed liquid FII rules", () => {
    const tickers = Object.keys(FII_PAYMENT_RULES);
    expect(tickers).toHaveLength(10);
    expect(tickers).toEqual([
      "HGLG11",
      "MXRF11",
      "KNRI11",
      "XPLG11",
      "VISC11",
      "KNCR11",
      "AFHI11",
      "CPTS11",
      "ALZR11",
      "BTLG11",
    ]);
  });

  it("estimates payment date for HGLG11 (reference month = Aug 2024 -> payment = Sept 13, 2024)", () => {
    const refDate = new Date(Date.UTC(2024, 7, 31)); // Aug 31, 2024
    const est = estimatePaymentDate("HGLG11", refDate);
    expect(est).toBe("2024-09-13");
  });

  it("estimates payment date for BTLG11 (reference month = Aug 2024 -> payment = Sept 25, 2024)", () => {
    const refDate = new Date(Date.UTC(2024, 7, 31)); // Aug 31, 2024
    const est = estimatePaymentDate("BTLG11", refDate);
    expect(est).toBe("2024-09-25");
  });

  it("estimates payment date for BTLG11 with weekend postponement (reference month = Jul 2024 -> payment = Aug 26, 2024)", () => {
    const refDate = new Date(Date.UTC(2024, 6, 31)); // Jul 31, 2024 -> Aug 25 is Sunday -> Aug 26
    const est = estimatePaymentDate("BTLG11", refDate);
    expect(est).toBe("2024-08-26");
  });

  it("returns null for unmapped FII ticker", () => {
    const refDate = new Date(Date.UTC(2024, 7, 31));
    const est = estimatePaymentDate("UNKNOWN11", refDate);
    expect(est).toBeNull();
  });

  it("handles .SA suffix gracefully", () => {
    const refDate = new Date(Date.UTC(2024, 7, 31));
    const est = estimatePaymentDate("HGLG11.SA", refDate);
    expect(est).toBe("2024-09-13");
  });
});
