import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";
import { groupRealizedIncomeByMonth } from "@/lib/realizedIncome";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

interface Props {
  events: RealizedIncomeEvent[];
  currency: string;
}

export function AssetMonthlyDividendChart({ events, currency }: Props) {
  const { locale } = useI18n();

  const chartData = useMemo(() => {
    const locStr = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR";
    return groupRealizedIncomeByMonth(events, undefined, locStr);
  }, [events, locale]);

  if (chartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border/60 bg-background/95 px-3 py-2 shadow-xl backdrop-blur text-xs">
        <p className="font-semibold text-foreground mb-0.5">{data.monthLabel}</p>
        <p className="font-semibold text-emerald-500">
          {formatCurrency(data.amountNet, currency as any, locale)}
        </p>
      </div>
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      <div className="h-[140px] w-full">
        <ChartContainer config={{}} className="h-full w-full">
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={45}
              tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 9 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
              }
            />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar dataKey="amountNet" fill="rgb(16, 185, 129)" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill="rgb(16, 185, 129)" />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
