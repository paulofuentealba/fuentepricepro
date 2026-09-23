// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { isDemoModeActive, startDemoMode, endDemoMode, blockWriteInDemoMode } from "../demoMode";
import { WATCHLIST_STORAGE_KEY, TRANSACTIONS_STORAGE_KEY } from "../localStorageKeys";

describe("demoMode safety guards", () => {
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
    vi.clearAllMocks();
  });

  it("does NOT clear user transactions or watchlist if demo mode was NOT active", () => {
    window.localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify([{ id: "real-tx-1", ticker: "MGLU3", quantity: 100 }]),
    );
    window.localStorage.setItem(
      WATCHLIST_STORAGE_KEY,
      JSON.stringify([{ id: "real-asset-1", ticker: "MGLU3", quantity: 100 }]),
    );

    endDemoMode();

    expect(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(WATCHLIST_STORAGE_KEY)).not.toBeNull();

    const txs = JSON.parse(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)!);
    expect(txs).toHaveLength(1);
    expect(txs[0].ticker).toBe("MGLU3");
  });

  it("clears demo transactions and watchlist when demo mode WAS active", () => {
    startDemoMode();
    expect(isDemoModeActive()).toBe(true);
    expect(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)).not.toBeNull();

    endDemoMode();

    expect(isDemoModeActive()).toBe(false);
    expect(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(WATCHLIST_STORAGE_KEY)).toBeNull();
  });

  it("does not block write or clear storage when demo mode is not active", () => {
    window.localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify([{ id: "real-tx-1", ticker: "PETR4", quantity: 200 }]),
    );

    const isBlocked = blockWriteInDemoMode();
    expect(isBlocked).toBe(false);

    expect(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)).not.toBeNull();
  });

  it("isDemoTransactions accurately identifies synthetic demo transactions vs user transactions", async () => {
    const { isDemoTransactions } = await import("../demoMode");
    const demoPayload = [{ id: "bbas3-1", ticker: "BBAS3", quantity: 300 }];
    const realPayload = [{ id: "c18a2872-520e-4363-888e-73c38f4d96a1", ticker: "BBAS3", quantity: 300 }];

    expect(isDemoTransactions(demoPayload)).toBe(true);
    expect(isDemoTransactions(realPayload)).toBe(false);
  });

  it("isDemoWatchlist accurately identifies demo watchlist items", async () => {
    const { isDemoWatchlist } = await import("../demoMode");
    const testIpo = [{ id: "custom-1", ticker: "TEST_IPO_RECENTE" }];
    const realUserWatchlist = [{ id: "stock:ITSA4", ticker: "ITSA4" }, { id: "stock:BBDC4", ticker: "BBDC4" }];

    expect(isDemoWatchlist(testIpo)).toBe(true);
    expect(isDemoWatchlist(realUserWatchlist)).toBe(false);
  });

  it("isDemoStorage detects demo mode even if flags are cleared but payload is demo", async () => {
    const { isDemoStorage } = await import("../demoMode");
    window.localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify([{ id: "bbas3-1", ticker: "BBAS3", quantity: 300 }]),
    );

    expect(isDemoStorage()).toBe(true);
    endDemoMode();
    expect(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)).toBeNull();
  });
});
