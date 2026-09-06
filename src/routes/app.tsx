import { createFileRoute, redirect, Outlet, Link } from "@tanstack/react-router";
import {
  FolderOpen,
  BarChart3,
  Sparkles,
  Lock,
  Calculator as CalculatorIcon,
  TrendingUp,
  Scale,
  Loader2,
} from "lucide-react";
import { useEffect } from "react";
import { Header } from "@/components/ceiling/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { GuestWarningBanner } from "@/components/ceiling/GuestWarningBanner";
import { FeedbackWidget } from "@/components/ceiling/FeedbackWidget";
import { RegulatoryDisclaimerBanner } from "@/components/shared/RegulatoryDisclaimerBanner";
import { useAuth } from "@/lib/auth-provider";
import { auth } from "@/integrations/firebase/client";
import { isDemoModeActive, syncDemoModeVersion } from "@/lib/demoMode";
import { verifySessionFn } from "@/lib/verifySession.functions";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

export const Route = createFileRoute("/app")({
  beforeLoad: async ({ location }) => {
    // Waits for Firebase to resolve the persisted session (same pattern as
    // /settings and /profile) before deciding — avoids a false redirect on
    // a hard refresh while the SDK is still rehydrating auth state.
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (auth.currentUser) return;
    if (isDemoModeActive()) {
      syncDemoModeVersion();
      return;
    }

    // The checks above only ever see a session on a client-side SPA
    // transition — Firebase's client session lives in IndexedDB, which the
    // server can't read, so a hard navigation/reload always looked
    // unauthenticated here even for a real signed-in user or an active demo
    // session. Cross-check the session/demo cookie via Admin SDK before
    // committing to a redirect (see verifySession.functions.ts).
    const { authenticated } = await verifySessionFn();
    if (authenticated) return;

    throw redirect({ to: "/auth", search: { returnTo: location.href } });
  },
  head: () => ({
    meta: [
      { title: "Portfolio Dashboard — Fuente Price Pro" },
      {
        name: "description",
        content:
          "Calculate ceiling prices, track your watchlist, project dividend cash flow, and simulate smart allocations.",
      },
      { property: "og:title", content: "Portfolio Dashboard — Fuente Price Pro" },
      {
        property: "og:description",
        content:
          "Interactive calculator, watchlist, cash-flow calendar, and smart allocation for dividend investors.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fuentepricepro.com/app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Portfolio Dashboard — Fuente Price Pro" },
      {
        name: "twitter:description",
        content:
          "Interactive calculator, watchlist, cash-flow calendar, and smart allocation for dividend investors.",
      },
    ],
    links: [{ rel: "canonical", href: "https://fuentepricepro.com/app" }],
  }),
  component: AppLayout,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

function AppLayout() {
  const { user, loading } = useAuth();

  useEffect(() => {
    syncDemoModeVersion();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />
      <GuestWarningBanner />
      <div className="flex flex-1 overflow-hidden flex-row">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-6 md:pb-0">
          <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1600px] px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-9 transition-all duration-200">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <RegulatoryDisclaimerBanner />
      <FeedbackWidget />
    </div>
  );
}
