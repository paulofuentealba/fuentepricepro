import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useFeatureGate } from "@/lib/useFeatureGate";
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
  const sliderUnlocked = useFeatureGate("sliderUnlocked") as boolean;
  const [showPaywall, setShowPaywall] = useState(false);
  const { t } = useI18n();

  const handleSliderChange = (val: number[]) => {
    if (sliderUnlocked) {
      onChange(val[0]);
    }
  };

  return (
    <div className={`flex flex-col gap-2 min-w-[200px] ${className ?? ""}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground font-medium flex items-center gap-1 uppercase tracking-wider text-xs">
          {label ?? t.form.targetYield}
          {!sliderUnlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </span>
        <span className="font-bold text-foreground">{value.toFixed(1)}%</span>
      </div>

      <div
        className="relative flex items-center h-5"
        onClick={() => {
          if (!sliderUnlocked) {
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
          disabled={!sliderUnlocked}
          className={`flex-1 ${!sliderUnlocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        />
      </div>
      <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
