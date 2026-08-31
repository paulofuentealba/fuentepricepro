import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n-provider";
import { useSnowballBase } from "@/lib/useSnowballBase";
import { simulateSnowballScenario } from "@/lib/snowballScenario";
import { formatCurrency } from "@/lib/i18n";
import { resolveReasonText } from "@/lib/askEngine";

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
 * "Bola de neve" scenario panel — reproduces the Projeção/Parâmetros two-card layout from the
 * v6 prototype (docs/design/v6/prototipo-v6.html, tabpane#e5), wired to real data instead of
 * the prototype's hardcoded numbers: base equity and blended yield come from useSnowballBase
 * (the same canonical calc SnowballSimulator uses), and the yield/growth/contribution/horizon
 * sliders drive simulateSnowballScenario. Growth and yield-override have no equivalent in
 * SnowballSimulator — this is a distinct, explicitly hypothetical "what-if" tool, per the
 * panel's own disclaimer.
 */
export function SnowballScenarioPanel() {
  const { t, locale } = useI18n();
  const base = useSnowballBase();

  const [monthlyContribution, setMonthlyContribution] = useState(2500);
  const [growthPct, setGrowthPct] = useState(6);
  const [years, setYears] = useState(20);
  const [yieldOverride, setYieldOverride] = useState<number | null>(null);
  const yieldPct = yieldOverride ?? Math.round(base.blendedYield * 1000) / 10;

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

  const barPoints = useMemo(() => {
    const pts = result.yearPoints;
    if (pts.length <= 6) return pts;
    const step = (pts.length - 1) / 5;
    return Array.from({ length: 6 }, (_, i) => pts[Math.round(i * step)]);
  }, [result.yearPoints]);

  const maxBar = Math.max(...barPoints.map((p) => p.balance), 1);
  const splitIndex = Math.ceil(barPoints.length / 2);

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

        <div className="mt-5 flex h-[130px] items-end gap-2">
          {barPoints.map((p, i) => {
            const heightPct = Math.max((p.balance / maxBar) * 100, 4);
            const isGold = i >= splitIndex;
            return (
              <div
                key={p.year}
                className="flex-1 rounded-[5px]"
                style={{
                  height: `${heightPct}%`,
                  background: isGold
                    ? "linear-gradient(180deg, color-mix(in oklch, var(--accent) 55%, transparent), var(--accent))"
                    : "linear-gradient(180deg, color-mix(in oklch, var(--success) 55%, transparent), var(--success))",
                }}
                title={`${resolveReasonText(t, "snowball.year", { year: p.year })}: ${formatCurrency(p.balance, base.currency, locale)}`}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-base font-medium text-foreground">
            {t.snowballScenario?.parametersTitle}
          </h3>
          <StatusBadge variant="gold">{t.snowballScenario?.scenarioBadge}</StatusBadge>
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
              onValueChange={(v) => setMonthlyContribution(v[0])}
              aria-label={t.snowballScenario?.monthlyContribution}
            />
          </ParamRow>

          <ParamRow label={t.snowballScenario?.dividendYield ?? ""} value={`${yieldPct.toFixed(1)}%`}>
            <Slider
              min={0}
              max={15}
              step={0.1}
              value={[yieldPct]}
              onValueChange={(v) => setYieldOverride(v[0])}
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
              onValueChange={(v) => setGrowthPct(v[0])}
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
              onValueChange={(v) => setYears(v[0])}
              aria-label={t.snowballScenario?.horizon}
            />
          </ParamRow>
        </div>

        <p className="mt-4 text-[10.5px] text-muted-foreground">{t.snowballScenario?.disclaimer}</p>
      </div>
    </div>
  );
}
