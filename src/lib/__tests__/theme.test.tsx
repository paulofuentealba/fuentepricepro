// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "@testing-library/react";
import { resolveIsDark, THEME_STORAGE_KEY } from "../theme-provider";

describe("Theme Management (SSR & Local Preference)", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves dark explicitly when theme is 'dark'", () => {
    expect(resolveIsDark("dark")).toBe(true);
  });

  it("resolves light explicitly when theme is 'light'", () => {
    expect(resolveIsDark("light")).toBe(false);
  });

  it("uses system fallback for 'system' theme", () => {
    const isDark = resolveIsDark("system");
    expect(typeof isDark).toBe("boolean");
  });

  it("uses the canonical storage key", () => {
    expect(THEME_STORAGE_KEY).toBe("ceilingPricePro.theme.v1");
  });

  it("hydrates without hydration mismatch warnings when inline theme script alters DOM before React hydration", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestShell() {
      return (
        <div id="test-root" className="dark" suppressHydrationWarning>
          <span>App Content</span>
        </div>
      );
    }

    // 1. Simulate server-side rendering (SSR)
    const serverHtml = renderToString(<TestShell />);

    // 2. Setup client container simulating browser receiving SSR HTML
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);

    // 3. Simulate inline script in <head> mutating classes before React hydrateRoot executes
    const rootEl = container.querySelector("#test-root")!;
    rootEl.classList.remove("dark");

    // 4. Hydrate client
    act(() => {
      hydrateRoot(container, <TestShell />);
    });

    // 5. Verify no React hydration mismatch warnings were logged
    const hydrationWarnings = consoleErrorSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === "string" &&
          (arg.includes("Hydration failed") ||
            arg.includes("did not match") ||
            arg.includes("Warning: Expected server HTML")),
      ),
    );

    expect(hydrationWarnings).toHaveLength(0);
    consoleErrorSpy.mockRestore();
    document.body.removeChild(container);
  });
});
