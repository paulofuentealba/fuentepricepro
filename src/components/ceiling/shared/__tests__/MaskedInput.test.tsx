// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MaskedInput } from "../MaskedInput";
import type { Locale } from "@/lib/i18n";

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
  }),
}));

describe("MaskedInput", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders with ptBR separators (period for thousands, comma for decimals)", () => {
    currentLocale = "ptBR";
    render(<MaskedInput formatMode="currency" currencySymbol="R$" value={1234567.89} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("R$ 1.234.567,89");
  });

  it("renders with Spanish (es) separators (period for thousands, comma for decimals)", () => {
    currentLocale = "es";
    render(<MaskedInput formatMode="currency" currencySymbol="US$" value={1234567.89} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("US$ 1.234.567,89");
  });

  it("renders with English (en) separators (comma for thousands, period for decimals)", () => {
    currentLocale = "en";
    render(<MaskedInput formatMode="currency" currencySymbol="US$" value={1234567.89} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("US$ 1,234,567.89");
  });

  it("renders percentage formatMode correctly", () => {
    currentLocale = "ptBR";
    render(<MaskedInput formatMode="percentage" value={15.5} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("15,5%");
  });

  it("handles fallback currency prefixes when currencySymbol is not provided", () => {
    currentLocale = "ptBR";
    const { unmount } = render(<MaskedInput formatMode="currency" value={100} />);
    let input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("R$ 100");

    unmount();
    currentLocale = "en";
    render(<MaskedInput formatMode="currency" value={100} />);
    input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("$ 100");
  });
});
