// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioEmptyState } from "../PortfolioEmptyState";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: {
      portfolio: {
        emptyStateTitle: "Nenhuma posição ainda",
        emptyStateDesc: "Adicione um ativo manualmente ou importe sua nota de corretagem para começar.",
        emptyStateAddAsset: "Adicionar Ativo",
        emptyStateImportNote: "Importar Nota de Corretagem",
      },
    },
  }),
}));

describe("PortfolioEmptyState", () => {
  it("renders both CTA links", () => {
    render(<PortfolioEmptyState />);
    expect(screen.getByRole("link", { name: "Adicionar Ativo" })).toHaveAttribute("href", "/app/add-asset");
    expect(screen.getByRole("link", { name: "Importar Nota de Corretagem" })).toHaveAttribute(
      "href",
      "/app/import-broker-note",
    );
  });
});
