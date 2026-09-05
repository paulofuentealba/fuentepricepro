import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";

export function PortfolioEmptyState() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <h2 className="font-serif text-lg font-semibold text-foreground">{t.portfolio.emptyStateTitle}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t.portfolio.emptyStateDesc}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/app/add-asset">{t.portfolio.emptyStateAddAsset}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/app/import-broker-note">{t.portfolio.emptyStateImportNote}</Link>
        </Button>
      </div>
    </div>
  );
}
