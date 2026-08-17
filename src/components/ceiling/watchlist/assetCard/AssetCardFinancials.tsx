import { useCallback, useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPercent, formatCurrency, toIntlLocale } from "@/lib/i18n";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PriceTag } from "../../shared/AssetDataDisplay";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";
import { GoalProgressBar } from "../GoalProgressBar";
import { MetricBox } from "@/components/shared/MetricBox";
import type { AssetDerived } from "./useAssetCardDerived";
import type { AssetMeta } from "../utils";

interface Props {
  item: WatchlistItem;
  derived: AssetDerived;
  activeMargin: number;
}

export function AssetCardFinancials({ item, derived, activeMargin }: Props) {
  const { t, locale } = useI18n();
  const isPositive = activeMargin >= 0;

  const {
    grossIncome,
    isUs,
    netIncome,
    positive,
    hasAvg,
    totalReturn,
    returnPct,
    returnPositive,
    yoc,
  } = derived;

  const stopBubble = useCallback((e: MouseEvent) => e.stopPropagation(), []);
  const stopKeyBubble = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") e.stopPropagation();
  }, []);

  const quantityLabel = useMemo(
    () => new Intl.NumberFormat(toIntlLocale(locale)).format(item.quantity),
    [item.quantity, locale],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <MetricBox
          label={t.watchlist.qtyShort}
          tooltip={<InfoTooltip content={t.tooltips?.computedQty || ""} />}
          value={quantityLabel}
          subValue={
            hasAvg && item.averagePrice != null ? (
              <span>
                {t.watchlist.averagePrice}: <PriceTag value={item.averagePrice} currency={item.currency} />
              </span>
            ) : undefined
          }
        />

        <MetricBox
          label={t.result.safetyMargin}
          tooltip={<InfoTooltip content={t.tooltips?.safetyMargin || ""} />}
          value={
            <div className="flex items-center gap-1">
              {formatPercent(activeMargin, locale, 2)}
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
            </div>
          }
          subValue={t.watchlist.targetYield.replace(
            "{{yield}}",
            formatPercent(item.targetYield, locale, 1),
          )}
          variant={isPositive ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricBox
          label={t.watchlist.projectedIncome}
          value={<PriceTag value={grossIncome} currency={item.currency} />}
          variant="success"
          subValue={
            isUs ? (
              <span>
                {t.watchlist.netIncome}: <PriceTag value={netIncome} currency={item.currency} />
              </span>
            ) : undefined
          }
          tooltip={
            isUs ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={stopBubble}
                    onKeyDown={stopKeyBubble}
                    className="inline-flex items-center justify-center rounded-full text-success/70 hover:text-success"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p>{t.watchlist.netIncomeTip}</p>
                </TooltipContent>
              </Tooltip>
            ) : undefined
          }
        />

        <MetricBox
          label={t.watchlist.totalPosition}
          value={
            hasAvg ? <PriceTag value={derived.currentValue} currency={item.currency} /> : "---"
          }
          subValue={
            hasAvg ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase text-muted-foreground">
                  {t.watchlist.totalCost}:{" "}
                  <PriceTag value={derived.totalCost} currency={item.currency} />
                </span>
                <span
                  className={cn("font-medium", returnPositive ? "text-success" : "text-danger")}
                >
                  {returnPositive ? "+" : ""}
                  <PriceTag
                    value={totalReturn}
                    currency={item.currency}
                    className={returnPositive ? "text-success" : "text-danger"}
                  />{" "}
                  ({returnPositive ? "+" : ""}
                  {formatPercent(returnPct, locale, 2)})
                </span>
              </div>
            ) : (
              t.watchlist.addAvgToTrack
            )
          }
        />
      </div>

      <MetricBox
        label={
          <span className="flex items-center">
            {t.watchlist.yieldOnCost}
            <InfoTooltip
              content={t.tooltips?.yieldOnCost || ""}
              link="/app/docs#yield-on-cost"
              className="ml-1"
            />
          </span>
        }
        value={yoc != null ? formatPercent(yoc, locale, 2) : "---"}
        subValue={yoc == null ? t.watchlist.yocPrompt : undefined}
        variant="success"
        tooltip={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={stopBubble}
                onKeyDown={stopKeyBubble}
                className="inline-flex items-center justify-center rounded-full text-success/70 hover:text-success"
              >
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p>{t.watchlist.yocTip}</p>
            </TooltipContent>
          </Tooltip>
        }
      />

      {item.targetMonthlyIncome != null && item.targetMonthlyIncome > 0 && (
        <GoalProgressBar
          goal={item.targetMonthlyIncome}
          quantity={item.quantity}
          annualDividend={item.annualDividend}
          currency={item.currency}
        />
      )}
    </>
  );
}
