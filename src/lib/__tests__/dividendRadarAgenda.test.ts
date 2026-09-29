import { describe, it, expect } from "vitest";
import {
  buildAgendaEvents,
  computeAgendaStats,
  buildRadarItems,
  AGENDA_CATALOG,
} from "../dividendRadarLogic";

describe("DividendRadar Agenda Logic", () => {
  const radarItems = buildRadarItems(null, "BR", "pt-BR");

  it("builds daily agenda events enriched with SSOT radar items", () => {
    const events = buildAgendaEvents(radarItems, "pt-BR");
    expect(events.length).toBeGreaterThan(0);

    const bbas3 = events.find((e) => e.ticker === "BBAS3" && e.eventType === "com");
    expect(bbas3).toBeDefined();
    expect(bbas3?.ceilingPrice).toBeGreaterThan(0);
    expect(bbas3?.margin).toBeDefined();
    expect(bbas3?.safetyScore).toBeGreaterThanOrEqual(0);
    expect(bbas3?.declaredAmount).toBeCloseTo(0.8454);
  });

  it("identifies events marked as today (25/Sep/2026)", () => {
    const events = buildAgendaEvents(radarItems, "pt-BR");
    const todayEvents = events.filter((e) => e.isToday);
    expect(todayEvents.length).toBeGreaterThan(0);
    expect(todayEvents.some((e) => e.ticker === "BBAS3")).toBe(true);
    expect(todayEvents.some((e) => e.ticker === "HGLG11")).toBe(true);
  });

  it("differentiates between BR and US market events", () => {
    const events = buildAgendaEvents(radarItems, "pt-BR");
    const brEvents = events.filter((e) => e.market === "BR");
    const usEvents = events.filter((e) => e.market === "US");

    expect(brEvents.length).toBeGreaterThan(0);
    expect(usEvents.length).toBeGreaterThan(0);

    // US assets should have currency USD
    const jnj = usEvents.find((e) => e.ticker === "JNJ");
    expect(jnj?.currency).toBe("USD");
    expect(jnj?.eventType).toBe("com");

    // BR assets should have currency BRL
    const itusa = brEvents.find((e) => e.ticker === "ITSA4");
    expect(itusa?.currency).toBe("BRL");
    expect(itusa?.taxType).toBe("jcp");
  });

  it("computes quantitative monthly summary statistics accurately", () => {
    const events = buildAgendaEvents(radarItems, "pt-BR");
    const stats = computeAgendaStats(events);

    expect(stats.totalEvents).toBe(events.length);
    expect(stats.totalCom).toBe(events.filter((e) => e.eventType === "com").length);
    expect(stats.totalPay).toBe(events.filter((e) => e.eventType === "pay").length);
    expect(stats.totalBelowCeiling).toBe(events.filter((e) => e.isBelowCeiling).length);
    expect(stats.totalHighSafety).toBe(events.filter((e) => e.safetyScore >= 80).length);
  });

  it("provides comprehensive October coverage with dozens of Data Com and Payment events across asset classes", () => {
    const events = buildAgendaEvents(radarItems, "pt-BR");
    const octEvents = events.filter((e) => e.month === 10);
    expect(octEvents.length).toBeGreaterThan(40);

    const octComEvents = octEvents.filter((e) => e.eventType === "com");
    expect(octComEvents.length).toBeGreaterThan(20);

    // Verifies FIIs, Stocks, and US assets in October
    expect(octEvents.some((e) => e.type === "FII")).toBe(true);
    expect(octEvents.some((e) => e.type === "STOCK_BR")).toBe(true);
    expect(octEvents.some((e) => e.type === "STOCK_US")).toBe(true);

    // Verifies specific key events in October
    expect(octEvents.some((e) => e.ticker === "TRPL4" && e.eventType === "pay")).toBe(true);
    expect(octEvents.some((e) => e.ticker === "ITUB4" && e.eventType === "com")).toBe(true);
    expect(octEvents.some((e) => e.ticker === "BBDC4" && e.eventType === "pay")).toBe(true);
    expect(octEvents.some((e) => e.ticker === "HGLG11" && e.eventType === "pay")).toBe(true);
  });

  it("strictly enforces BTLG11 fund regulation: Data Com on the 15th and Payment around the 25th", () => {
    const btlg = radarItems.find((r) => r.ticker === "BTLG11");
    expect(btlg).toBeDefined();
    expect(btlg?.windowCom).toBe("Todo dia 15 (ou útil subseq.)");
    expect(btlg?.nextMonth).toBe("Todo dia 25 (ou útil subseq.)");

    const events = buildAgendaEvents(radarItems, "pt-BR");
    const btlgComOct = events.find((e) => e.ticker === "BTLG11" && e.eventType === "com" && e.month === 10);
    expect(btlgComOct).toBeDefined();
    expect(btlgComOct?.dateKey).toBe("2026-10-15");
    expect(btlgComOct?.reciprocalDateFormatted).toBe("23/10/2026");

    const btlgPayOct = events.find((e) => e.ticker === "BTLG11" && e.eventType === "pay" && e.month === 10);
    expect(btlgPayOct).toBeDefined();
    expect(btlgPayOct?.dateKey).toBe("2026-10-23");
    expect(btlgPayOct?.reciprocalDateFormatted).toBe("15/10/2026");
  });
});
