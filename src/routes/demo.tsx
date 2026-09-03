import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { startDemoMode } from "@/lib/demoMode";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — Fuente Price Pro" },
      {
        name: "description",
        content: "See Fuente Price Pro in action with a simulated portfolio — no account needed.",
      },
    ],
  }),
  component: DemoPage,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="19" stroke="var(--sidebar-accent)" strokeWidth="1.4" opacity=".35" />
      <circle cx="20" cy="20" r="13.5" stroke="var(--sidebar-accent)" strokeWidth="1.4" opacity=".6" />
      <circle cx="20" cy="20" r="8" fill="var(--sidebar-accent)" />
    </svg>
  );
}

function DemoPage() {
  const { t } = useI18n();
  const D = t.demoPage;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function handleStartExploring() {
    startDemoMode();
    // ValuedPortfolioProvider (mounted at the root layout, so it's already
    // running here on /demo) cached an empty watchlist/transactions result
    // with staleTime: Infinity before this seed — invalidate so /app reads
    // the freshly-written localStorage instead of that stale empty cache.
    queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    navigate({ to: "/app" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar px-6 py-16 text-sidebar-foreground">
      <Link to="/" className="mb-10 flex items-center gap-2.5">
        <BrandMark />
        <div className="font-serif text-lg font-semibold text-sidebar-accent">
          Fuente <span className="text-sidebar-foreground/60">Price Pro</span>
        </div>
      </Link>

      <div className="w-full max-w-2xl text-center">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-accent">
          {D.eyebrow}
        </div>
        <h1 className="mb-4 font-serif text-3xl font-medium leading-[1.15] sm:text-4xl">{D.title}</h1>
        <p className="mx-auto mb-9 max-w-lg text-[14px] leading-relaxed text-sidebar-foreground/65">
          {D.subtitle}
        </p>

        <div className="relative mb-8 flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-sidebar-foreground/10 bg-sidebar-foreground/[0.04]">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-accent/15 ring-1 ring-sidebar-accent/30">
              <Play className="h-6 w-6 text-sidebar-accent" fill="currentColor" />
            </div>
            <p className="text-[12.5px] text-sidebar-foreground/50">{D.videoPlaceholderLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleStartExploring}
            className="absolute bottom-3 right-3 text-[11.5px] font-medium text-sidebar-foreground/50 underline underline-offset-2 hover:text-sidebar-foreground/80"
          >
            {D.skip}
          </button>
        </div>

        <Button
          size="lg"
          onClick={handleStartExploring}
          className="h-11 rounded-lg bg-sidebar-accent font-semibold text-sidebar hover:opacity-90"
        >
          {D.startExploring}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="mt-6">
          <Link to="/" className="text-[12px] text-sidebar-foreground/50 hover:text-sidebar-foreground/80">
            {D.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
