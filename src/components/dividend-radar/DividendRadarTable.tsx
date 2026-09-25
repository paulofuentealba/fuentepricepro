import React, { useState } from "react";
import { ArrowUpDown, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import type { RadarItem } from "@/lib/dividendRadarLogic";

interface DividendRadarTableProps {
  items: RadarItem[];
  onOpenDetail: (item: RadarItem) => void;
  onInvest: (item: RadarItem) => void;
  formatCurrency: (val: number, currency?: string) => string;
}

type SortField = "ticker" | "price" | "ceilingPrice" | "margin" | "dyGross" | "dyNet" | "payout" | "safetyScore";

export function DividendRadarTable({
  items,
  onOpenDetail,
  onInvest,
  formatCurrency,
}: DividendRadarTableProps) {
  const { t } = useI18n();
  const d = t.dividendRadar;

  const [sortField, setSortField] = useState<SortField>("margin");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    if (aVal == null) aVal = -Infinity;
    if (bVal == null) bVal = -Infinity;
    if (typeof aVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const getScoreBadge = (item: RadarItem) => {
    switch (item.safetyTier) {
      case "very_safe":
      case "safe":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-success">
            <ShieldCheck className="h-3 w-3" />
            {item.safetyScore}
          </span>
        );
      case "caution":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-warning">
            <AlertTriangle className="h-3 w-3" />
            {item.safetyScore}
          </span>
        );
      case "cut_risk":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-danger">
            <ShieldAlert className="h-3 w-3" />
            {item.safetyScore}
          </span>
        );
    }
  };

  return (
    <div
      data-testid="dividend-radar-table"
      className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm scrollbar-none"
    >
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <th className="py-3 px-4">
              <button
                type="button"
                onClick={() => handleSort("ticker")}
                className="flex items-center gap-1 hover:text-foreground cursor-pointer"
              >
                <span>{d.table.colAsset}</span>
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </th>
            <th className="py-3 px-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("price")}
                className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer"
              >
                <span>{d.table.colPrice}</span>
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </th>
            <th className="py-3 px-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("ceilingPrice")}
                className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer"
              >
                <span>{d.table.colCeiling}</span>
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </th>
            <th className="py-3 px-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("margin")}
                className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer"
              >
                <span>{d.table.colMargin}</span>
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </th>
            <th className="py-3 px-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("dyGross")}
                className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer"
              >
                <span>{d.table.colDyGross}</span>
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </th>
            <th className="py-3 px-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("dyNet")}
                className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer"
              >
                <span>{d.table.colDyNet}</span>
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </th>
            <th className="py-3 px-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("payout")}
                className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer"
              >
                <span>{d.table.colPayout}</span>
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </th>
            <th className="py-3 px-3 text-center">
              <button
                type="button"
                onClick={() => handleSort("safetyScore")}
                className="flex items-center gap-1 mx-auto hover:text-foreground cursor-pointer"
              >
                <span>{d.table.colScore}</span>
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </th>
            <th className="py-3 px-3">{d.table.colNextMonth}</th>
            <th className="py-3 px-3">{d.table.colWindowCom}</th>
            <th className="py-3 px-4 text-center">{d.table.colAction}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {sortedItems.map((item) => {
            const isUs = item.currency === "USD";
            const isPositiveMargin = item.margin > 0;

            return (
              <tr
                key={item.ticker}
                onClick={() => onOpenDetail(item)}
                className={cn(
                  "hover:bg-muted/40 transition-colors cursor-pointer",
                  item.isTrap && "bg-warning/5 hover:bg-warning/10"
                )}
              >
                {/* Ticker & Name */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">
                      {item.ticker}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] uppercase px-1 py-0",
                        isUs
                          ? "border-warning/30 text-warning"
                          : "border-primary/30 text-primary"
                      )}
                    >
                      {item.type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-1">
                    {item.name}
                  </div>
                </td>

                {/* Price */}
                <td className="py-3 px-3 text-right font-mono font-medium text-foreground whitespace-nowrap">
                  {formatCurrency(item.price, item.currency)}
                </td>

                {/* Ceiling */}
                <td className="py-3 px-3 text-right font-mono font-semibold text-success whitespace-nowrap">
                  {formatCurrency(item.ceilingPrice, item.currency)}
                </td>

                {/* Margin */}
                <td
                  className={cn(
                    "py-3 px-3 text-right font-mono font-bold whitespace-nowrap",
                    item.isTrap
                      ? "text-warning"
                      : isPositiveMargin
                      ? "text-success"
                      : "text-danger"
                  )}
                >
                  {item.margin >= 0 ? "+" : ""}
                  {item.margin.toFixed(1)}%
                </td>

                {/* Gross DY */}
                <td className="py-3 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                  {item.dyGross.toFixed(1)}%
                </td>

                {/* Real Net DY */}
                <td className="py-3 px-3 text-right font-mono font-bold text-success whitespace-nowrap">
                  {item.dyNet.toFixed(1)}%
                </td>

                {/* Payout */}
                <td
                  className={cn(
                    "py-3 px-3 text-right font-mono whitespace-nowrap",
                    item.isTrap ? "text-danger font-bold" : "text-muted-foreground"
                  )}
                >
                  {item.fcfPayout != null
                    ? `${item.fcfPayout}%`
                    : item.payout != null
                    ? `${item.payout}%`
                    : "—"}
                </td>

                {/* Safety Score */}
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  {getScoreBadge(item)}
                </td>

                {/* Next Month & Consistency */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="font-medium text-foreground">
                    {item.nextMonth}
                  </span>{" "}
                  <span className="text-[10px] text-muted-foreground">
                    ({item.consistency})
                  </span>
                </td>

                {/* Window Com */}
                <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {item.windowCom}
                </td>

                {/* Action button */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={item.isTrap ? "outline" : "default"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.isTrap) {
                        onOpenDetail(item);
                      } else {
                        onInvest(item);
                      }
                    }}
                    className={cn(
                      "h-7 text-[11px] px-2.5",
                      item.isTrap && "border-warning/40 text-warning hover:bg-warning/10"
                    )}
                  >
                    {item.isTrap ? d.card.auditBtn : d.card.investBtn}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
