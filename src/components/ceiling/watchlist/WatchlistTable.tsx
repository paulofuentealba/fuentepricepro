import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WatchlistItem } from "@/lib/watchlist";
import type { LiveQuote } from "@/lib/apiService.functions";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/i18n";
import { AssetTicker, PriceTag } from "../shared/AssetDataDisplay";
import { Save, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useWatchlist } from "@/lib/watchlist";

interface WatchlistTableProps {
  items: WatchlistItem[];
  quotes: Record<string, LiveQuote | null>;
}

export function WatchlistTable({ items, quotes }: WatchlistTableProps) {
  const { t } = useI18n();
  const { updateAsync } = useWatchlist();

  const [edits, setEdits] = useState<Record<string, { qty: string; avg: string }>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const initialEdits: Record<string, { qty: string; avg: string }> = {};
      items.forEach((it) => {
        initialEdits[it.id] = {
          qty: String(it.quantity),
          avg: it.averagePrice != null ? String(it.averagePrice) : "",
        };
      });
      setEdits(initialEdits);
    }
  }, [isEditing, items]);

  const handleSave = async () => {
    let invalidCount = 0;
    const validUpdates: Array<{ id: string; quantity: number; averagePrice: number | null }> = [];

    for (const [id, vals] of Object.entries(edits)) {
      const it = items.find((x) => x.id === id);
      if (!it) continue;

      const qtyTrim = vals.qty.trim();
      const newQty = qtyTrim === "" ? NaN : Number(qtyTrim);
      if (!Number.isFinite(newQty) || newQty < 0) {
        invalidCount++;
        continue;
      }

      const avgTrim = vals.avg.trim();
      let avg: number | null = null;
      if (avgTrim !== "") {
        const newAvg = Number(avgTrim);
        if (!Number.isFinite(newAvg) || newAvg < 0) {
          invalidCount++;
          continue;
        }
        avg = newAvg;
      }

      if (it.quantity !== newQty || it.averagePrice !== avg) {
        validUpdates.push({ id, quantity: newQty, averagePrice: avg });
      }
    }

    if (invalidCount > 0) {
      toast.error(
        t.toasts.batchEditInvalidSkipped.replace("{{count}}", String(invalidCount))
      );
    }

    if (validUpdates.length === 0) {
      if (invalidCount === 0) {
        toast.info(t.toasts.noChanges);
      }
      setIsEditing(false);
      return;
    }

    const results = await Promise.allSettled(
      validUpdates.map((u) =>
        updateAsync(u.id, { quantity: u.quantity, averagePrice: u.averagePrice })
      )
    );

    setIsEditing(false);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (succeeded > 0) {
      toast.success(t.toasts.assetsUpdatedCount.replace("{{count}}", String(succeeded)));
    }
    if (failed > 0) {
      toast.error(t.toasts.assetsUpdateFailed.replace("{{count}}", String(failed)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              {t.watchlist.cancel}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-success text-success-foreground hover:bg-success/90 gap-2"
              onClick={handleSave}
            >
              <Save className="h-4 w-4" /> {t.watchlist.saveChanges}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4" /> {t.watchlist.bulkEdit}
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border/60 bg-card/40 overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t.global.asset}</TableHead>
              <TableHead>{t.global.currentPrice}</TableHead>
              <TableHead>{t.global.averagePrice}</TableHead>
              <TableHead>{t.global.quantity}</TableHead>
              <TableHead className="text-right">{t.global.total}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(items || []).map((it) => {
              const quote = quotes[it.ticker];
              const price = quote?.price ?? it.currentPrice;

              return (
                <TableRow key={it.id}>
                  <TableCell>
                    <AssetTicker ticker={it.ticker} type={it.type} />
                  </TableCell>
                  <TableCell>
                    <PriceTag value={price} currency={it.currency} />
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        className="h-8 w-24 text-sm"
                        type="number"
                        step="0.01"
                        min="0"
                        value={edits[it.id]?.avg ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [it.id]: { ...prev[it.id], avg: e.target.value },
                          }))
                        }
                      />
                    ) : (
                      <PriceTag value={it.averagePrice} currency={it.currency} />
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        className="h-8 w-20 text-sm"
                        type="number"
                        step="any"
                        min="0"
                        value={edits[it.id]?.qty ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [it.id]: { ...prev[it.id], qty: e.target.value },
                          }))
                        }
                      />
                    ) : (
                      it.quantity
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <PriceTag
                      value={price !== null ? price * it.quantity : null}
                      currency={it.currency}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
