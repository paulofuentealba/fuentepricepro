import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-provider";

const RiskRadar = lazy(() =>
  import("@/components/ceiling/RiskRadar").then((m) => ({ default: m.RiskRadar })),
);

export const Route = createFileRoute("/app/riskradar")({
  component: RiskRadarRoute,
});

function RiskRadarSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-2xl bg-muted/30" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl bg-muted/30" />
        <Skeleton className="h-64 rounded-2xl bg-muted/30" />
      </div>
    </div>
  );
}

function RiskRadarRoute() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>{t.nav.sections.analyze}</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.riskRadar.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.riskRadar.subtitle}</p>
      </div>
      <Suspense fallback={<RiskRadarSkeleton />}>
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
          <RiskRadar />
        </div>
      </Suspense>
    </div>
  );
}
