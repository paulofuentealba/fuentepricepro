// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSelic } from "../useSelic";
import { SELIC_FALLBACK } from "../macroDefaults";

let mockMacroRatesResult: { selic?: number; cdi?: number; ipca?: number } | null = null;
let mockMacroRatesError: Error | null = null;

vi.mock("../apiService.functions", () => ({
  fetchMacroRatesFn: vi.fn(async () => {
    if (mockMacroRatesError) throw mockMacroRatesError;
    return mockMacroRatesResult ?? { selic: 11.25, cdi: 11.15, ipca: 4.2 };
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useSelic hook", () => {
  beforeEach(() => {
    mockMacroRatesResult = null;
    mockMacroRatesError = null;
    vi.clearAllMocks();
  });

  it("returns the selic rate from server function when available", async () => {
    mockMacroRatesResult = { selic: 12.75, cdi: 12.65, ipca: 4.0 };
    const { result } = renderHook(() => useSelic(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(12.75);
  });

  it("falls back to cdi when selic is undefined in query result", async () => {
    mockMacroRatesResult = { cdi: 10.65, ipca: 4.5 } as any;
    const { result } = renderHook(() => useSelic(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(10.65);
  });

  it("falls back to SELIC_FALLBACK when server query fails with error", async () => {
    mockMacroRatesError = new Error("Network error");
    const { result } = renderHook(() => useSelic(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBe(SELIC_FALLBACK);
    expect(result.current.data).toBe(10.5);
  });
});
