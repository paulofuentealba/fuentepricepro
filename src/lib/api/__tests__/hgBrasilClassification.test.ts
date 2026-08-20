import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  fetchHgBrasilClassification,
  mapHgItemToAssetType,
  clearClassificationMemoryCache,
  ASSET_CLASSIFICATION_CACHE_TTL_MS,
  type HgBrasilTickerItem,
} from "../hgBrasilClassification.server";
import { classifyBrAsync } from "../classify.server";
import * as adminModule from "../../../integrations/firebase/admin";
import * as ingestionLogModule from "../ingestionLog.server";

describe("HG Brasil Asset Classification & Mapping", () => {
  const originalKey = process.env.HGBRASIL_API_KEY;

  beforeEach(() => {
    clearClassificationMemoryCache();
    process.env.HGBRASIL_API_KEY = "test_api_key";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.HGBRASIL_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  describe("mapHgItemToAssetType unit mapping logic", () => {
    it("maps all 10 verified FIAGROs (kind === 'fiagro') to FIAGRO", () => {
      const fiagros: Array<{ symbol: string; name: string; full_name: string }> = [
        { symbol: "FGAA11", name: "Fiagro Fga", full_name: "FG/Agro Fundo de Investimento FIagro Imobiliário" },
        { symbol: "KNCA11", name: "Fiagro Kinea", full_name: "Kinea Crédito Agro FIagro Imobiliário" },
        { symbol: "VGIA11", name: "Fiagro Vgia", full_name: "Valora Cra Fundo Investimento Nas Cad Prod Agro Fiagro Imobiliario" },
        { symbol: "RZAG11", name: "Fiagro Riza", full_name: "Fundo Investimento Cadeias Prod Agro Riza Agro Fiagro Imobiliario" },
        { symbol: "AAZQ11", name: "Fiagro Aazq", full_name: "Az Quest Sole Fundo De Investimento Fiagro Imobiliario" },
        { symbol: "SNAG11", name: "Fiagro Suno", full_name: "Suno Agro FIagro Imobiliário" },
        { symbol: "RURA11", name: "Fiagro Rura", full_name: "Itaú Asset Rural FIagro Imobiliário" },
        { symbol: "XPCA11", name: "Fiagro XP Ca", full_name: "XP Crédito Agrícola Fundo de Investimento FIagro Imobiliário" },
        { symbol: "CPTR11", name: "Fiagro Cptr", full_name: "Capitania Agro Strategies FIagro Imobiliário" },
        { symbol: "JGPX11", name: "Fiagro Jgp", full_name: "Fundo Investimento Cadeias Prod Agroind Jgp Cred Fiagro Imobiliario" },
      ];

      for (const item of fiagros) {
        const raw: HgBrasilTickerItem = {
          ticker: `B3:${item.symbol}`,
          kind: "fiagro",
          symbol: item.symbol,
          name: item.name,
          full_name: item.full_name,
          classification: { sector: "FIAgro" },
        };
        expect(mapHgItemToAssetType(raw, item.symbol)).toBe("FIAGRO");
      }
    });

    it("maps 5 verified FII_INFRA (kind === 'fund' + infra keyword) to FII_INFRA", () => {
      const infras: Array<{ symbol: string; name: string; full_name: string }> = [
        { symbol: "KDIF11", name: "Kinea Infraf", full_name: "Kinea Infra Fundo Investimento Cotas Fundo Inc Investimento Inf Rf Cp" },
        { symbol: "JURO11", name: "Sparta Infra", full_name: "Sparta Infra Fic Fi Infra Renda Fixa Cp" },
        { symbol: "BDIF11", name: "BTG Pactual Dívida Infra FIC Fundo Inc IE RF CP", full_name: "BTG Pactual Dívida Infra FIC Fundo Inc IE RF CP" },
        { symbol: "CPTI11", name: "Capitânia Infra FIC FII", full_name: "Capitnia Infra Fundo Investimento Fundo Ie Rf Cred Priv" },
        { symbol: "CDII11", name: "Sparta Cdii", full_name: "Sparta Infra Cdi Fic Fi Infra Renda Fixa Cp" },
      ];

      for (const item of infras) {
        const raw: HgBrasilTickerItem = {
          ticker: `B3:${item.symbol}`,
          kind: "fund", // Verified: Real B3/HG Brasil taxonomy returns 'fund' for FI-Infras
          symbol: item.symbol,
          name: item.name,
          full_name: item.full_name,
          classification: { sector: "Indefinido" },
        };
        expect(mapHgItemToAssetType(raw, item.symbol)).toBe("FII_INFRA");
      }
    });

    it("correctly classifies BTRA11 and RZTR11 as FII (kind === 'fii') despite agricultural sector classification", () => {
      const btra: HgBrasilTickerItem = {
        ticker: "B3:BTRA11",
        kind: "fii",
        symbol: "BTRA11",
        name: "FII BTG Tagr",
        full_name: "Fundo Investimento Imobiliario BTG Pactual Terras Agrcolas",
        classification: { sector: "FIAgro" },
      };
      expect(mapHgItemToAssetType(btra, "BTRA11")).toBe("FII");

      const rztr: HgBrasilTickerItem = {
        ticker: "B3:RZTR11",
        kind: "fii",
        symbol: "RZTR11",
        name: "FII Riza Tx",
        full_name: "Fundo de Investimento Imobiliário Riza Terrax",
        classification: { sector: "Misto" },
      };
      expect(mapHgItemToAssetType(rztr, "RZTR11")).toBe("FII");
    });

    it("maps traditional FIIs (kind === 'fii') to FII", () => {
      const fiis = ["HGLG11", "HGBS11", "MXRF11", "BTLG11", "XPML11"];
      for (const symbol of fiis) {
        const raw: HgBrasilTickerItem = {
          ticker: `B3:${symbol}`,
          kind: "fii",
          symbol,
          name: `FII ${symbol}`,
          full_name: `FII ${symbol} Real Estate Fund`,
          classification: { sector: "Logística" },
        };
        expect(mapHgItemToAssetType(raw, symbol)).toBe("FII");
      }
    });

    it("maps stocks and units (kind === 'stock') to STOCK_BR", () => {
      const stocks = ["TAEE11", "PETR4", "VALE3", "SAPR11", "KLBN11"];
      for (const symbol of stocks) {
        const raw: HgBrasilTickerItem = {
          ticker: `B3:${symbol}`,
          kind: "stock",
          symbol,
          name: symbol,
          full_name: `${symbol} S.A.`,
          classification: { sector: "Energia" },
        };
        expect(mapHgItemToAssetType(raw, symbol)).toBe("STOCK_BR");
      }
    });

    it("maps ETFs (kind === 'etf') to ETF", () => {
      const etfs = ["BOVA11", "IVVB11", "SMAL11", "LFTS11"];
      for (const symbol of etfs) {
        const raw: HgBrasilTickerItem = {
          ticker: `B3:${symbol}`,
          kind: "etf",
          symbol,
          name: symbol,
          full_name: `iShares ${symbol} ETF`,
        };
        expect(mapHgItemToAssetType(raw, symbol)).toBe("ETF");
      }
    });

    it("maps BDRs (kind === 'bdr') to STOCK_US", () => {
      const raw: HgBrasilTickerItem = {
        ticker: "B3:AAPL34",
        kind: "bdr",
        symbol: "AAPL34",
        name: "Apple Inc BDR",
        full_name: "Apple Inc. BDR",
      };
      expect(mapHgItemToAssetType(raw, "AAPL34")).toBe("STOCK_US");
    });

    it("logs a telemetry WARNING and falls back to FII when kind is 'fund' without 'infra' keyword", () => {
      const reportSpy = vi.spyOn(ingestionLogModule, "reportIngestionStatus");

      const unknownFund: HgBrasilTickerItem = {
        ticker: "B3:XYZF11",
        kind: "fund",
        symbol: "XYZF11",
        name: "XYZ Special Opportunities Fund",
        full_name: "XYZ Fundo de Investimento em Participacoes",
        classification: { sector: "Indefinido" },
      };

      const result = mapHgItemToAssetType(unknownFund, "XYZF11");
      expect(result).toBe("FII");
      expect(reportSpy).toHaveBeenCalledWith(
        "hgBrasil",
        "WARNING",
        "Fund kind fell back to FII without infra keyword",
        "XYZF11",
      );
    });
  });

  describe("fetchHgBrasilClassification 3-Layer Caching & API Integration", () => {
    it("returns from memory cache on second call without fetching remote API or Firestore", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { key_status: "valid" },
          results: [
            {
              ticker: "B3:FGAA11",
              kind: "fiagro",
              symbol: "FGAA11",
              name: "Fiagro Fga",
              full_name: "FG/Agro Fundo de Investimento FIagro Imobiliário",
            },
          ],
        }),
      } as any);

      // Disable Admin Firestore for pure memory test
      vi.spyOn(adminModule, "getAdminFirestore").mockReturnValue(null as any);

      const first = await fetchHgBrasilClassification("FGAA11", "test_key");
      expect(first).toBe("FIAGRO");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call must hit memory cache (0 network requests)
      const second = await fetchHgBrasilClassification("FGAA11", "test_key");
      expect(second).toBe("FIAGRO");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("reads from Firestore cache (Layer 2) if memory cache is cold and document is not expired", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const mockDocSnap = {
        exists: true,
        data: () => ({
          ticker: "KDIF11",
          type: "FII_INFRA",
          kind: "fund",
          cachedAt: Date.now() - 1000, // Fresh (1s ago)
          expiresAt: Date.now() + ASSET_CLASSIFICATION_CACHE_TTL_MS,
        }),
      };

      const mockDb = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockDocSnap),
          }),
        }),
      };

      vi.spyOn(adminModule, "getAdminFirestore").mockReturnValue(mockDb as any);

      const result = await fetchHgBrasilClassification("KDIF11", "test_key");
      expect(result).toBe("FII_INFRA");
      // Must not hit remote fetch
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("writes to Firestore cache (Layer 2) when fetching from remote API", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { key_status: "valid" },
          results: [
            {
              ticker: "B3:TAEE11",
              kind: "stock",
              symbol: "TAEE11",
              name: "Taesa",
              full_name: "Transmissora Aliança de Energia Elétrica S.A.",
            },
          ],
        }),
      } as any);

      const setMock = vi.fn().mockResolvedValue({});
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
            set: setMock,
          }),
        }),
      };

      vi.spyOn(adminModule, "getAdminFirestore").mockReturnValue(mockDb as any);

      const result = await fetchHgBrasilClassification("TAEE11", "test_key");
      expect(result).toBe("STOCK_BR");
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: "TAEE11",
          type: "STOCK_BR",
          kind: "stock",
        }),
        { merge: true },
      );
    });
  });

  describe("classifyBrAsync Fallback Resilience", () => {
    it("uses canonical HG Brasil result when available", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              ticker: "B3:VGIA11",
              kind: "fiagro",
              symbol: "VGIA11",
              name: "Fiagro Vgia",
              full_name: "Valora Cra Fundo Investimento Fiagro Imobiliario",
            },
          ],
        }),
      } as any);

      vi.spyOn(adminModule, "getAdminFirestore").mockReturnValue(null as any);

      const type = await classifyBrAsync("VGIA11");
      expect(type).toBe("FIAGRO");
    });

    it("falls back gracefully to local heuristic classifyBr if HG Brasil fetch fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));
      vi.spyOn(adminModule, "getAdminFirestore").mockReturnValue(null as any);

      // TAEE is in B3_STOCK_UNIT_PREFIXES -> classifyBr returns STOCK_BR
      const stockUnit = await classifyBrAsync("TAEE11");
      expect(stockUnit).toBe("STOCK_BR");

      // HGLG not in B3_STOCK_UNIT_PREFIXES -> classifyBr returns FII
      const fiiFallback = await classifyBrAsync("HGLG11");
      expect(fiiFallback).toBe("FII");
    });
  });
});
