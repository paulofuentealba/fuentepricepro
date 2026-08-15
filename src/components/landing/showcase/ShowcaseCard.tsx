import { ArrowUpRight, ArrowDownRight, Shield, TrendingUp } from "lucide-react";
import { cleanTicker, type MockCard } from "./cards";
import { useI18n } from "@/lib/i18n-provider";

export function ShowcaseCard({ card }: { card: MockCard }) {
  const { t } = useI18n();
  const toneRing =
    card.marginTone === "success"
      ? "border-success/25 hover:border-success/40"
      : "border-danger/25 hover:border-danger/40";
  const marginTone =
    card.marginTone === "success"
      ? "border-success/30 bg-success/10 text-success"
      : "border-danger/30 bg-danger/10 text-danger";
  const priceToneCls = card.priceTone === "success" ? "text-success" : "text-danger";
  const PriceIcon = card.priceTone === "success" ? ArrowUpRight : ArrowDownRight;
  const displayTicker = cleanTicker(card.ticker);
  const logoLetter = displayTicker.charAt(0);

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border ${toneRing} bg-card/80 p-4 shadow-xl shadow-black/20 backdrop-blur transition-colors`}
    >
      {/* Header: ticker + type + logo */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl font-bold tracking-tight text-foreground">{displayTicker}</div>
          <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span>{card.flag}</span>
            {card.type}
          </span>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">{card.name}</p>
        </div>
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 text-sm font-semibold text-muted-foreground"
        >
          {logoLetter}
        </div>
      </div>

      {/* Main price */}
      <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t.showcase.priceIn} {card.currency}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {card.currentPrice}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${priceToneCls}`}
          >
            <PriceIcon className="h-3.5 w-3.5" />
            {card.priceChange}
          </span>
        </div>
      </div>

      {/* Ceiling + Margin */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-success/25 bg-success/10 p-2.5">
          <div className="flex items-center gap-1 text-success">
            <TrendingUp className="h-3 w-3" />
            <span className="text-[9px] font-medium uppercase tracking-wider">
              {t.showcase.ceilingPrice}
            </span>
          </div>
          <div className="mt-0.5 text-base font-bold text-foreground">{card.ceiling}</div>
        </div>
        <div className={`rounded-lg border p-2.5 ${marginTone}`}>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span className="text-[9px] font-medium uppercase tracking-wider">
              {t.showcase.margin}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground">{card.margin}</span>
          </div>
        </div>
      </div>

      {/* Status footer */}
      <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 mt-3">
        <span
          className={
            "text-[10px] font-semibold uppercase tracking-wider " +
            (card.marginTone === "success" ? "text-success" : "text-danger")
          }
        >
          {t.showcase.status[card.statusKey]}
        </span>
        <span className="text-[10px] text-muted-foreground">Fuente Price Pro</span>
      </div>
    </div>
  );
}
