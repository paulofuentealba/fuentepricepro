import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useSubscription } from "@/lib/subscription";
import { Lock } from "lucide-react";
import { PaywallDialog } from "./PaywallDialog";
import { useI18n } from "@/lib/i18n-provider";

interface TargetYieldSliderProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  className?: string;
}

export function TargetYieldSlider({ value, onChange, label, className }: TargetYieldSliderProps) {
  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const { t } = useI18n();

  const handleSliderChange = (val: number[]) => {
    if (isPro) {
      onChange(val[0]);
    }
  };

  return (
    <div className={`flex flex-col gap-2 min-w-[200px] ${className ?? ""}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground font-medium flex items-center gap-1 uppercase tracking-wider text-xs">
          {label ?? t.form.targetYield}
          {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
        </span>
        <span className="font-bold text-foreground">{value.toFixed(1)}%</span>
      </div>

      <div
        className="relative flex items-center h-5"
        onClick={() => {
          if (!isPro) {
            setShowPaywall(true);
          }
        }}
      >
        <Slider
          aria-label={t.form.adjustTargetYield}
          value={[value]}
          min={2}
          max={15}
          step={0.1}
          onValueChange={handleSliderChange}
          disabled={!isPro}
          className={`flex-1 ${!isPro ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        />
      </div>
      <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
