import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InsightBannerProps {
  title: ReactNode;
  description: ReactNode;
  /** Highlighted value shown on the right, e.g. "R$ 4.280" (Fraunces, gold). */
  value: ReactNode;
  className?: string;
}

/**
 * Reusable version of the prototype's `.insight` gold-gradient banner
 * (`docs/design/fuente-v6-completo.html` — used across Reinvestir, Retirar, O que mudou e
 * Auditoria). Extracted from the inline markup that used to live only in `AskScreen.tsx`.
 */
export function InsightBanner({ title, description, value, className }: InsightBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-[18px] border border-accent bg-gradient-to-br from-accent/15 to-transparent p-5 sm:p-6",
        className,
      )}
    >
      <div className="min-w-[230px] flex-1">
        <h4 className="font-serif text-base font-semibold text-foreground">{title}</h4>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="font-serif text-2xl font-medium text-accent-foreground sm:text-3xl">
        {value}
      </div>
    </div>
  );
}
