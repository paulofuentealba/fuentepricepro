import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatPercent, toIntlLocale } from "@/lib/i18n";
import type { ThesisSnapshot } from "@/lib/transactions";
import type { Currency } from "@/lib/domain";

interface ThesisSnapshotModalProps {
  snapshot: ThesisSnapshot | null | undefined;
  ticker: string;
  currency?: Currency;
  open: boolean;
  onClose: () => void;
}

export function ThesisSnapshotModal({
  snapshot,
  ticker,
  currency = "BRL",
  open,
  onClose,
}: ThesisSnapshotModalProps) {
  const { t, locale } = useI18n();

  if (!snapshot) return null;

  const intlLocale = toIntlLocale(locale);
  const formattedDate = snapshot.capturedAt
    ? new Intl.DateTimeFormat(intlLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(snapshot.capturedAt))
    : "";

  const margin = snapshot.safetyMarginVsConsensus;
  const isMarginPositive = margin != null && margin > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg" closeLabel={t.common.close}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent-text">
              <Sparkles className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg font-semibold">
              {t.transactionsLedger.thesisModal.title.replace("{{ticker}}", ticker)}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.transactionsLedger.thesisModal.subtitle}
          </DialogDescription>
        </DialogHeader>

        {snapshot.isYieldTrap && (
          <div className="flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            <ShieldAlert className="h-4 w-4 shrink-0 text-danger" />
            <span>
              {t.auditScreen.verdicts.yield_trap}
            </span>
          </div>
        )}

        {snapshot.unavailableReason && !snapshot.consensusPrice && (
          <div className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
            <span>
              {t.auditScreen.verdicts.no_data}
            </span>
          </div>
        )}

        {/* Primary KPIs Grid */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t.transactionsLedger.thesisModal.purchasePrice}
            </p>
            <p className="mt-1 font-mono text-base font-semibold text-foreground">
              {formatCurrency(snapshot.purchasePrice, currency, locale)}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t.transactionsLedger.thesisModal.ceilingPrice}
            </p>
            <p className="mt-1 font-mono text-base font-semibold text-foreground">
              {snapshot.consensusPrice != null
                ? formatCurrency(snapshot.consensusPrice, currency, locale)
                : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t.transactionsLedger.thesisModal.safetyMargin}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              {margin != null ? (
                <Badge
                  variant="outline"
                  className={
                    isMarginPositive
                      ? "border-success/30 bg-success/10 text-success font-mono"
                      : "border-danger/30 bg-danger/10 text-danger font-mono"
                  }
                >
                  {isMarginPositive ? "+" : ""}
                  {formatPercent(margin, locale)}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t.transactionsLedger.thesisModal.piotroskiScore}
            </p>
            <p className="mt-1 font-mono text-base font-semibold text-foreground">
              {snapshot.piotroskiScore != null ? `${snapshot.piotroskiScore}/9` : "—"}
            </p>
          </div>
        </div>

        {/* Detailed Methods Breakdown */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.auditScreen.consensusHeader}
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-lg bg-muted/30 p-2">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Bazin</span>
              <p className="mt-0.5 font-mono text-xs font-medium text-foreground">
                {snapshot.bazinPrice != null
                  ? formatCurrency(snapshot.bazinPrice, currency, locale)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Graham / Lynch</span>
              <p className="mt-0.5 font-mono text-xs font-medium text-foreground">
                {snapshot.grahamPrice != null
                  ? formatCurrency(snapshot.grahamPrice, currency, locale)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Gordon</span>
              <p className="mt-0.5 font-mono text-xs font-medium text-foreground">
                {snapshot.gordonPrice != null
                  ? formatCurrency(snapshot.gordonPrice, currency, locale)
                  : "—"}
              </p>
            </div>
          </div>

          {(snapshot.dividendYield != null || snapshot.payoutRatio != null) && (
            <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs text-muted-foreground">
              {snapshot.dividendYield != null && (
                <span>
                  DY on Cost: <strong className="text-foreground">{formatPercent(snapshot.dividendYield, locale)}</strong>
                </span>
              )}
              {snapshot.payoutRatio != null && (
                <span>
                  Payout: <strong className="text-foreground">{formatPercent(snapshot.payoutRatio, locale)}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {formattedDate && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              {snapshot.valuationVersion}
            </span>
            <span>{formattedDate}</span>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.transactionsLedger.thesisModal.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
