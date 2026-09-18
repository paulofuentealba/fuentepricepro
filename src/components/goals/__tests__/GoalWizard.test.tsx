// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { GoalWizard } from "../GoalWizard";
import { dict, type Locale } from "@/lib/i18n";
import type { UserSettings } from "@/lib/useUserSettings";
import type { WatchlistItem } from "@/lib/watchlist";
import { toast } from "sonner";

const currentLocale: Locale = "ptBR";

// Radix Slider requires ResizeObserver in jsdom environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

const mockUpdateSettings = vi.fn();
let currentSettings: UserSettings;

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: currentSettings,
    updateSettings: mockUpdateSettings,
  }),
}));

const mockUpsertManyAsync = vi.fn().mockResolvedValue(undefined);
let mockWatchlistItems: WatchlistItem[] = [];

vi.mock("@/lib/watchlist", () => ({
  useWatchlist: () => ({
    items: mockWatchlistItems,
    upsertManyAsync: mockUpsertManyAsync,
  }),
}));

function createMockItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: "STOCK_BR_PETR4",
    ticker: "PETR4",
    name: "Petrobras PN",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 30,
    annualDividend: 3,
    targetYield: 6,
    ceilingPrice: 50,
    safetyMargin: 66.6,
    quantity: 100,
    averagePrice: 28,
    paymentMonths: [5, 8, 11],
    payoutRatio: 50,
    addedAt: Date.now(),
    investingSince: Date.now(),
    ...overrides,
  };
}

describe("GoalWizard Component", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockWatchlistItems = [];
    currentSettings = {
      targetYield: 6,
      displayCurrency: "BRL",
      smartAllocationTargets: {
        STOCK_BR: 40,
        FII: 30,
        STOCK_US: 10,
        REIT: 10,
        ETF: 10,
        FIXED_INCOME: 0,
      },
      classTargetYields: {
        FII: 8.5,
      },
      maxConcentrationPerAsset: 20,
    };
  });

  it("renders both cards: Metas por classe and Critérios de exclusão", () => {
    render(<GoalWizard />);

    expect(screen.getByText(dict.ptBR.goalWizard.step1Question)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.smartAllocation.exclusionCriteriaTitle)).toBeInTheDocument();
  });

  it("modifying FII yield-alvo (exclusion criteria) updates only classTargetYields and does not alter allocation targets", () => {
    render(<GoalWizard />);

    // In Card 2, find the FII input for classTargetYields
    const fiiYieldInput = screen.getByDisplayValue("8.5") as HTMLInputElement;
    expect(fiiYieldInput).toBeInTheDocument();

    // Change FII yield from 8.5 to 9.5
    fireEvent.change(fiiYieldInput, { target: { value: "9.5" } });

    expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      classTargetYields: {
        FII: 9.5,
      },
    });

    // Verify smartAllocationTargets was NOT included in the patch
    const patch = mockUpdateSettings.mock.calls[0][0];
    expect(patch.smartAllocationTargets).toBeUndefined();
  });

  it("clearing FII yield-alvo removes it from classTargetYields without touching allocation targets", () => {
    render(<GoalWizard />);

    const fiiYieldInput = screen.getByDisplayValue("8.5") as HTMLInputElement;
    fireEvent.change(fiiYieldInput, { target: { value: "" } });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      classTargetYields: {},
    });

    const patch = mockUpdateSettings.mock.calls[0][0];
    expect(patch.smartAllocationTargets).toBeUndefined();
  });

  it("modifying maxConcentrationPerAsset updates only max concentration", () => {
    render(<GoalWizard />);

    const maxConcInput = screen.getByDisplayValue("20") as HTMLInputElement;
    fireEvent.change(maxConcInput, { target: { value: "25" } });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      maxConcentrationPerAsset: 25,
    });
  });

  it("renders checkbox to apply target yield to portfolio for classes with assets, and hides for classes with 0 assets", () => {
    mockWatchlistItems = [
      createMockItem({ id: "1", ticker: "PETR4", type: "STOCK_BR" }),
      createMockItem({ id: "2", ticker: "VALE3", type: "STOCK_BR" }),
      createMockItem({ id: "3", ticker: "HGLG11", type: "FII" }),
    ];

    render(<GoalWizard />);

    const stockBrText = dict.ptBR.goalWizard.applyToClassAssets.replace("{{count}}", "2");
    const fiiText = dict.ptBR.goalWizard.applyToClassAssets.replace("{{count}}", "1");

    expect(screen.getByText(stockBrText)).toBeInTheDocument();
    expect(screen.getByText(fiiText)).toBeInTheDocument();

    // Classes with 0 items shouldn't have checkboxes
    expect(
      screen.queryByText(dict.ptBR.goalWizard.applyToClassAssets.replace("{{count}}", "0")),
    ).not.toBeInTheDocument();
  });

  it("clicking checkbox and saving updates all assets of that class via upsertManyAsync", async () => {
    mockWatchlistItems = [
      createMockItem({
        id: "1",
        ticker: "PETR4",
        type: "STOCK_BR",
        targetYield: 6,
        annualDividend: 2.4,
        currentPrice: 30,
        ceilingPrice: 40,
        safetyMargin: 33.3,
      }),
      createMockItem({
        id: "2",
        ticker: "VALE3",
        type: "STOCK_BR",
        targetYield: 6,
        annualDividend: 4.8,
        currentPrice: 60,
        ceilingPrice: 80,
        safetyMargin: 33.3,
      }),
    ];
    currentSettings.classTargetYields = { STOCK_BR: 8 };

    const onComplete = vi.fn();
    render(<GoalWizard onComplete={onComplete} />);

    const stockBrText = dict.ptBR.goalWizard.applyToClassAssets.replace("{{count}}", "2");
    const label = screen.getByText(stockBrText);
    fireEvent.click(label);

    const finishButton = screen.getByRole("button", {
      name: new RegExp(dict.ptBR.goalWizard.finishBtn),
    });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(mockUpsertManyAsync).toHaveBeenCalledTimes(1);
    });

    const updatedItems = mockUpsertManyAsync.mock.calls[0][0];
    expect(updatedItems).toHaveLength(2);
    expect(updatedItems[0].targetYield).toBe(8);
    expect(updatedItems[0].ceilingPrice).toBe(30); // 2.4 / 0.08
    expect(updatedItems[0].safetyMargin).toBe(0); // (30 / 30 - 1) * 100
    expect(updatedItems[1].targetYield).toBe(8);
    expect(updatedItems[1].ceilingPrice).toBe(60); // 4.8 / 0.08
    expect(updatedItems[1].safetyMargin).toBe(0); // (60 / 60 - 1) * 100

    expect(toast.success).toHaveBeenCalledWith(
      dict.ptBR.goalWizard.appliedToPortfolioSuccess.replace("{{count}}", "2"),
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("saving without checking the checkbox does NOT update watchlist items", async () => {
    mockWatchlistItems = [
      createMockItem({ id: "1", ticker: "PETR4", type: "STOCK_BR", targetYield: 6 }),
    ];
    currentSettings.classTargetYields = { STOCK_BR: 8 };

    const onComplete = vi.fn();
    render(<GoalWizard onComplete={onComplete} />);

    const finishButton = screen.getByRole("button", {
      name: new RegExp(dict.ptBR.goalWizard.finishBtn),
    });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    expect(mockUpsertManyAsync).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(dict.ptBR.goalWizard.savedToast);
  });

  it("groups FIAGRO and FII_INFRA under FII when counting and applying in batch", async () => {
    mockWatchlistItems = [
      createMockItem({ id: "fii1", ticker: "HGLG11", type: "FII", targetYield: 8.5 }),
      createMockItem({ id: "fiagro1", ticker: "KNCA11", type: "FIAGRO", targetYield: 8.5 }),
      createMockItem({ id: "infra1", ticker: "JURO11", type: "FII_INFRA", targetYield: 8.5 }),
    ];
    currentSettings.classTargetYields = { FII: 12 };

    render(<GoalWizard />);

    const fiiText = dict.ptBR.goalWizard.applyToClassAssets.replace("{{count}}", "3");
    const label = screen.getByText(fiiText);
    expect(label).toBeInTheDocument();

    fireEvent.click(label);

    const finishButton = screen.getByRole("button", {
      name: new RegExp(dict.ptBR.goalWizard.finishBtn),
    });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(mockUpsertManyAsync).toHaveBeenCalledTimes(1);
    });

    const updatedItems = mockUpsertManyAsync.mock.calls[0][0];
    expect(updatedItems).toHaveLength(3);
    expect(updatedItems.map((it: WatchlistItem) => it.type)).toEqual(["FII", "FIAGRO", "FII_INFRA"]);
    expect(updatedItems.every((it: WatchlistItem) => it.targetYield === 12)).toBe(true);
  });
});
