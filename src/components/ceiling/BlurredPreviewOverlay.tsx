import React from "react";
import { Sparkles, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";

interface BlurredPreviewOverlayProps {
  children: React.ReactNode;
  feature: "cashflow" | "smartallocation";
}

export function BlurredPreviewOverlay({ children, feature }: BlurredPreviewOverlayProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const isCashFlow = feature === "cashflow";
  const title = isCashFlow ? t.previewOverlay.cashflowTitle : t.previewOverlay.smartAllocationTitle;
  const desc = isCashFlow ? t.previewOverlay.cashflowDesc : t.previewOverlay.smartAllocationDesc;

  const bullets = isCashFlow
    ? [
        t.previewOverlay.cashflowBullet1,
        t.previewOverlay.cashflowBullet2,
        t.previewOverlay.cashflowBullet3,
      ]
    : [
        t.previewOverlay.smartAllocationBullet1,
        t.previewOverlay.smartAllocationBullet2,
        t.previewOverlay.smartAllocationBullet3,
      ];

  const handleUnlock = () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
    } else {
      window.dispatchEvent(new CustomEvent("open-subscription-modal"));
    }
  };

  return (
    <div className="relative w-full overflow-hidden min-h-[500px]">
      {/* Real User Content Background with Blur Effect */}
      <div
        className="filter blur-[6px] sm:blur-[8px] opacity-40 pointer-events-none select-none overflow-hidden max-h-[85vh] sm:max-h-[80vh]"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Glassmorphism Conversion Overlay Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 bg-background/30 backdrop-blur-[2px]">
        <div className="bg-background/90 dark:bg-card/90 backdrop-blur-xl border border-primary/20 shadow-2xl rounded-2xl p-6 sm:p-8 max-w-md w-[94%] sm:w-full text-center space-y-5 animate-in zoom-in-95 fade-in duration-300">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm mx-auto">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {desc}
            </p>
          </div>

          <ul className="text-left space-y-2.5 pt-1">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90 font-medium">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2 space-y-2">
            <Button
              onClick={handleUnlock}
              className="w-full h-11 text-sm sm:text-base font-semibold shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {t.previewOverlay.unlockProCta}
            </Button>
            <p className="text-[11px] text-muted-foreground/80 font-medium">
              {t.previewOverlay.guaranteeText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
