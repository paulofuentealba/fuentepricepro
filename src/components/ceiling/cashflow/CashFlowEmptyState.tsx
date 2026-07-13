import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-provider";

interface Props {
  onNavigateToCalculator?: () => void;
}

export function CashFlowEmptyState({ onNavigateToCalculator }: Props) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  return (
    <Card className="border-dashed border-border/60 bg-card/30">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isEn
              ? "Your cash-flow story starts here"
              : "Sua história de fluxo de caixa começa aqui"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {isEn
              ? "Add dividend-paying assets to see a projected 12-month calendar, snowball line, and per-month breakdown."
              : "Adicione ativos pagadores de dividendos para ver o calendário anual, a curva de snowball e o detalhamento mensal."}
          </p>
        </div>
        {onNavigateToCalculator && (
          <Button
            type="button"
            onClick={onNavigateToCalculator}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {isEn ? "Add your first asset" : "Adicione seu primeiro ativo"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
