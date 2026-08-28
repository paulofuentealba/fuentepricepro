import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { Currency } from "@/lib/domain";
import { cn } from "@/lib/utils";

export interface GrossNetRow {
  ticker: string;
  gross: number;
  net: number;
}

export interface FiscalHeroBreakdownProps {
  darfDue: number;
  currentMonthSales: number;
  exemptionLimit: number;
  lossCarryforward: number;
  usWithheldTax: number;
  jcpWithheldTax: number;
  brDividendsNet: number;
  grossNetRows: GrossNetRow[];
  currency: Currency;
}

/**
 * Réplica do bloco `.fiscal-hero` + `.brk` + tabela "Bruto × líquido real" do protótipo v6
 * (docs/design/fuente-v6-completo.html, tela #fiscal). Puramente apresentação — todos os
 * valores já vêm calculados de `TaxRealityContext`/`stockMonthly` (buildTaxContext.ts,
 * calculateMonthlyCapitalGainsTax), nenhuma fórmula tributária nova aqui.
 */
export function FiscalHeroBreakdown({
  darfDue,
  currentMonthSales,
  exemptionLimit,
  lossCarryforward,
  usWithheldTax,
  jcpWithheldTax,
  brDividendsNet,
  grossNetRows,
  currency,
}: FiscalHeroBreakdownProps) {
  const { t, locale } = useI18n();
  const hero = t.taxRealityScreen.hero;
  const breakdown = t.taxRealityScreen.breakdown;
  const table = t.taxRealityScreen.grossNetTable;

  const gaugePct = exemptionLimit > 0 ? Math.min(100, (currentMonthSales / exemptionLimit) * 100) : 0;
  const remaining = Math.max(0, exemptionLimit - currentMonthSales);
  const isWithinExemption = currentMonthSales <= exemptionLimit;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[22px] border border-border/60 bg-card">
        {/* .fiscal-hero */}
        <div className="flex flex-wrap items-center gap-6 p-5 sm:p-6">
          <div>
            <div className="text-[10.5px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {hero.darfLabel}
            </div>
            <div
              className={cn(
                "font-serif text-3xl font-medium leading-none sm:text-[42px]",
                isWithinExemption ? "text-success" : "text-destructive",
              )}
            >
              {formatCurrency(darfDue, currency, locale)}
            </div>
            <div className="mt-1.5 text-[11.5px] text-muted-foreground">
              {isWithinExemption ? hero.withinExemption : hero.aboveExemption}
            </div>
          </div>

          <div className="min-w-[200px] flex-1">
            <div className="mb-2 text-[11px] text-muted-foreground">{hero.gaugeLabel}</div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${gaugePct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{hero.soldLabel.replace("{{value}}", formatCurrency(currentMonthSales, currency, locale))}</span>
              <span>
                {isWithinExemption
                  ? hero.remainingLabel.replace("{{value}}", formatCurrency(remaining, currency, locale))
                  : hero.exceededLabel.replace(
                      "{{value}}",
                      formatCurrency(currentMonthSales - exemptionLimit, currency, locale),
                    )}
              </span>
            </div>
          </div>
        </div>

        {/* .brk breakdown strip */}
        <div className="flex flex-wrap border-t border-border/40">
          <div className="min-w-[115px] flex-1 border-r border-border/40 p-3.5 last:border-r-0">
            <div className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {breakdown.lossCarryforward}
            </div>
            <div className="mt-1 font-mono text-[15px] font-semibold text-success">
              {formatCurrency(lossCarryforward, currency, locale)}
            </div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">{breakdown.lossCarryforwardNote}</div>
          </div>
          <div className="min-w-[115px] flex-1 border-r border-border/40 p-3.5 last:border-r-0">
            <div className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {breakdown.usWithholding}
            </div>
            <div className="mt-1 font-mono text-[15px] font-semibold text-destructive">
              {formatCurrency(usWithheldTax, currency, locale)}
            </div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">{breakdown.usWithholdingNote}</div>
          </div>
          <div className="min-w-[115px] flex-1 border-r border-border/40 p-3.5 last:border-r-0">
            <div className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {breakdown.jcp}
            </div>
            <div className="mt-1 font-mono text-[15px] font-semibold text-accent-foreground">
              {formatCurrency(jcpWithheldTax, currency, locale)}
            </div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">{breakdown.jcpNote}</div>
          </div>
          <div className="min-w-[115px] flex-1 p-3.5">
            <div className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {breakdown.brDividends}
            </div>
            <div className="mt-1 font-mono text-[15px] font-semibold text-success">
              {formatCurrency(brDividendsNet, currency, locale)}
            </div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">{breakdown.brDividendsNote}</div>
          </div>
        </div>
      </div>

      {grossNetRows.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-background/50 overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 sm:px-5">
            <h3 className="font-serif text-base font-semibold text-foreground">{table.title}</h3>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-display font-semibold text-accent-foreground">
              {table.pill}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border/40">
                <th className="px-4 py-2 text-left text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                  {table.assetHeader}
                </th>
                <th className="px-4 py-2 text-right text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                  {table.grossHeader}
                </th>
                <th className="px-4 py-2 text-right text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                  {table.netHeader}
                </th>
                <th className="px-4 py-2 text-right text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                  {table.lossHeader}
                </th>
              </tr>
            </thead>
            <tbody>
              {grossNetRows.map((row) => {
                const lossPct = row.gross > 0 ? ((row.gross - row.net) / row.gross) * 100 : 0;
                return (
                  <tr key={row.ticker} className="border-t border-dashed border-border/30">
                    <td className="px-4 py-2 font-mono font-semibold text-foreground sm:px-5">{row.ticker}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground line-through decoration-muted-foreground/50 sm:px-5">
                      {formatCurrency(row.gross, currency, locale)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-medium text-accent-foreground sm:px-5">
                      {formatCurrency(row.net, currency, locale)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right font-mono sm:px-5",
                        lossPct > 0.01 ? "text-destructive" : "text-success",
                      )}
                    >
                      {lossPct > 0.01 ? `-${formatPercent(lossPct, locale, 0)}` : "0%"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
