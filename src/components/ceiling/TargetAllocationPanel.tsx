import { useState, useEffect } from "react";
import { PieChart, ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n-provider";
import type { AssetType } from "@/lib/domain";
import { cn } from "@/lib/utils";

const ASSET_TYPES: AssetType[] = [
  "STOCK_BR",
  "STOCK_US",
  "FII",
  "REIT",
  "ETF",
  "FII_INFRA",
  "FIAGRO"
];

interface Props {
  targets: Record<AssetType, number>;
  onChange: (newTargets: Record<AssetType, number>) => void;
}

export function TargetAllocationPanel({ targets, onChange }: Props) {
  const { t } = useI18n();
  const [total, setTotal] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const sum = Object.values(targets).reduce((a, b) => a + (b || 0), 0);
    setTotal(sum);
  }, [targets]);

  const handleChange = (type: AssetType, val: string | number) => {
    const num = val === "" ? 0 : typeof val === "string" ? parseFloat(val) : val;
    onChange({ ...targets, [type]: num });
  };

  return (
    <div className="rounded-lg border border-border/60 bg-background/40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{t.smartAllocation.targetPanelTitle}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-xs font-medium", total === 100 ? "text-success" : total > 100 ? "text-danger" : "text-muted-foreground")}>
            {t.smartAllocation.targetTotal.replace("{{total}}", String(total))}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/60 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ASSET_TYPES.map(type => (
              <div key={type} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.types[type] || type}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={targets[type] === 0 ? "" : targets[type]}
                    onChange={e => handleChange(type, e.target.value)}
                    className="pr-6 h-8 text-sm"
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                </div>
                <Slider 
                  min={0}
                  max={100}
                  step={1}
                  value={[targets[type] || 0]}
                  onValueChange={(val) => handleChange(type, val[0])}
                  className="mt-2"
                />
              </div>
            ))}
          </div>

          {total !== 100 && (
            <div className={cn("mt-4 text-xs font-medium", total > 100 ? "text-danger" : "text-muted-foreground")}>
              {t.smartAllocation.targetTotalIdeal}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
