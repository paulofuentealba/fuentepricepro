// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useIssuerTickerMappings } from "../useIssuerTickerMappings";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock auth provider
vi.mock("../auth-provider", () => ({
  useAuth: () => ({ user: null }),
}));

describe("useIssuerTickerMappings Hook", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  };

  it("should initialize with empty mappings in guest mode", async () => {
    const { result } = renderHook(() => useIssuerTickerMappings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mappings).toEqual({});
  });

  it("should save and retrieve user issuer mappings in localStorage", async () => {
    const { result } = renderHook(() => useIssuerTickerMappings(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.saveMappings({ "UNKNOWN CO ON": "UNKN3" });
    });

    await waitFor(() => {
      expect(result.current.mappings).toEqual({ "UNKNOWN CO ON": "UNKN3" });
    });

    const rawLocal = window.localStorage.getItem("ceilingPricePro.issuerTickerMappings.v1");
    expect(rawLocal).toBeDefined();
    expect(JSON.parse(rawLocal!)).toEqual({ "UNKNOWN CO ON": "UNKN3" });
  });
});
