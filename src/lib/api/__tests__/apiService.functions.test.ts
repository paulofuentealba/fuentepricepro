import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAssetFn } from "../../apiService.functions";
import * as brapiServer from "../brapi.server";
import * as yahooServer from "../yahoo.server";
import * as hgBrasilServer from "../hgBrasil.server";
import * as dmServer from "../dadosDeMercadoScraper.server";
import * as assetCacheServer from "../assetCache.server";
import type { ApiAsset } from "../types";

vi.mock("../brapi.server");
vi.mock("../yahoo.server");
vi.mock("../hgBrasil.server");
vi.mock("../dadosDeMercadoScraper.server");
vi.mock("../assetCache.server");

vi.mock("@tanstack/react-start", () => {
  return {
    createServerFn: () => {
      const builder = {
        validator: () => builder,
        handler: (fn: any) => fn
      };
      return builder;
    }
  };
});

const createMockAsset = (ticker: string, partial: Partial<ApiAsset> = {}): ApiAsset => ({
  ticker,
  name: `Mock ${ticker}`,
  type: "FII",
  currency: "BRL",
  currentPrice: 100,
  dividends3y: [10, 10, 10],
  dividendHistory: [{ year: 2024, amount: 10 }],
  exDividendDate: null,
  epsCurrent: null,
  epsNext: null,
  paymentMonths: [1],
  sector: "Real Estate",
  dividendEvents: [
    { exDate: "2024-01-01T00:00:00.000Z", paymentDate: null, amountPerShare: 1, isJCP: false },
  ],
  metrics: {
    peRatio: 10,
    pbRatio: 1,
    eps: null,
    bvps: null,
    roe: null,
    currentDy: 10,
    capRate: null,
    vacancy: null,
    expenseRatio: null,
    aum: null,
    trackingError: null,
    payoutRatio: null,
    dividendCagr5y: null,
  },
  ...partial,
});

describe("apiService.functions (BR Enrichment Fallback)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Ensure cache always misses so we hit the fallback logic
    vi.mocked(assetCacheServer.getCachedAsset).mockResolvedValue(null);
  });

  it("Case 1: Brapi Success + HG Brasil Data", async () => {
    vi.mocked(dmServer.fetchDadosDeMercado).mockResolvedValue(null);
    const assetBase = createMockAsset("ALZR11", {
      dividendEvents: [{ exDate: "2024-01-01", paymentDate: null, amountPerShare: 0.5, isJCP: false }],
    });
    vi.mocked(brapiServer.fetchFromBrapi).mockResolvedValue(assetBase);
    
    vi.mocked(hgBrasilServer.fetchHgBrasilDividends).mockResolvedValue({
      ticker: "ALZR11",
      dividends: [
        { type: "income", amount: 1.23, approvedDate: "2024-02-15", paymentDate: "2024-02-25" },
      ],
    });

    const res = await fetchAssetFn({ data: { ticker: "ALZR11" } });
    
    // Dividend events should be overwritten by HG Brasil
    expect(res.dividendEvents).toHaveLength(1);
    expect(res.dividendEvents[0].amountPerShare).toBe(1.23);
    expect(res.dividendEvents[0].exDate).toBe("2024-02-15");
    expect(res.dividendEvents[0].paymentDate).toBe("2024-02-25"); // directly from HG Brasil
  });

  it("Case 2: Brapi Fail (403) + HG Brasil Data (AFHI11 bug)", async () => {
    vi.mocked(dmServer.fetchDadosDeMercado).mockResolvedValue(null);
    // Brapi returns null due to 403
    vi.mocked(brapiServer.fetchFromBrapi).mockResolvedValue(null);
    
    // Yahoo fallback provides synthetic data
    const yahooBase = createMockAsset("AFHI11", {
      dividendEvents: [{ exDate: "2026-06-16T13:00:00.000Z", paymentDate: null, amountPerShare: 1.03, isJCP: false }],
    });
    vi.mocked(yahooServer.fetchFromYahoo).mockResolvedValue(yahooBase);
    
    // HG Brasil has the real data
    vi.mocked(hgBrasilServer.fetchHgBrasilDividends).mockResolvedValue({
      ticker: "AFHI11",
      dividends: [
        { type: "income", amount: 1.00, approvedDate: "2026-08-14", paymentDate: "2026-08-21" },
      ],
    });

    const res = await fetchAssetFn({ data: { ticker: "AFHI11" } });
    
    // The events must come from HG Brasil, NOT Yahoo
    expect(res.dividendEvents).toHaveLength(1);
    expect(res.dividendEvents[0].amountPerShare).toBe(1.00);
    expect(res.dividendEvents[0].exDate).toBe("2026-08-14");
    expect(res.dividendEvents[0].paymentDate).toBe("2026-08-21");
  });

  it("Case 3: Brapi Fail + HG Empty + DM Data", async () => {
    vi.mocked(brapiServer.fetchFromBrapi).mockResolvedValue(null);
    const yahooBase = createMockAsset("XPML11", {
      dividendEvents: [{ exDate: "2026-01-01", paymentDate: null, amountPerShare: 0.1, isJCP: false }],
      metrics: {
        ...createMockAsset("XPML11").metrics,
        pbRatio: null,
        peRatio: null,
      }
    });
    vi.mocked(yahooServer.fetchFromYahoo).mockResolvedValue(yahooBase);
    
    vi.mocked(hgBrasilServer.fetchHgBrasilDividends).mockResolvedValue(null);
    
    vi.mocked(dmServer.fetchDadosDeMercado).mockResolvedValue({
      dividendEvents: [
        { exDate: "2026-02-15", paymentDate: "2026-02-25", amountPerShare: 0.99, isJCP: false },
      ],
      fundamentals: {
        pvp: 1.05,
        pl: 12,
        dy: 11,
        roe: 15,
      }
    });

    const res = await fetchAssetFn({ data: { ticker: "XPML11" } });
    
    // Events must come from DM
    expect(res.dividendEvents).toHaveLength(1);
    expect(res.dividendEvents[0].amountPerShare).toBe(0.99);
    
    // Metrics must be enriched by DM
    expect(res.metrics.pbRatio).toBe(1.05);
    expect(res.metrics.peRatio).toBe(12);
  });

  it("Case 4: Brapi Fail + HG Empty + DM Empty", async () => {
    vi.mocked(brapiServer.fetchFromBrapi).mockResolvedValue(null);
    const yahooBase = createMockAsset("HGLG11", {
      dividendEvents: [{ exDate: "2026-01-01", paymentDate: null, amountPerShare: 1.11, isJCP: false }],
    });
    vi.mocked(yahooServer.fetchFromYahoo).mockResolvedValue(yahooBase);
    
    // Both HG and DM return null
    vi.mocked(hgBrasilServer.fetchHgBrasilDividends).mockResolvedValue(null);
    vi.mocked(dmServer.fetchDadosDeMercado).mockResolvedValue(null);

    const res = await fetchAssetFn({ data: { ticker: "HGLG11" } });
    
    // Fallback to what Yahoo provided natively
    expect(res.dividendEvents).toHaveLength(1);
    expect(res.dividendEvents[0].amountPerShare).toBe(1.11);
    // Since Yahoo provides paymentDate as null, the estimation rule will kick in for HGLG11
    expect(res.dividendEvents[0].paymentDateEstimated).toBe(true);
  });

  it("Case 5: HG Brasil returns real paymentDate -> estimatePaymentDate is not called/does not overwrite", async () => {
    vi.mocked(dmServer.fetchDadosDeMercado).mockResolvedValue(null);
    vi.mocked(brapiServer.fetchFromBrapi).mockResolvedValue(null);
    vi.mocked(yahooServer.fetchFromYahoo).mockResolvedValue(
      createMockAsset("AFHI11", { dividendEvents: [] })
    );
    
    vi.mocked(hgBrasilServer.fetchHgBrasilDividends).mockResolvedValue({
      ticker: "AFHI11",
      dividends: [
        { type: "income", amount: 1.00, approvedDate: "2026-08-14", paymentDate: "2026-08-21" },
      ],
    });

    const res = await fetchAssetFn({ data: { ticker: "AFHI11" } });
    
    expect(res.dividendEvents[0].paymentDate).toBe("2026-08-21"); // Real date kept
    expect(res.dividendEvents[0].paymentDateEstimated).toBeUndefined(); // Not marked as estimated
  });

  it("Case 6: HG Brasil returns paymentDate: null -> estimatePaymentDate fills it and marks as estimated", async () => {
    vi.mocked(dmServer.fetchDadosDeMercado).mockResolvedValue(null);
    vi.mocked(brapiServer.fetchFromBrapi).mockResolvedValue(null);
    vi.mocked(yahooServer.fetchFromYahoo).mockResolvedValue(
      createMockAsset("AFHI11", { dividendEvents: [] })
    );
    
    vi.mocked(hgBrasilServer.fetchHgBrasilDividends).mockResolvedValue({
      ticker: "AFHI11",
      dividends: [
        // Aprovado mas sem data de pagamento definida
        { type: "income", amount: 1.00, approvedDate: "2026-08-14", paymentDate: null as any },
      ],
    });

    const res = await fetchAssetFn({ data: { ticker: "AFHI11" } });
    
    // Will be estimated by the rule engine
    expect(res.dividendEvents[0].paymentDate).toBe("2026-09-15T00:00:00.000Z"); 
    expect(res.dividendEvents[0].paymentDateEstimated).toBe(true);
  });
});
