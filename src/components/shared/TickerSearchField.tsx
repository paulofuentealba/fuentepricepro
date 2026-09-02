import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AssetType } from "@/lib/domain";
import type { SearchHit } from "@/lib/apiService.functions";
import { searchQueryOptions } from "@/lib/queryOptions";
import { useI18n } from "@/lib/i18n-provider";
import { displayTicker, getDisplayAssetType } from "@/lib/i18n";
import { getShareClassBadge } from "@/lib/classify";

const ALL_TYPES: AssetType[] = [
  "STOCK_US",
  "STOCK_BR",
  "REIT",
  "FII",
  "FII_INFRA",
  "FIAGRO",
  "ETF",
];

export interface TickerSearchFieldProps {
  onPick: (hit: SearchHit) => void;
  /** Controlled initial value for the search input (e.g. deep-link prefill). */
  initialQuery?: string;
  /**
   * When set, auto-picks the exact matching suggestion once it becomes
   * available for this ticker — mirrors the prefilled ticker auto-submit.
   * Fires only once per mount.
   */
  autoPickTicker?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  label?: string;
  /** Hides the "select an asset" inline error — some consumers show their own. */
  hideSelectError?: boolean;
}

/**
 * Ticker search input with debounced suggestions, keyboard navigation
 * (↑/↓/Enter/Escape) and click-outside-to-close.
 *
 * Extracted from AssetForm.tsx (Screener) so it can be reused by any
 * consumer that just needs to resolve a `SearchHit` — this component does
 * not decide what happens after a pick, that's entirely up to `onPick`.
 */
export function TickerSearchField({
  onPick,
  initialQuery,
  autoPickTicker,
  placeholder,
  autoFocus,
  label,
  hideSelectError,
}: TickerSearchFieldProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPickedRef = useRef(false);

  const shouldSearch = useMemo(
    () => query.trim().length > 0 && !(selected && selected.ticker === query.toUpperCase()),
    [query, selected],
  );

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

  function pick(hit: SearchHit) {
    setSelected(hit);
    setQuery(hit.ticker);
    setOpen(false);
    onPick(hit);
  }

  // Auto-pick once, when a prefilled ticker's suggestions arrive.
  useEffect(() => {
    if (autoPickedRef.current) return;
    if (!autoPickTicker) return;
    const target = autoPickTicker.toUpperCase();
    if (query !== target) return;
    const hit = suggestions.find((s) => s.ticker === target);
    if (!hit) return;
    autoPickedRef.current = true;
    pick(hit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPickTicker, query, suggestions]);

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

  return (
    <div ref={containerRef} className="relative z-30 space-y-2">
      <Label htmlFor="ticker-search" className="text-xs uppercase tracking-wider text-muted-foreground">
        {label ?? t.form.ticker}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="ticker-search"
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder={placeholder ?? t.form.tickerPlaceholder}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setQuery(v);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-11 pl-9"
        />
      </div>

      {open && shouldSearch && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {searching ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t.form.searching}
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="max-h-64 overflow-auto py-1">
              {suggestions.map((a, idx) => {
                const sc = getShareClassBadge(a.ticker, a.type);
                return (
                  <li key={a.ticker}>
                    <button
                      type="button"
                      onClick={() => pick(a)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 border-l-2 border-transparent px-3 py-2 text-left text-sm hover:bg-accent/10",
                        highlightedIndex === idx && "border-l-accent bg-accent/10",
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          {displayTicker(a.ticker)}
                          {sc && (
                            <span
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                                sc.className,
                              )}
                            >
                              {sc.label}
                            </span>
                          )}
                        </span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{a.name}</span>
                      </span>
                      <Badge variant="secondary" className="shrink-0">
                        {t.types[getDisplayAssetType(a.type)]}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t.form.noAssetsFound}
            </div>
          )}
        </div>
      )}
      {!hideSelectError && !selected && query.trim() !== "" && !open && (
        <p className="mt-2 text-center text-xs text-destructive">{t.form.selectAssetError}</p>
      )}
    </div>
  );
}
