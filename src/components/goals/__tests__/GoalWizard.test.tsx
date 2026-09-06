// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GoalWizard } from "../GoalWizard";
import { dict, type Locale } from "@/lib/i18n";
import type { UserSettings } from "@/lib/useUserSettings";

const currentLocale: Locale = "ptBR";

// Radix Slider requires ResizeObserver in jsdom environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

describe("GoalWizard Component", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
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
});
