import { describe, it, expect } from "vitest";
import {
  buildTrajectorySeries,
  MIN_TRAJECTORY_POINTS_FOR_SPARKLINE,
} from "../horizonteTrajectory";

describe("buildTrajectorySeries", () => {
  it("orders documents by date ascending regardless of input order", () => {
    const docs = [
      { date: "2026-01-03", totalValueBRL: 300, totalInvestedBRL: 280 },
      { date: "2026-01-01", totalValueBRL: 100, totalInvestedBRL: 100 },
      { date: "2026-01-02", totalValueBRL: 200, totalInvestedBRL: 190 },
    ];

    const series = buildTrajectorySeries(docs);

    expect(series.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });

  it("preserves totalValueBRL and totalInvestedBRL for real (non-backfilled) snapshots", () => {
    const docs = [{ date: "2026-02-01", totalValueBRL: 5000, totalInvestedBRL: 4200 }];

    const [point] = buildTrajectorySeries(docs);

    expect(point.totalValueBRL).toBe(5000);
    expect(point.totalInvestedBRL).toBe(4200);
  });

  it("keeps totalValueBRL as null for backfilled documents that never had it (never invents/interpolates a value)", () => {
    const docs = [
      { date: "2025-06-01", totalValueBRL: null, totalInvestedBRL: 1000, backfilled: true },
    ];

    const [point] = buildTrajectorySeries(docs);

    expect(point.totalValueBRL).toBeNull();
    expect(point.totalInvestedBRL).toBe(1000);
  });

  it("defaults totalInvestedBRL to 0 and totalValueBRL to null when fields are missing entirely", () => {
    const docs = [{ date: "2026-03-01" }];

    const [point] = buildTrajectorySeries(docs);

    expect(point.totalValueBRL).toBeNull();
    expect(point.totalInvestedBRL).toBe(0);
  });

  it("filters out documents without a valid date", () => {
    const docs = [
      { date: "2026-01-01", totalValueBRL: 100, totalInvestedBRL: 100 },
      { date: "", totalValueBRL: 999, totalInvestedBRL: 999 },
    ];

    const series = buildTrajectorySeries(docs as any);

    expect(series).toHaveLength(1);
    expect(series[0].date).toBe("2026-01-01");
  });

  it("returns an empty series for an empty input", () => {
    expect(buildTrajectorySeries([])).toEqual([]);
  });
});

describe("MIN_TRAJECTORY_POINTS_FOR_SPARKLINE", () => {
  it("is set to a sensible minimum (roughly a week) to avoid showing a misleading/empty sparkline", () => {
    expect(MIN_TRAJECTORY_POINTS_FOR_SPARKLINE).toBe(7);
  });
});
