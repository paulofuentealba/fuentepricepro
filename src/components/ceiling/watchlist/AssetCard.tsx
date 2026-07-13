import { memo, useCallback, type KeyboardEvent, useRef } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-provider";
import type { LiveQuote } from "@/lib/apiService.functions";
import type { WatchlistItem } from "@/lib/watchlist";
import type { AssetMeta } from "./utils";
import { AssetCardHeader } from "./assetCard/AssetCardHeader";
import { AssetCardTags } from "./assetCard/AssetCardTags";
import { AssetCardFinancials } from "./assetCard/AssetCardFinancials";
import {
  buildAssetShareText,
  useAssetCardDerived,
} from "./assetCard/useAssetCardDerived";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  item: WatchlistItem;
  quote?: LiveQuote;
  meta?: AssetMeta;
  onEdit: (item: WatchlistItem) => void;
  onRemove: (id: string) => void;
  onOpenDetail: (item: WatchlistItem) => void;
}

function AssetCardImpl({ item, quote, meta, onEdit, onRemove, onOpenDetail }: AssetCardProps) {
  const { t, locale } = useI18n();
  const derived = useAssetCardDerived(item);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);
  const handleRemove = useCallback(() => {
    onRemove(item.id);
    toast.success(t.watchlist.removed);
  }, [item.id, onRemove, t.watchlist.removed]);
  const handleOpenDetail = useCallback(() => onOpenDetail(item), [item, onOpenDetail]);
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenDetail(item);
      }
    },
    [item, onOpenDetail],
  );

  const handleShare = useCallback(async () => {
    const text = buildAssetShareText(item, derived.yoc, locale);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.watchlist.shareCopied);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [item, locale, t.watchlist.shareCopied, derived.yoc]);

  const handleShareInsta = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        filter: (node) => {
          if (node.hasAttribute && node.hasAttribute("data-html2canvas-ignore")) return false;
          return true;
        },
        backgroundColor: "#09090b", // default background for consistency
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${item.ticker}.png`, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: item.ticker,
        });
      } else {
        const link = document.createElement("a");
        link.download = `${item.ticker}-share.png`;
        link.href = dataUrl;
        link.click();
      }
      toast.success(t.watchlist.shareCopied || "Imagem gerada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar imagem");
    }
  }, [item.ticker, t]);

  return (
    <Card
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={handleOpenDetail}
      onKeyDown={handleKey}
      aria-label={`Open details for ${item.ticker.replace(/\.SA$/i, "")}`}
      className={cn(
        "cursor-pointer border-border/40 transition-all focus-visible:outline-none focus-visible:ring-1",
        "bg-background/40 backdrop-blur-sm hover:bg-background/60 hover:shadow-md",
        derived.positive
          ? "hover:border-success/40 hover:shadow-success/5 focus-visible:border-success/60 focus-visible:ring-success/40"
          : "hover:border-danger/40 hover:shadow-danger/5 focus-visible:border-danger/60 focus-visible:ring-danger/40"
      )}
    >
      <CardContent className="space-y-3 pt-5">
        <AssetCardHeader
          item={item}
          quote={quote}
          onShare={handleShare}
          onShareInsta={handleShareInsta}
          onEdit={handleEdit}
          onRemove={handleRemove}
        />
        <AssetCardTags meta={meta} />
        <AssetCardFinancials item={item} derived={derived} />
      </CardContent>
    </Card>
  );
}

export const AssetCard = memo(AssetCardImpl);
