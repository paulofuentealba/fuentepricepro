import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import {
  FolderOpen,
  BarChart3,
  Sparkles,
  Lock,
  Calculator as CalculatorIcon,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/ceiling/Header";
import { GuestWarningBanner } from "@/components/ceiling/GuestWarningBanner";
import { FeedbackWidget } from "@/components/ceiling/FeedbackWidget";
import { useI18n } from "@/lib/i18n-provider";
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
      { property: "og:url", content: "https://fuentepricepro.web.app/app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Portfolio Dashboard — Fuente Price Pro" },
      {
        name: "twitter:description",
        content:
          "Interactive calculator, watchlist, cash-flow calendar, and smart allocation for dividend investors.",
      },
    ],
    links: [{ rel: "canonical", href: "https://fuentepricepro.web.app/app" }],
  }),
  component: AppLayout,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

function AppLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  
  const tabs = [
    { key: "screener", path: "/app/screener", label: t.tabs.calculator, icon: CalculatorIcon },
    { key: "myportfolio", path: "/app/myportfolio", label: t.tabs.portfolio, icon: FolderOpen },
    { key: "globalradar", path: "/app/globalradar", label: t.tabs.radar, icon: Sparkles },
    { key: "cashflow", path: "/app/cashflow", label: t.tabs.cashFlow, icon: BarChart3, locked: !user },
    { key: "smartallocation", path: "/app/smartallocation", label: t.tabs.smartAllocation, icon: Sparkles, locked: !user },
    { key: "snowballeffectsimulator", path: "/app/snowballeffectsimulator", label: t.snowball?.title, icon: TrendingUp },
  ];

  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />
      <GuestWarningBanner />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-screen bg-background text-foreground">
            <div className="border-b border-border/60 bg-background/60 backdrop-blur">
              <nav className="mx-auto flex h-auto max-w-6xl justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 px-4 sm:px-6">
                {tabs.map(({ key, path, label, icon: Icon, locked }) => {
                  return (
                    <Link
                      key={key}
                      to={path}
                      activeProps={{ className: "text-foreground bg-transparent group-active-link" }}
                      inactiveProps={{ className: "text-slate-400" }}
                      className="group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none bg-transparent px-4 py-3 text-sm font-medium shadow-none transition-colors hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {locked && <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />}
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-transparent transition-colors group-[.group-active-link]:bg-success" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <FeedbackWidget />
    </div>
  );
}
