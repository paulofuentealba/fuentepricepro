import { useMemo, useState } from "react";
import { useUserSettings } from "@/lib/useUserSettings";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useWatchlist } from "@/lib/watchlist";
import { formatCurrency, toIntlLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartGlowDef } from "@/components/ui/ChartGlowDef";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";

// chartConfig moved inside component to support translations

function flagFor(currency: Currency): string {
  return currency === "USD" ? "🇺🇸" : "🇧🇷";
}

export function SnowballSimulator() {
  const { items } = useWatchlist();
  const { t, locale } = useI18n();

  const chartConfig = {
    Juros: {
      label: t.snowball.interest,
      color: "var(--success)",
    },
    Principal: {
      label: t.snowball.principal,
      color: "var(--color-primary)",
    },
  } satisfies ChartConfig;

  const { settings, updateSettings } = useUserSettings();
  const currency = settings.displayCurrency;
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1000);
  const [years, setYears] = useState<number>(10);
  const [reinvest, setReinvest] = useState<boolean>(true);

  const { currentTotal, blendedYield } = useMemo(() => {
    let totalValue = 0;
    let totalAnnualDividend = 0;

    for (const item of items) {
      if (item.currency !== currency) continue;
      const value = item.currentPrice * item.quantity;
      const dividend = item.annualDividend * item.quantity;

      totalValue += value;
      totalAnnualDividend += dividend;
    }

    const yieldPct = totalValue > 0 ? totalAnnualDividend / totalValue : 0.08; // Default to 8% if empty
    return { currentTotal: totalValue, blendedYield: yieldPct };
  }, [items, currency]);

  const projection = useMemo(() => {
    let balance = currentTotal;
    let principal = currentTotal;
    const monthlyYield = blendedYield / 12;
    const data = [];

    for (let m = 1; m <= years * 12; m++) {
      if (reinvest) {
        balance += balance * monthlyYield;
      }
      balance += monthlyContribution;
      principal += monthlyContribution;

      if (m % 12 === 0) {
        data.push({
          year: t.snowball.year.replace("{{year}}", String(m / 12)),
          Principal: principal,
          Juros: balance - principal,
        });
      }
    }

    const finalMonthlyPassiveIncome = balance * monthlyYield;
    const crossoverData = data.find((d) => d.Juros > d.Principal);
    const crossoverYear = crossoverData ? crossoverData.year : null;

    return { finalBalance: balance, finalMonthlyPassiveIncome, data, crossoverYear };
  }, [currentTotal, blendedYield, years, monthlyContribution, reinvest]);

  return (
    <section className="mt-6">
      <Card className="border-border/60 bg-card/60">
        <CardContent className="space-y-6 pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground flex-1">{t.snowball.subtitle}</p>
            <div className="shrink-0">
              <CurrencyToggle
                value={currency === "USD" ? "US" : "BR"}
                onChange={(v) => updateSettings({ displayCurrency: v === "US" ? "USD" : "BRL" })}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>{t.snowball.monthlyContribution}</Label>
                  <span className="text-sm font-semibold">
                    {formatCurrency(monthlyContribution, currency, locale)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={10000}
                  step={100}
                  value={[monthlyContribution]}
                  onValueChange={(val) => setMonthlyContribution(val[0])}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>{t.snowball.timeHorizon}</Label>
                  <span className="text-sm font-semibold">{years}</span>
                </div>
                <Slider
                  min={1}
                  max={35}
                  step={1}
                  value={[years]}
                  onValueChange={(val) => setYears(val[0])}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="reinvest-mode" className="cursor-pointer">
                  {t.snowball.reinvestDrip}
                </Label>
                <Switch id="reinvest-mode" checked={reinvest} onCheckedChange={setReinvest} />
              </div>

              <div className="rounded-md border border-border/60 bg-background/40 p-3 mt-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">{t.snowball.currentBase}</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(currentTotal, currency, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.snowball.avgYield}</span>
                  <span className="font-medium text-success">
                    {(blendedYield * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col justify-center rounded-xl border border-success/30 bg-success/10 p-6 text-center">
                <h3 className="text-sm uppercase tracking-wider text-success/80 font-semibold mb-2">
                  {t.snowball.monthlyIncomeIn.replace("{{years}}", String(years))}
                </h3>
                <div className="text-4xl font-bold text-success tabular-nums">
                  {formatCurrency(projection.finalMonthlyPassiveIncome, currency, locale)}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {t.snowball.estimatedAccumulated} <br />
                  <span className="font-semibold text-foreground/80">
                    {formatCurrency(projection.finalBalance, currency, locale)}
                  </span>
                </p>
              </div>

              <div className="h-[260px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart
                    data={projection.data}
                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <ChartGlowDef id="glowArea" blur={6} />
                      <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-Principal)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-Principal)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorJuros" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-Juros)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-Juros)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      stroke="hsl(var(--muted-foreground)/0.2)"
                    />
                    <XAxis
                      dataKey="year"
                      interval={0}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      dy={10}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: number) =>
                        new Intl.NumberFormat(toIntlLocale(locale), { notation: "compact" }).format(v)
                      }
                    />
                    <ChartTooltip
                      cursor={{
                        stroke: "hsl(var(--muted-foreground)/0.4)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      content={
                        <ChartTooltipContent
                          valueFormatter={(value: any) => formatCurrency(value, currency, locale)}
                        />
                      }
                    />
                    {projection.crossoverYear && (
                      <ReferenceLine
                        x={projection.crossoverYear}
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
                    <Area
                      type="monotone"
                      dataKey="Principal"
                      stackId="1"
                      stroke="var(--color-Principal)"
                      strokeWidth={2}
                      fill="url(#colorPrincipal)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Juros"
                      stackId="1"
                      stroke="var(--color-Juros)"
                      strokeWidth={3}
                      fill="url(#colorJuros)"
                      filter="url(#glowArea)"
                    />
                    <ChartLegend content={<ChartLegendContent />} className="pt-4" />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
