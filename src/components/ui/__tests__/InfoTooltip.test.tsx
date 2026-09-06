// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { InfoTooltip } from "../InfoTooltip";
import { TooltipProvider } from "../tooltip";

// Mock ResizeObserver for Radix UI
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("InfoTooltip Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders button trigger with accessibility label when no link is provided", () => {
    render(
      <TooltipProvider>
        <InfoTooltip content="Explicação do cálculo de proventos" />
      </TooltipProvider>
    );

    const button = screen.getByRole("button", { name: /informações adicionais/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
  });

  it("renders a link element when link prop is provided", () => {
    render(
      <TooltipProvider>
        <InfoTooltip content="Veja a documentação completa" link="/app/docs#taxes" />
      </TooltipProvider>
    );

    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/app/docs#taxes");
  });

  it("toggles tooltip open state on click for touch and desktop interactivity", async () => {
    render(
      <TooltipProvider>
        <InfoTooltip content="Texto explicativo para teste de clique" />
      </TooltipProvider>
    );

    const button = screen.getByRole("button", { name: /informações adicionais/i });
    expect(button).toBeInTheDocument();

    // Click toggles open
    fireEvent.click(button);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Texto explicativo para teste de clique");
  });
});
