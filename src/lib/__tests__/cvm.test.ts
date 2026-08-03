import { describe, it, expect } from "vitest";
import { fetchCvmEnrichedFacts } from "../api/cvm.server";

describe("cvm.server", () => {
  it("returns pre-populated VPA, LPA and vacancy from local cache fallback", async () => {
    const taee = await fetchCvmEnrichedFacts("TAEE11");
    expect(taee.vpa).toBeCloseTo(7.3624, 2);
    expect(taee.lpa).toBeCloseTo(1.5287, 2);

    const hglg = await fetchCvmEnrichedFacts("HGLG11");
    expect(hglg.vacancy).toBeCloseTo(3.28, 1);
  });

  it("returns null for tickers not present in CVM data", async () => {
    const fake = await fetchCvmEnrichedFacts("UNKNOWN_TICKER_999");
    expect(fake.vpa).toBeNull();
    expect(fake.lpa).toBeNull();
    expect(fake.vacancy).toBeNull();
  });

  it("returns null vacancy for paper FIIs without physical real estate", async () => {
    const afhi = await fetchCvmEnrichedFacts("AFHI11");
    expect(afhi.vacancy).toBeNull();

    const mxrf = await fetchCvmEnrichedFacts("MXRF11");
    expect(mxrf.vacancy).toBeNull();
  });
});
