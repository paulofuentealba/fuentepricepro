import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { displayTicker, toIntlLocale, type Locale } from "@/lib/i18n";
import type { DecisionLogEntry, DecisionLogSummary, DecisionVerdict } from "@/lib/audit/types";
import { InsightBanner } from "@/components/shared/InsightBanner";
import { MetricBox } from "@/components/shared/MetricBox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuditScreenProps {
  summary: DecisionLogSummary;
  isLoading?: boolean;
}

const VERDICT_VARIANT: Record<DecisionVerdict, "success" | "danger" | "gold" | "default"> = {
  above_ceiling: "danger",
  yield_trap: "danger",
  great_entry: "success",
  fair_entry: "gold",
  no_data: "default",
  realized_gain: "success",
  realized_loss: "danger",
  neutral: "default",
};

function VerdictPill({ verdict, t }: { verdict: DecisionVerdict; t: any }) {
  const label = t.auditScreen?.verdicts?.[verdict] || verdict;
  return <StatusBadge variant={VERDICT_VARIANT[verdict]}>{label}</StatusBadge>;
}

function EffectValue({ value, currency }: { value: number; currency: "BRL" | "USD" }) {
  const { locale } = useI18n();
  if (Math.abs(value) < 0.005) {
    return <span className="text-muted-foreground">{formatCurrency(0, currency, locale)}</span>;
  }
  return (
    <span className={cn("font-semibold", value > 0 ? "text-success" : "text-danger")}>
      {value > 0 ? "+" : "−"}
      {formatCurrency(Math.abs(value), currency, locale)}
    </span>
  );
}

function DecisionRow({ entry, t, locale }: { entry: DecisionLogEntry; t: any; locale: Locale }) {
  return (
    <tr className="border-b border-dashed border-border/40 last:border-b-0">
      <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">
        {new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "short" }).format(entry.date)}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12.5px] font-semibold text-foreground">{displayTicker(entry.ticker)}</span>
          <StatusBadge variant={entry.kind === "buy" ? "default" : "gold"} className="px-1.5 py-0 text-[9px]">
            {entry.kind === "buy" ? t.auditScreen?.buyLabel || "Compra" : t.auditScreen?.sellLabel || "Venda"}
          </StatusBadge>
        </div>
        <div className="truncate text-[10px] text-muted-foreground">{entry.name}</div>
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-mono text-[12px]">
        <div className="text-foreground">{formatCurrency(entry.pricePerShare, entry.currency, locale)}</div>
        {entry.consensusAtDecision != null && (
          <div className="text-[10px] text-muted-foreground">
            {t.auditScreen?.consensusInline || "consenso"} {formatCurrency(entry.consensusAtDecision, entry.currency, locale)}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3">
        <VerdictPill verdict={entry.verdict} t={t} />
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-mono text-[12px]">
        <EffectValue value={entry.effectNative} currency={entry.currency} />
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-mono text-[11px] text-muted-foreground">
        <div>{formatCurrency(entry.feesNative, entry.currency, locale)}</div>
        {entry.taxNative > 0 && (
          <div>
            {t.auditScreen?.taxInline || "imp."} {formatCurrency(entry.taxNative, entry.currency, locale)}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap py-2.5 text-right font-mono text-[12px] font-semibold text-foreground">
        {formatCurrency(entry.totalNative, entry.currency, locale)}
      </td>
    </tr>
  );
}

export function AuditScreen({ summary, isLoading = false }: AuditScreenProps) {
  const { t, locale } = useI18n();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <Skeleton className="h-16 w-full rounded-2xl bg-muted/30" />
        <Skeleton className="h-24 w-full rounded-2xl bg-muted/30" />
        <Skeleton className="h-80 w-full rounded-2xl bg-muted/30" />
      </div>
    );
  }

  const hasEntries = summary.entries.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          {t.auditScreen?.eyebrow || "Seu histórico de decisões"}
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.auditScreen?.title || "Auditoria"}
        </h1>
      </div>

      {summary.overpaidCount > 0 && (
        <InsightBanner
          title={t.auditScreen?.insightTitle || "O que as compras acima do teto custaram"}
          description={
            summary.overpaidExtraShares > 0
              ? (
                  t.auditScreen?.insightDescWithExtras ||
                  "Em {{count}} compras você pagou acima do consenso. Se tivesse esperado o preço voltar à zona de compra, teria {{extraShares}} cotas a mais pelo mesmo dinheiro — e {{extraIncome}}/mês de renda extra."
                )
                  .replace("{{count}}", String(summary.overpaidCount))
                  .replace("{{extraShares}}", formatNumber(summary.overpaidExtraShares, locale, 0))
                  .replace("{{extraIncome}}", formatCurrency(summary.overpaidExtraMonthlyIncomeBRL, "BRL", locale))
              : (
                  t.auditScreen?.insightDesc ||
                  "Em {{count}} compras você pagou acima do consenso, {{amount}} a mais do que precisava."
                )
                  .replace("{{count}}", String(summary.overpaidCount))
                  .replace("{{amount}}", formatCurrency(summary.overpaidTotalBRL, "BRL", locale))
          }
          value={formatCurrency(summary.overpaidTotalBRL, "BRL", locale)}
        />
      )}

      {hasEntries && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricBox
            label={t.auditScreen?.totalBoughtLabel || "Total comprado"}
            value={formatCurrency(summary.totalBoughtBRL, "BRL", locale)}
          />
          <MetricBox
            label={t.auditScreen?.totalSoldLabel || "Total líquido vendido"}
            value={formatCurrency(summary.totalSoldNetBRL, "BRL", locale)}
          />
          <MetricBox
            label={t.auditScreen?.totalFeesLabel || "Taxas pagas"}
            value={formatCurrency(summary.totalFeesBRL, "BRL", locale)}
          />
          <MetricBox
            label={t.auditScreen?.totalTaxLabel || "Impostos pagos"}
            value={formatCurrency(summary.totalTaxBRL, "BRL", locale)}
            variant={summary.totalTaxBRL > 0 ? "danger" : "default"}
          />
        </div>
      )}

      <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-serif text-base font-medium text-foreground">
            {t.auditScreen?.tableTitle || "Suas decisões, revisitadas"}
          </h3>
          {hasEntries && (
            <StatusBadge variant="gold">{t.auditScreen?.tablePill || "aprendizado, não julgamento"}</StatusBadge>
          )}
        </div>

        {!hasEntries ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <History className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {t.auditScreen?.emptyTitle || "Nenhuma decisão registrada ainda"}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              {t.auditScreen?.emptyDesc ||
                "Assim que você confirmar uma compra ou venda, ela aparece aqui — com o consenso da época e o imposto real."}
            </p>
            <Link
              to="/app/add-asset"
              className="mt-1 text-xs font-display font-semibold text-accent-text hover:underline"
            >
              {t.auditScreen?.emptyCta || "Adicionar um ativo →"}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[12.5px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3 text-left font-display font-semibold">{t.auditScreen?.dateHeader || "Data"}</th>
                  <th className="pb-2 pr-3 text-left font-display font-semibold">{t.auditScreen?.assetHeader || "Ativo"}</th>
                  <th className="pb-2 pr-3 text-right font-display font-semibold">{t.auditScreen?.priceHeader || "Preço"}</th>
                  <th className="pb-2 pr-3 text-left font-display font-semibold">{t.auditScreen?.verdictHeader || "Veredito"}</th>
                  <th className="pb-2 pr-3 text-right font-display font-semibold">{t.auditScreen?.effectHeader || "Efeito"}</th>
                  <th className="pb-2 pr-3 text-right font-display font-semibold">{t.auditScreen?.feesTaxHeader || "Taxa/Imp."}</th>
                  <th className="pb-2 text-right font-display font-semibold">{t.auditScreen?.totalHeader || "Total"}</th>
                </tr>
              </thead>
              <tbody>
                {summary.entries.map((entry) => (
                  <DecisionRow key={entry.id} entry={entry} t={t} locale={locale} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
