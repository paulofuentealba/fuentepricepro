import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardProps {
  flag: string;
  label: string;
  value: string;
}

function SummaryCardImpl({ flag, label, value }: SummaryCardProps) {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="text-2xl leading-none">{flag}</div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-0.5 truncate text-lg font-bold tabular-nums text-foreground">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const SummaryCard = memo(SummaryCardImpl);
