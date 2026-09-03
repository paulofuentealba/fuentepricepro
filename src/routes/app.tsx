import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
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
import { Header } from "@/components/ceiling/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { GuestWarningBanner } from "@/components/ceiling/GuestWarningBanner";
import { FeedbackWidget } from "@/components/ceiling/FeedbackWidget";
import { RegulatoryDisclaimerBanner } from "@/components/shared/RegulatoryDisclaimerBanner";
import { useAuth } from "@/lib/auth-provider";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

export const Route = createFileRoute("/app")({
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
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
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
