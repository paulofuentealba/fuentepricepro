import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Slider } from "@/components/ui/slider";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartGlowDef } from "@/components/ui/ChartGlowDef";
import { useI18n } from "@/lib/i18n-provider";
import { useSnowballBase } from "@/lib/useSnowballBase";
import { useFIProgress } from "@/lib/useFIProgress";
import { useInvestorProfile } from "@/lib/useInvestorProfile";
import { calculateProfileTier, type ProfileTier } from "@/lib/investor-profile";
import { simulateSnowballScenario } from "@/lib/snowballScenario";
import { formatCurrency, formatCompactNumber } from "@/lib/i18n";
import { resolveReasonText } from "@/lib/askEngine";
import { cn } from "@/lib/utils";

const CHART_MARGIN = { top: 20, right: 10, left: 0, bottom: 0 };

const PRESETS: Record<ProfileTier, { yieldPct: number; growthPct: number }> = {
  conservative: { yieldPct: 6, growthPct: 3 },
  moderate: { yieldPct: 8, growthPct: 6 },
  aggressive: { yieldPct: 11, growthPct: 9 },
};

interface ParamRowProps {
  label: string;
  value: string;
  children: React.ReactNode;
}

function ParamRow({ label, value, children }: ParamRowProps) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="w-[112px] shrink-0 text-xs font-medium text-foreground sm:w-[130px]">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
      <span className="shrink-0 whitespace-nowrap text-right font-mono text-xs font-semibold text-foreground sm:text-sm">
        {value}
      </span>
    </div>
  );
}

/**
 * "Bola de neve" scenario panel — Projeção/Parâmetros two-card layout from the v6 prototype,
 * wired to real data: base equity and blended yield come from useSnowballBase (the same
 * canonical calc SnowballSimulator uses). The "cenário" preset default is derived from the
 * user's investor profile tier (calculateProfileTier, same SSOT the allocation matrix uses) —
 * once the user touches any control manually, that auto-pick stops overriding their choice.
 */
export function SnowballScenarioPanel() {
  const { t, locale } = useI18n();
  const base = useSnowballBase();
  const fi = useFIProgress();
  const { profile, isPending: profilePending } = useInvestorProfile();

  const derivedTier = useMemo(() => calculateProfileTier(profile).tier, [profile]);
  const hasUserAdjusted = useRef(false);

  const [monthlyContribution, setMonthlyContribution] = useState(2500);
  const [growthPct, setGrowthPct] = useState(PRESETS.moderate.growthPct);
  const [years, setYears] = useState(20);
  const [yieldOverride, setYieldOverride] = useState<number>(PRESETS.moderate.yieldPct);

  // Apply the profile-derived preset once the profile resolves — but only while the user hasn't
  // touched any control yet, so a late-arriving profile never clobbers a manual choice.
  useEffect(() => {
    if (hasUserAdjusted.current || profilePending) return;
    const preset = PRESETS[derivedTier];
    setYieldOverride(preset.yieldPct);
    setGrowthPct(preset.growthPct);
  }, [derivedTier, profilePending]);

  const yieldPct = yieldOverride;

  const selectedPreset = (Object.keys(PRESETS) as ProfileTier[]).find(
    (tier) => PRESETS[tier].yieldPct === yieldPct && PRESETS[tier].growthPct === growthPct,
  );

  function applyPreset(tier: ProfileTier) {
    hasUserAdjusted.current = true;
    setYieldOverride(PRESETS[tier].yieldPct);
    setGrowthPct(PRESETS[tier].growthPct);
  }

  const result = useMemo(
    () =>
      simulateSnowballScenario({
        baseEquity: base.currentTotal,
        monthlyContribution,
        yieldPct,
        growthPct,
        years,
      }),
    [base.currentTotal, monthlyContribution, yieldPct, growthPct, years],
  );

  // Classic compound-interest chart pattern (Bankrate/NerdWallet), not a stacked area: Principal
  // grows linearly and gets dwarfed on any shared axis with the exponential total — as a thin
  // stacked band it reads as flat. Drawn as its own traceable line (unstacked, true absolute
  // values) instead, its real slope is visible on its own merits. Juros rides as a third,
  // unstacked line (also its true absolute value, not a stacked delta) so it has its own visible
  // curve — styled with --comparison (a muted green already reserved for "secondary metric" in
  // this design system) PLUS a dashed stroke, so it reads apart from Patrimônio's solid --success
  // even though both are greens: color and line style both differ, not just hue.
  const chartConfig = {
    Patrimonio: { label: t.snowball.totalWealth, color: "var(--success)" },
    Juros: { label: t.snowball.interest, color: "var(--comparison)" },
    Principal: { label: t.snowball.principal, color: "var(--accent)" },
  } satisfies ChartConfig;

  const chartData = useMemo(
    () =>
      result.yearPoints.map((p) => ({
        year: resolveReasonText(t, "snowball.year", { year: p.year }),
        Principal: p.principal,
        Juros: Math.max(0, p.balance - p.principal),
        Patrimonio: p.balance,
      })),
    [result.yearPoints, t],
  );

  const crossoverLabel = result.crossoverYear
    ? resolveReasonText(t, "snowball.year", { year: result.crossoverYear })
    : null;

  // Financial-independence bridge: first year the projected monthly income covers the goal
  // configured in Metas e Critérios (useFIProgress — same SSOT the dashboard's FI card uses).
  const fiYearPoint = fi.isSetup
    ? result.yearPoints.find((p) => (p.balance * (yieldPct / 100)) / 12 >= fi.monthlyCostGoal)
    : undefined;
  const fiYearLabel = fiYearPoint
    ? resolveReasonText(t, "snowball.year", { year: fiYearPoint.year })
    : null;

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-base font-medium text-foreground">
            {t.snowballScenario?.projectionTitle}
          </h3>
          <StatusBadge variant="gold">
            {resolveReasonText(t, "snowballScenario.projectionBadge", { years })}
          </StatusBadge>
        </div>

        <div className="mt-4 font-serif text-3xl font-medium text-foreground sm:text-4xl">
          {formatCurrency(result.finalBalance, base.currency, locale)}
        </div>
        <div className="mt-1 text-sm font-semibold text-success">
          {resolveReasonText(t, "snowballScenario.monthlyIncomeLine", {
            amount: formatCurrency(result.finalMonthlyIncome, base.currency, locale),
          })}
        </div>

        <div className="mt-5 h-[220px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ComposedChart data={chartData} margin={CHART_MARGIN}>
              <defs>
                <ChartGlowDef id="snowballGlowArea" blur={6} />
                <linearGradient id="snowballColorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-Patrimonio)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-Patrimonio)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="color-mix(in oklab, var(--border) 40%, transparent)"
              />
              <XAxis
                dataKey="year"
                interval="preserveStartEnd"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)" }}
                dy={10}
              />
              <YAxis
                width={52}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) =>
                  formatCompactNumber(v, locale)
                }
              />
              <ChartTooltip
                cursor={{
                  stroke: "color-mix(in oklab, var(--border) 60%, transparent)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                content={
                  <ChartTooltipContent
                    valueFormatter={(value: any) => formatCurrency(value, base.currency, locale)}
                  />
                }
              />
              {crossoverLabel && (
                <ReferenceLine
                  x={crossoverLabel}
                  stroke="var(--color-Juros)"
                  strokeDasharray="3 3"
                  label={{
                    position: "top",
                    value: t.snowball.crossover,
                    fill: "var(--color-Juros)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
              {fiYearLabel && (
                <ReferenceLine
                  x={fiYearLabel}
                  stroke="var(--primary)"
                  strokeDasharray="3 3"
                  label={{
                    position: "insideTopRight",
                    value: t.snowballScenario?.fiBridgeChartLabel,
                    fill: "var(--primary)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="Patrimonio"
                stroke="var(--color-Patrimonio)"
                strokeWidth={3}
                fill="url(#snowballColorPatrimonio)"
                filter="url(#snowballGlowArea)"
              />
              <Line
                type="monotone"
                dataKey="Juros"
                stroke="var(--color-Juros)"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 3.5 }}
              />
              <Line
                type="monotone"
                dataKey="Principal"
                stroke="var(--color-Principal)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 3.5 }}
              />
              <ChartLegend content={<ChartLegendContent />} className="pt-2" />
            </ComposedChart>
          </ChartContainer>
        </div>

        <div className="mt-3 rounded-xl bg-muted/30 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{t.snowballScenario?.fiBridgeLabel}: </span>
          {!fi.isSetup ? (
            <>
              {t.snowballScenario?.fiBridgeNotSet}{" "}
              <Link to="/app/goals" className="font-semibold text-accent-text hover:underline">
                {t.snowballScenario?.fiBridgeCta}
              </Link>
            </>
          ) : fiYearLabel ? (
            resolveReasonText(t, "snowballScenario.fiBridgeReachedAt", { year: fiYearPoint?.year })
          ) : (
            resolveReasonText(t, "snowballScenario.fiBridgeNotReached", { years })
          )}
        </div>
      </div>

      <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-base font-medium text-foreground">
            {t.snowballScenario?.parametersTitle}
          </h3>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.snowballScenario?.presetLabel}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PRESETS) as ProfileTier[]).map((tier) => {
              const presetLabel =
                tier === "conservative"
                  ? t.snowballScenario?.presetConservative
                  : tier === "moderate"
                    ? t.snowballScenario?.presetModerate
                    : t.snowballScenario?.presetAggressive;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => applyPreset(tier)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedPreset === tier
                      ? "border-accent bg-accent/15 text-accent-text"
                      : "border-border/60 text-muted-foreground hover:border-accent/50 hover:text-foreground",
                  )}
                >
                  {presetLabel}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10.5px] text-muted-foreground">{t.snowballScenario?.presetHint}</p>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <ParamRow
            label={t.snowballScenario?.monthlyContribution ?? ""}
            value={formatCurrency(monthlyContribution, base.currency, locale)}
          >
            <Slider
              min={0}
              max={10000}
              step={100}
              value={[monthlyContribution]}
              onValueChange={(v) => {
                hasUserAdjusted.current = true;
                setMonthlyContribution(v[0]);
              }}
              aria-label={t.snowballScenario?.monthlyContribution}
            />
          </ParamRow>

          <ParamRow label={t.snowballScenario?.dividendYield ?? ""} value={`${yieldPct.toFixed(1)}%`}>
            <Slider
              min={0}
              max={15}
              step={0.1}
              value={[yieldPct]}
              onValueChange={(v) => {
                hasUserAdjusted.current = true;
                setYieldOverride(v[0]);
              }}
              aria-label={t.snowballScenario?.dividendYield}
            />
          </ParamRow>

          <ParamRow
            label={t.snowballScenario?.growth ?? ""}
            value={resolveReasonText(t, "snowballScenario.growthUnit", { pct: growthPct })}
          >
            <Slider
              min={0}
              max={15}
              step={0.5}
              value={[growthPct]}
              onValueChange={(v) => {
                hasUserAdjusted.current = true;
                setGrowthPct(v[0]);
              }}
              aria-label={t.snowballScenario?.growth}
            />
          </ParamRow>

          <ParamRow
            label={t.snowballScenario?.horizon ?? ""}
            value={resolveReasonText(t, "snowballScenario.horizonUnit", { years })}
          >
            <Slider
              min={1}
              max={35}
              step={1}
              value={[years]}
              onValueChange={(v) => {
                hasUserAdjusted.current = true;
                setYears(v[0]);
              }}
              aria-label={t.snowballScenario?.horizon}
            />
          </ParamRow>
        </div>

        <p className="mt-4 text-[10.5px] text-muted-foreground">{t.snowballScenario?.disclaimer}</p>
      </div>
    </div>
  );
}
