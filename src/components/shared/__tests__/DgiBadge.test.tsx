// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n-provider";
import { DgiBadge } from "../DgiBadge";

describe("DgiBadge Component", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => "en"),
        setItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Dividend King badge for JNJ", () => {
    render(
      <I18nProvider>
        <DgiBadge ticker="JNJ" />
      </I18nProvider>
    );

    expect(screen.getByText("Dividend King (50+ yrs)")).toBeInTheDocument();
  });

  it("renders Dividend Aristocrat badge for O", () => {
    render(
      <I18nProvider>
        <DgiBadge ticker="O" />
      </I18nProvider>
    );

    expect(screen.getByText("Dividend Aristocrat (25+ yrs)")).toBeInTheDocument();
  });

  it("renders nothing for non-DGI ticker", () => {
    const { container } = render(
      <I18nProvider>
        <DgiBadge ticker="TSLA" />
      </I18nProvider>
    );

    expect(container.firstChild).toBeNull();
  });
});
