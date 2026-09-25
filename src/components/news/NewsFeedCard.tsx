import { useI18n } from "@/lib/i18n-provider";
import type { NewsFeedItem } from "@/lib/news/newsFeedLogic";
import { CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

interface NewsFeedCardProps {
  items: NewsFeedItem[];
  onActionClick: (item: NewsFeedItem) => void;
}

export function NewsFeedCard({ items, onActionClick }: NewsFeedCardProps) {
  const { t } = useI18n();

  const renderTitle = (item: NewsFeedItem) => {
    const template =
      (t.newsScreen.feed.templates as Record<string, string>)[item.titleKey] ??
      item.titleKey;
    let res = template;
    for (const [k, v] of Object.entries(item.titleParams)) {
      res = res.replace(`{{${k}}}`, String(v));
    }
    return res;
  };

  const renderDesc = (item: NewsFeedItem) => {
    const template =
      (t.newsScreen.feed.templates as Record<string, string>)[item.descKey] ??
      item.descKey;
    let res = template;
    for (const [k, v] of Object.entries(item.descParams)) {
      res = res.replace(`{{${k}}}`, String(v));
    }
    return res;
  };

  const renderActionLabel = (item: NewsFeedItem) => {
    return (
      (t.newsScreen.feed.actions as Record<string, string>)[item.actionKey] ??
      item.actionKey
    );
  };

  const renderWhen = (daysAgo: number) => {
    if (daysAgo <= 0) return t.newsScreen.feed.timeAgo.today;
    if (daysAgo === 1) return t.newsScreen.feed.timeAgo.yesterday;
    return t.newsScreen.feed.timeAgo.daysAgo.replace("{{days}}", String(daysAgo));
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
      {/* Header with Impact Pill */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <h3 className="font-serif text-base font-semibold text-foreground">
          {t.newsScreen.feed.sectionTitle}
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent/15 text-accent-text border border-accent/20">
          {t.newsScreen.feed.byImpactPill}
        </span>
      </div>

      {/* Feed List */}
      {items.length === 0 ? (
        <div className="py-12 px-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="font-serif text-base font-semibold text-foreground">
            {t.newsScreen.feed.emptyTitle}
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
            {t.newsScreen.feed.emptyDesc}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-dashed divide-border/40">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3.5 p-4 md:px-5 hover:bg-muted/10 transition-colors"
            >
              {/* Severity Icon */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                  item.iconType === "bad"
                    ? "bg-danger/10 text-danger border-danger/20"
                    : item.iconType === "warn"
                    ? "bg-warning/10 text-warning border-warning/20 text-xs"
                    : "bg-success/10 text-success border-success/20"
                }`}
              >
                {item.iconType === "bad" && "!"}
                {item.iconType === "warn" && "▲"}
                {item.iconType === "good" && "↓"}
                {item.iconType === "check" && "✓"}
              </div>

              {/* Feed Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground mb-1 leading-snug">
                  {renderTitle(item)}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {renderDesc(item)}
                </div>
                <button
                  type="button"
                  onClick={() => onActionClick(item)}
                  className="text-xs font-semibold text-accent-text hover:text-accent-text/80 mt-2 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{renderActionLabel(item)}</span>
                </button>
              </div>

              {/* Time indicator */}
              <div className="text-[11px] font-mono text-muted-foreground shrink-0 whitespace-nowrap ml-2 pt-0.5">
                {renderWhen(item.daysAgo)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
