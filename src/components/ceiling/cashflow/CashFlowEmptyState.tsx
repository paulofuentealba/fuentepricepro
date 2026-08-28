import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-provider";
import { SuccessIconBox } from "@/components/shared/SuccessIconBox";

interface Props {
  onNavigateToCalculator?: () => void;
}

export function CashFlowEmptyState({ onNavigateToCalculator }: Props) {
  const { t } = useI18n();
  return (
    <Card className="rounded-2xl border-dashed border-border bg-card">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <SuccessIconBox icon={Sparkles} size="lg" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t.tabs.cashflow.emptyTitle}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {t.tabs.cashflow.emptyDesc}
          </p>
        </div>
        {onNavigateToCalculator && (
          <Button
            type="button"
            onClick={onNavigateToCalculator}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {t.tabs.cashflow.emptyAddFirstAsset}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
