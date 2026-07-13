import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ResultCard } from "@/components/ceiling/ResultCard";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { assetQueryOptions } from "@/lib/queryOptions";
import type { WatchlistItem } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";
import { Info, Calendar } from "lucide-react";
import { useAssetCardDerived } from "./assetCard/useAssetCardDerived";
import { AssetCardFinancials } from "./assetCard/AssetCardFinancials";

function WowInsights({ item }: { item: WatchlistItem }) {
  const marginStr = item.safetyMargin.toFixed(1);
  const isBargain = item.safetyMargin > 10;
  const isFair = item.safetyMargin >= 0 && item.safetyMargin <= 10;

  let insightText = "";
  let badgeColor = "";
  let iconColor = "";
  if (isBargain) {
    insightText = `Oportunidade de ouro! O ativo está ${marginStr}% abaixo do teto de segurança estipulado.`;
    badgeColor = "bg-emerald-500/5 border-emerald-500/20";
    iconColor = "text-emerald-500";
  } else if (isFair) {
    insightText = `Dentro da margem. O ativo está ${marginStr}% abaixo do teto, próximo do preço justo.`;
    badgeColor = "bg-amber-500/5 border-amber-500/20";
    iconColor = "text-amber-500";
  } else {
    insightText = `Atenção! O ativo está ${Math.abs(item.safetyMargin).toFixed(1)}% acima do teto estipulado.`;
    badgeColor = "bg-rose-500/5 border-rose-500/20";
    iconColor = "text-rose-500";
  }

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  let nextPayment = null;
  if (item.paymentMonths && item.paymentMonths.length > 0) {
    const sorted = [...item.paymentMonths].sort((a, b) => a - b);
    nextPayment = sorted.find((m) => m >= currentMonth) || sorted[0];
  }
  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <div className={`flex flex-col gap-2 rounded-lg border p-4 ${badgeColor}`}>
        <div className={`flex items-center gap-2 font-semibold ${iconColor}`}>
          <Info className="h-4 w-4" />
          <span className="text-foreground">Visão do Investidor</span>
        </div>
        <p className="text-sm text-muted-foreground">{insightText}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex items-center gap-2 font-semibold text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Próximo Pagamento</span>
        </div>
        <p className="text-sm font-medium">
          {nextPayment ? `Mês previsto: ${monthNames[nextPayment - 1]}` : "Sem dados de pagamento previsível."}
        </p>
      </div>
    </div>
  );
}

function AssetHoldings({ item }: { item: WatchlistItem }) {
  const { t } = useI18n();
  const derived = useAssetCardDerived(item);
  return (
    <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t.tabs.portfolio}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <AssetCardFinancials item={item} derived={derived} />
      </div>
    </div>
  );
}

interface AssetDetailSheetProps {
  item: WatchlistItem | null;
  onClose: () => void;
}

export function AssetDetailSheet({ item, onClose }: AssetDetailSheetProps) {
  const { t } = useI18n();

  const query = useQuery({
    ...assetQueryOptions(item?.ticker ?? ""),
    enabled: !!item,
  });

  const asset = useMemo(() => {
    if (!query.data || !item) return null;
    return { ...query.data, type: item.type };
  }, [query.data, item]);

  const loading = !!item && query.isPending;
  const error = query.isError ? t.errors.notFound : null;

  const displayTicker = item?.ticker.replace(/\.SA$/i, "") ?? "";


  return (
    <Sheet open={item != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border/60 bg-background p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle className="text-base font-semibold">
            {displayTicker}
          </SheetTitle>
        </SheetHeader>
        <div className="p-4 sm:p-6">
          {loading && <ResultSkeleton />}
          {!loading && error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}
          {!loading && asset && item && (
            <ErrorBoundary label="asset_detail_sheet">
              <WowInsights item={item} />
              <AssetHoldings item={item} />
              <ResultCard
                asset={asset}
                targetYield={item.targetYield}
                averagePrice={item.averagePrice}
                hideAddToWatchlist
              />
            </ErrorBoundary>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
