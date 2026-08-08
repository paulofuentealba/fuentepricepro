import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AssetType } from "@/lib/domain";
import type { SearchHit } from "@/lib/apiService.functions";
import { searchQueryOptions, assetQueryOptions } from "@/lib/queryOptions";
import { useI18n } from "@/lib/i18n-provider";
import { displayTicker } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

const ALL_TYPES: AssetType[] = [
  "STOCK_US",
  "STOCK_BR",
  "REIT",
  "FII",
  "FII_INFRA",
  "FIAGRO",
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
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [manualType, setManualType] = useState<AssetType | null>(null);
  const [editingType, setEditingType] = useState(false);
  const { targetYield: globalYield } = useSettings();
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSubmittedRef = useRef(false);

  const shouldSearch = useMemo(
    () => query.trim().length > 0 && !(selected && selected.ticker === query.toUpperCase()),
    [query, selected],
  );

  useEffect(() => {
    let prefill = initialTicker ? initialTicker.toUpperCase() : "";
    if (!prefill) {
      try {
        const sp = sessionStorage.getItem("fuente_prefill_ticker");
        if (sp) {
          prefill = sp;
          sessionStorage.removeItem("fuente_prefill_ticker");
        }
      } catch {
        // ignore
      }
    }
    if (prefill) setQuery(prefill);
  }, [initialTicker]);

  // Debounce the search input; TanStack Query owns the actual fetch,
  // dedup, and cancellation of stale requests.
  useEffect(() => {
    if (!shouldSearch) {
      setDebouncedQuery("");
      return;
    }
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query, shouldSearch]);

  const searchResult = useQuery(searchQueryOptions(debouncedQuery));

  const suggestions: SearchHit[] = useMemo(() => {
    const raw = searchResult.data ?? [];
    const validRaw = raw.filter((item) => ALL_TYPES.includes(item.type));
    return Array.from(new Map(validRaw.map((item) => [item.ticker, item])).values());
  }, [searchResult.data]);

  const searching = shouldSearch && (searchResult.isFetching || debouncedQuery === "");

  const assetResult = useQuery({
    ...assetQueryOptions(selected?.ticker ?? ""),
    enabled: !!selected?.ticker,
  });

  useEffect(() => {
    if (assetResult.data && selected) {
      const { currentPrice, metrics } = assetResult.data;
      if (currentPrice) {
        // We no longer set state here because it's managed by ResultCard
      }
    }
  }, [assetResult.data, selected]);

  // Auto-select first hit and submit once, when a prefill ticker arrives.
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    if (!initialTicker) return;
    const target = initialTicker.toUpperCase();
    if (query !== target) return;
    const hit = suggestions.find((s) => s.ticker === target) ?? suggestions[0];
    if (!hit) return;
    autoSubmittedRef.current = true;
    setSelected(hit);
    pick(hit, true);
  }, [initialTicker, query, suggestions, globalYield, onSubmit]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [open, suggestions]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlightedIndex]) {
        pick(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const activeType: AssetType | null = manualType ?? selected?.type ?? null;

  function pick(hit: SearchHit) {
    setSelected(hit);
    setQuery(hit.ticker);
    setManualType(null);
    setEditingType(false);
    setOpen(false);
    onSubmit({
      ticker: hit.ticker,
      type: hit.type,
      targetYield: globalYield,
      averagePrice: null,
      customTaxRate: null,
      investingSince: Date.now(),
    });
  }

  return (
    <div className="space-y-5">
      <div ref={containerRef} className="relative z-30 space-y-2">
        <Label htmlFor="ticker" className="text-xs uppercase tracking-wider text-muted-foreground">
          {t.form.ticker}
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="ticker"
            autoComplete="off"
            value={query}
            placeholder={t.form.tickerPlaceholder}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setQuery(v);
              setSelected(null);
              setManualType(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="h-11 pl-9"
          />
        </div>

        {open && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            <ul className="max-h-64 overflow-auto py-1">
              {suggestions.map((a, idx) => (
                <li key={a.ticker}>
                  <button
                    type="button"
                    onClick={() => pick(a)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      highlightedIndex === idx && "bg-accent text-accent-foreground",
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium text-foreground">{displayTicker(a.ticker)}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">{a.name}</span>
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {t.types[a.type]}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {open && shouldSearch && !searching && suggestions.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
            {t.form.noAssetsFound}
          </div>
        )}
        {open && searching && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
            {t.form.searching}
          </div>
        )}
      </div>

      {activeType && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t.form.assetType}
          </span>
          {!editingType ? (
            <>
              <Badge className="gap-1 bg-success/15 text-success ring-1 ring-success/30 hover:bg-success/20">
                <Sparkles className="h-3 w-3" />
                {t.types[activeType]}
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
                onClick={() => setEditingType(false)}
              >
                {t.form.done}
              </Button>
            </div>
          )}
        </div>
      )}

      <div>
        {!selected && query.trim() !== "" && !open && (
          <p className="mt-2 text-center text-xs text-destructive">{t.form.selectAssetError}</p>
        )}
      </div>
    </div>
  );
}
