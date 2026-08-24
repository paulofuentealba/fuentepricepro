import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssetType } from "@/lib/domain";
import type { SearchHit } from "@/lib/apiService.functions";
import { assetQueryOptions } from "@/lib/queryOptions";
import { useI18n } from "@/lib/i18n-provider";
import { useSettings } from "@/lib/settings";
import { TickerSearchField } from "@/components/shared/TickerSearchField";
import { getDisplayAssetType } from "@/lib/formatters";

const ALL_TYPES: AssetType[] = [
  "STOCK_US",
  "STOCK_BR",
  "REIT",
  "FII",
  "ETF",
];

export interface AssetFormValue {
  ticker: string;
  type: AssetType;
  targetYield: number;
  averagePrice: number | null;
  customTaxRate: number | null;
  investingSince: number;
}

interface Props {
  onSubmit: (v: AssetFormValue) => void;
  isSubmitting?: boolean;
  initialTicker?: string | null;
}

export function AssetForm({ onSubmit, isSubmitting, initialTicker }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [manualType, setManualType] = useState<AssetType | null>(null);
  const [editingType, setEditingType] = useState(false);
  const { targetYield: globalYield } = useSettings();
  const [prefill, setPrefill] = useState("");

  useEffect(() => {
    let p = initialTicker ? initialTicker.toUpperCase() : "";
    if (!p) {
      try {
        const sp = sessionStorage.getItem("fuente_prefill_ticker");
        if (sp) {
          p = sp;
          sessionStorage.removeItem("fuente_prefill_ticker");
        }
      } catch {
        // ignore
      }
    }
    if (p) setPrefill(p);
  }, [initialTicker]);

  // Kept for parity with legacy behavior (asset details prefetch); no local
  // state is derived from it here — ResultCard owns that display.
  useQuery({
    ...assetQueryOptions(selected?.ticker ?? ""),
    enabled: !!selected?.ticker,
  });

  const pick = useCallback(
    (hit: SearchHit) => {
      setSelected(hit);
      setManualType(null);
      setEditingType(false);
      onSubmit({
        ticker: hit.ticker,
        type: hit.type,
        targetYield: globalYield,
        averagePrice: null,
        customTaxRate: null,
        investingSince: Date.now(),
      });
    },
    [globalYield, onSubmit],
  );

  const activeType: AssetType | null = manualType ?? selected?.type ?? null;

  const handleDone = useCallback(() => {
    setEditingType(false);
    if (selected && activeType) {
      onSubmit({
        ticker: selected.ticker,
        type: activeType,
        targetYield: globalYield,
        averagePrice: null,
        customTaxRate: null,
        investingSince: Date.now(),
      });
    }
  }, [selected, activeType, globalYield, onSubmit]);

  return (
    <div className="space-y-5">
      <TickerSearchField
        onPick={pick}
        initialQuery={prefill}
        autoPickTicker={prefill || null}
        autoFocus={false}
      />

      {activeType && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t.form.assetType}
          </span>
          {!editingType ? (
            <>
              <Badge className="gap-1 bg-success/15 text-success ring-1 ring-success/30 hover:bg-success/20">
                <Sparkles className="h-3 w-3" />
                {t.types[getDisplayAssetType(activeType)]}
              </Badge>
              <button
                type="button"
                onClick={() => setEditingType(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <Pencil className="h-3 w-3" />
                {t.form.editType}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={activeType} onValueChange={(v) => setManualType(v as AssetType)}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t.types[tp]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={handleDone}
              >
                {t.form.done}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
