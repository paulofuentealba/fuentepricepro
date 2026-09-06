// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AssetDeepDiveView } from "../AssetDeepDiveView";
import { TooltipProvider } from "@/components/ui/tooltip";
import { dict } from "@/lib/i18n";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

let mockValuedItems: ValuedWatchlistItem[] = [];

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: dict.ptBR,
    locale: "ptBR",
  }),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockValuedItems,
    fx: { USDBRL: 5.6 },
  }),
}));

const mockSettings = {
  targetYield: 6,
  classTargetYields: {
    STOCK_BR: 6.0,
    FII: 8.5,
    FIAGRO: 10.0,
    FII_INFRA: 9.0,
    STOCK_US: 4.0,
    REIT: 5.5,
    ETF: 4.0,
    ETF_US: 3.5,
  },
  displayCurrency: "BRL",
};

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: mockSettings,
    updateSettings: vi.fn().mockResolvedValue(undefined),
  }),
}));

let mockAssetData: any = null;

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: mockAssetData,
      isLoading: false,
      isPending: false,
      isError: false,
    }),
  };
});

describe("AssetDeepDiveView (Raio-X Aprofundado do Ativo)", () => {
  beforeEach(() => {
    mockValuedItems = [];
    mockAssetData = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all 8 representative category chips", () => {
    render(
      <TooltipProvider>
        <AssetDeepDiveView initialTicker="BBAS3" />
      </TooltipProvider>,
    );

    expect(screen.getAllByText("BBAS3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
    expect(screen.getByText("RURA11")).toBeInTheDocument();
    expect(screen.getByText("JURO11")).toBeInTheDocument();
    expect(screen.getByText("KO")).toBeInTheDocument();
    expect(screen.getByText("O")).toBeInTheDocument();
    expect(screen.getByText("IVVB11")).toBeInTheDocument();
    expect(screen.getByText("SCHD")).toBeInTheDocument();
  });

  it("renders 360° Hero Card with Preço Teto, Margem and Action badge for default asset", () => {
    render(
      <TooltipProvider>
        <AssetDeepDiveView initialTicker="BBAS3" />
      </TooltipProvider>,
    );

    // Hero title & ticker
    expect(screen.getAllByText(/BBAS3/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Preço Teto Fuente/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Margem de Segurança/i).length).toBeGreaterThanOrEqual(1);

    // Verdict Action Badge
    expect(screen.getByText(/APORTE FORTE/i)).toBeInTheDocument();
  });

  it("switches to another asset (e.g. HGLG11) when its chip is clicked", () => {
    render(
      <TooltipProvider>
        <AssetDeepDiveView initialTicker="BBAS3" />
      </TooltipProvider>,
    );

    // Click HGLG11 chip
    const hglgChip = screen.getByText("HGLG11");
    fireEvent.click(hglgChip);

    // Should now display HGLG11 content
    expect(screen.getAllByText(/HGLG11/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/CSHG Logística FII/i)).toBeInTheDocument();
  });

  it("renders the 4 consensus models (Bazin, Graham, Gordon, Peter Lynch)", () => {
    render(
      <TooltipProvider>
        <AssetDeepDiveView initialTicker="BBAS3" />
      </TooltipProvider>,
    );

    expect(screen.getAllByText(/Décio Bazin/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Benjamin Graham/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Gordon/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Peter Lynch/i).length).toBeGreaterThanOrEqual(1);
  });

  it("dynamically recalculates Bazin ceiling price when slider moves", () => {
    render(
      <TooltipProvider>
        <AssetDeepDiveView initialTicker="BBAS3" />
      </TooltipProvider>,
    );

    // Initial Bazin ceiling for BBAS3 (Div 2.04 / 0.06 = R$ 34,00)
    expect(screen.getAllByText(/34,00/).length).toBeGreaterThanOrEqual(1);

    // Sliders: first range input is Bazin Yield
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThanOrEqual(3);

    // Move slider to 10.0% (2.04 / 0.10 = R$ 20,40)
    fireEvent.change(sliders[0], { target: { value: "10.0" } });

    expect(screen.getAllByText(/20,40/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Minha Posição em Carteira and Passaporte Fiscal sections", () => {
    render(
      <TooltipProvider>
        <AssetDeepDiveView initialTicker="BBAS3" />
      </TooltipProvider>,
    );

    expect(screen.getByText(/Minha Posição em Carteira/i)).toBeInTheDocument();
    expect(screen.getByText(/Passaporte Fiscal do Ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/REGIME TRIBUTÁRIO & COMPLIANCE/i)).toBeInTheDocument();
  });

  it("hides the 8 category cards and search bar when mode='modal'", () => {
    render(
      <TooltipProvider>
        <AssetDeepDiveView initialTicker="BBAS3" mode="modal" />
      </TooltipProvider>,
    );

    // 8 categories bar should NOT be rendered
    expect(screen.queryByText(/8 classes mapeadas/i)).toBeNull();
    expect(screen.queryByText("HGLG11")).toBeNull();

    // Search bar and quick chips should NOT be rendered
    expect(screen.queryByPlaceholderText(/Buscar qualquer ticker/i)).toBeNull();
    expect(screen.queryByText(/Na sua carteira:/i)).toBeNull();

    // The asset's deep dive data SHOULD be rendered directly
    expect(screen.getAllByText(/BBAS3/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Preço Teto Fuente/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Minha Posição em Carteira/i)).toBeInTheDocument();
  });

  it("renders non-representative asset like ITSA4 with exDividendDate without throwing (ptBR date formatting regression)", () => {
    mockAssetData = {
      ticker: "ITSA4",
      name: "Itaúsa S.A.",
      currentPrice: 10.45,
      exDividendDate: "2024-04-15",
      type: "STOCK_BR",
      currency: "BRL",
    };

    render(
      <TooltipProvider>
        <AssetDeepDiveView initialTicker="ITSA4" />
      </TooltipProvider>,
    );

    expect(screen.getAllByText(/ITSA4/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\/04\/2024/)).toBeInTheDocument();
  });
});
