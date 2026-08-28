import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-provider";

const DividendRadar = lazy(() =>
  import("@/components/ceiling/DividendRadar").then((m) => ({ default: m.DividendRadar })),
);

export const Route = createFileRoute("/app/globalradar")({
  component: GlobalRadarRoute,
});

function GlobalRadarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48 rounded-lg bg-muted/30" />
        <Skeleton className="h-10 w-64 rounded-lg bg-muted/30" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-2xl bg-muted/30" />
    </div>
  );
}

function GlobalRadarRoute() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t.nav.sections.analyze}</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.radar.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.radar.description}</p>
      </div>
      <Suspense fallback={<GlobalRadarSkeleton />}>
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
          <DividendRadar />
        </div>
      </Suspense>
    </div>
  );
}
