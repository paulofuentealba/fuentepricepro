// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { AssetClassFilterChips } from "../AssetClassFilterChips";
import type { EightClassKey } from "@/lib/selectors/eightClassAllocation";

afterEach(() => {
  cleanup();
});

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      dashboard: {
        allocation: {
          classes: {
            acoes_br: "Ações BR",
            fiis: "FIIs",
            fiagros: "Fiagros",
            fi_infras: "FI-Infras",
            reits_us: "REITs (US)",
            etfs_us: "ETFs US",
            etfs_br: "ETFs BR",
            acoes_us: "Ações US",
          },
        },
        matrix: {
          filterAllDynamic: "Todas as Classes",
        },
      },
    },
  }),
}));

describe("AssetClassFilterChips", () => {
  const classes: EightClassKey[] = ["acoes_br", "fiis"];

  it("renders 'Todas as Classes' and available class buttons", () => {
    render(
      <AssetClassFilterChips
        activeFilter="ALL"
        onSelectFilter={vi.fn()}
        availableClasses={classes}
      />,
    );

    expect(screen.getByText("Todas as Classes")).toBeInTheDocument();
    expect(screen.getByText("Ações BR")).toBeInTheDocument();
    expect(screen.getByText("FIIs")).toBeInTheDocument();
  });

  it("calls onSelectFilter when a class pill is clicked", () => {
    const onSelect = vi.fn();
    render(
      <AssetClassFilterChips
        activeFilter="ALL"
        onSelectFilter={onSelect}
        availableClasses={classes}
      />,
    );

    fireEvent.click(screen.getByText("FIIs"));
    expect(onSelect).toHaveBeenCalledWith("fiis");

    fireEvent.click(screen.getByText("Todas as Classes"));
    expect(onSelect).toHaveBeenCalledWith("ALL");
  });

  it("renders count badges when counts are provided", () => {
    render(
      <AssetClassFilterChips
        activeFilter="fiis"
        onSelectFilter={vi.fn()}
        availableClasses={classes}
        counts={{ ALL: 12, acoes_br: 7, fiis: 5 }}
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
