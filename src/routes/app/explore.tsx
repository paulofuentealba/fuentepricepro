import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState, useEffect } from "react";
import {
  Activity,
  Calculator as CalculatorIcon,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Search,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-provider";
import { SnowballScenarioPanel } from "@/components/explore/SnowballScenarioPanel";
import { ScreenerScreen } from "@/components/screener/ScreenerScreen";
import { AssetComparator } from "@/components/ceiling/AssetComparator";
import { AssetDeepDiveView } from "@/components/explore/AssetDeepDiveView";

const RiskRadar = lazy(() =>
  import("@/components/ceiling/RiskRadar").then((m) => ({ default: m.RiskRadar })),
);
const DividendRadar = lazy(() =>
  import("@/components/ceiling/DividendRadar").then((m) => ({ default: m.DividendRadar })),
);

function ToolSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 w-full rounded-2xl bg-muted/30" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl bg-muted/30" />
        <Skeleton className="h-64 rounded-2xl bg-muted/30" />
      </div>
    </div>
  );
}

export interface ExploreSearch {
  tab?: string;
  ticker?: string;
}

export const Route = createFileRoute("/app/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
    ticker: typeof search.ticker === "string" ? search.ticker : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explorar Ativos | Fuente Price Pro" },
      {
        name: "description",
        content: "Hub analítico integrado: Calculadora de Preço Teto, Comparador, Radar de Risco e Projeções.",
      },
    ],
  }),
  component: ExplorarPage,
});

export function ExplorarPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState<string>(
    search.tab || (search.ticker ? "deepdive" : "deepdive"),
  );

  useEffect(() => {
    if (search.tab) {
      setActiveTab(search.tab);
    } else if (search.ticker) {
      setActiveTab("deepdive");
    }
  }, [search.tab, search.ticker]);

  const tools = [
    {
      id: "deepdive",
      label: t.tabs?.deepDive || "Raio-X do Ativo",
      icon: Activity,
      description: t.explore?.descriptions?.deepDive || "Análise fundamentalista e consenso 360° do ativo",
    },
    {
      id: "screener",
      label: t.tabs.screener,
      icon: CalculatorIcon,
      description: t.explore.descriptions.screener,
    },
    {
      id: "comparator",
      label: t.tabs.comparator,
      icon: Scale,
      description: t.explore.descriptions.comparator,
    },
    {
      id: "riskradar",
      label: t.tabs.riskRadar,
      icon: ShieldAlert,
      description: t.explore.descriptions.riskRadar,
    },
    {
      id: "globalradar",
      label: t.tabs.radar,
      icon: Sparkles,
      description: t.explore.descriptions.globalRadar,
    },
    {
      id: "snowball",
      label: t.snowball?.title || "Efeito Bola de Neve",
      icon: TrendingUp,
      description: t.explore.descriptions.snowball,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>{t.nav.sections.analyze}</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.nav.exploreAssets}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.explore.subtitle}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full items-center justify-start gap-1 overflow-x-auto scrollbar-none flex-nowrap rounded-none border-b border-border bg-transparent p-0 pb-px">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="flex items-center gap-2 shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tool.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tools.map((tool) => {
          if (tool.id === "deepdive") {
            return (
              <TabsContent key={tool.id} value={tool.id} className="mt-6">
                <AssetDeepDiveView initialTicker={search.ticker} />
              </TabsContent>
            );
          }

          if (tool.id === "snowball") {
            const Icon = tool.icon;
            return (
              <TabsContent key={tool.id} value={tool.id} className="mt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent-text">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-serif text-base font-medium text-foreground">{tool.label}</p>
                    <p className="text-xs text-muted-foreground sm:text-sm">{tool.description}</p>
                  </div>
                </div>
                <SnowballScenarioPanel />
              </TabsContent>
            );
          }

          if (tool.id === "screener") {
            return (
              <TabsContent key={tool.id} value={tool.id} className="mt-6">
                <ScreenerScreen embedded />
              </TabsContent>
            );
          }

          if (tool.id === "comparator") {
            return (
              <TabsContent key={tool.id} value={tool.id} className="mt-6">
                <AssetComparator />
              </TabsContent>
            );
          }

          if (tool.id === "riskradar") {
            return (
              <TabsContent key={tool.id} value={tool.id} className="mt-6">
                <Suspense fallback={<ToolSkeleton />}>
                  <RiskRadar />
                </Suspense>
              </TabsContent>
            );
          }

          return (
            <TabsContent key={tool.id} value={tool.id} className="mt-6">
              <Suspense fallback={<ToolSkeleton />}>
                <DividendRadar />
              </Suspense>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
