import { useCallback, useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { Pencil, Share2, Trash2, Zap, MoreHorizontal, Instagram, Scissors } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, displayTicker, formatPercent } from "@/lib/i18n";
import { PriceTag } from "../../shared/AssetDataDisplay";
import { useI18n } from "@/lib/i18n-provider";
import type { LiveQuote } from "@/lib/apiService.functions";
import type { WatchlistItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";
import { flagFor } from "../utils";
import type { PendingCorporateEvent } from "@/lib/corporateEvents";

const ICON_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground";
const ICON_BUTTON_DANGER =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger";

interface Props {
  item: WatchlistItem;
  quote?: LiveQuote;
  pendingEvent?: PendingCorporateEvent | null;
  onShare: () => void;
  onShareInsta: () => void;
  onEdit: () => void;
  onCorporateEvent: () => void;
  onRemove: () => void;
  isSimulation?: boolean;
}

export function AssetCardHeader({
  item,
  quote,
  pendingEvent,
  onShare,
  onShareInsta,
  onEdit,
  onCorporateEvent,
  onRemove,
  isSimulation,
}: Props) {
  const { t, locale } = useI18n();
  const livePrice = quote?.price ?? item.currentPrice;
  const changePct = quote?.changePct ?? null;
  const changeUp = changePct != null && changePct >= 0;

  const stopBubble = useCallback((e: MouseEvent) => e.stopPropagation(), []);
  const stopKeyBubble = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") e.stopPropagation();
  }, []);

  // We no longer need priceLabel memo, we can pass it directly to PriceTag
  // Removed priceLabel memo block

  const risk = useMemo(() => {
    if (item.safetyMargin < 0)
      return {
        level: "high",
        color: "text-rose-500",
        icon: "🔴",
        label: t.watchlist.risk.highCeiling,
      };
    if (item.payoutRatio != null && item.payoutRatio > 100)
      return {
        level: "high",
        color: "text-rose-500",
        icon: "🔴",
        label: t.watchlist.risk.highPayout,
      };
    if (item.payoutRatio != null && item.payoutRatio > 80)
      return {
        level: "medium",
        color: "text-amber-500",
        icon: "🟡",
        label: t.watchlist.risk.medPayout,
      };
    if (item.safetyMargin < 5)
      return {
        level: "medium",
        color: "text-amber-500",
        icon: "🟡",
        label: t.watchlist.risk.medMargin,
      };
    return { level: "low", color: "text-emerald-500", icon: "🟢", label: t.watchlist.risk.low };
  }, [item.safetyMargin, item.payoutRatio, t]);

  const currentYield = livePrice > 0 ? (item.annualDividend / livePrice) * 100 : 0;
  const priceAlert = item.ceilingPrice > 0 && livePrice <= item.ceilingPrice;
  const yieldAlert = item.targetYield > 0 && currentYield >= item.targetYield;

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center flex-wrap gap-2 pr-2">
          <span className="text-base font-semibold text-foreground drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">
            {displayTicker(item.ticker)}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            <span className="mr-1">{flagFor(item.currency)}</span>
            {t.types[item.type]}
          </Badge>
          {item.sector && (
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground border-border/50 bg-accent/20"
            >
              {item.sector}
            </Badge>
          )}
          {isSimulation && (
            <Badge
              variant="outline"
              className="text-[10px] text-amber-500/90 border-amber-500/30 bg-amber-500/10"
            >
              {t.watchlist.simulationBadge}
            </Badge>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-foreground/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
            <PriceTag value={livePrice} currency={item.currency} />
          </span>
          {changePct != null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
                changeUp ? "text-emerald-400/90" : "text-rose-400/90",
              )}
              aria-label={changeUp ? "Up today" : "Down today"}
            >
              {changeUp ? "↑" : "↓"}
              {formatPercent(Math.abs(changePct), locale, 2)}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "px-1.5 py-0 h-5 border-transparent cursor-help transition-transform hover:scale-110",
                  risk.color.replace("text-", "bg-").replace("500", "500/10"),
                  risk.color,
                )}
              >
                <span className="text-[10px]">{risk.icon}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{risk.label}</p>
            </TooltipContent>
          </Tooltip>
          {pendingEvent && (
            <Badge
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onCorporateEvent();
              }}
              className="px-2 py-0 h-5 bg-indigo-500 hover:bg-indigo-600 text-white animate-pulse border-none cursor-pointer transition-transform hover:scale-105 ml-1"
            >
              <span className="text-[10px] font-semibold">{t.publicEvents.detectedBadge}</span>
            </Badge>
          )}
          {(priceAlert || yieldAlert) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="default"
                  className="px-1.5 py-0 h-5 bg-indigo-500 hover:bg-indigo-600 text-white animate-pulse border-none cursor-help transition-transform hover:scale-110"
                >
                  <Zap className="h-3 w-3 fill-white/20" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{priceAlert ? t.watchlist.belowCeiling : t.watchlist.targetYieldReached}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.name}</p>
      </div>
      <div
        className="flex gap-1"
        onClick={stopBubble}
        onKeyDown={stopKeyBubble}
        data-html2canvas-ignore
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t.watchlist.moreOptions} className={ICON_BUTTON}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onShare} className="gap-2 cursor-pointer">
              <Share2 className="h-4 w-4" />
              <span>{t.watchlist.share}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShareInsta} className="gap-2 cursor-pointer">
              <Instagram className="h-4 w-4" />
              <span>{t.global.shareImage}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
              <Pencil className="h-4 w-4" />
              <span>{t.watchlist.edit}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onCorporateEvent();
              }}
              className="gap-2 cursor-pointer"
            >
              <Scissors className="h-4 w-4" />
              <span>{t.corporateEvents.menuTitle}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onRemove}
              className="gap-2 cursor-pointer text-danger focus:text-danger focus:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t.watchlist.delete}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
