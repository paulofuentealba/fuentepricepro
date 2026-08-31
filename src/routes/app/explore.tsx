import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calculator as CalculatorIcon,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Search,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { SnowballScenarioPanel } from "@/components/explore/SnowballScenarioPanel";

export const Route = createFileRoute("/app/explore")({
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
  const [activeTab, setActiveTab] = useState<string>("screener");

  const tools = [
    {
      id: "screener",
      label: t.tabs.screener,
      icon: CalculatorIcon,
      path: "/app/screener",
      description: "Calculadora de Preço Teto, Margem de Segurança Bazin/Graham e consenso Fuente.",
    },
    {
      id: "comparator",
      label: t.tabs.comparator,
      icon: Scale,
      path: "/app/comparator",
      description: "Compare múltiplos ativos lado a lado com métricas de valuation e dividendos.",
    },
    {
      id: "riskradar",
      label: t.tabs.riskRadar,
      icon: ShieldAlert,
      path: "/app/riskradar",
      description: "Matriz de risco, concentração de carteira e alertas de saúde financeira.",
    },
    {
      id: "globalradar",
      label: t.tabs.radar,
      icon: Sparkles,
      path: "/app/globalradar",
      description: "Oportunidades de entrada em ativos abaixo do Preço Teto no Brasil e no exterior.",
    },
    {
      id: "snowball",
      label: t.snowball?.title || "Efeito Bola de Neve",
      icon: TrendingUp,
      path: "/app/snowballeffectsimulator",
      description: "Simulador de reinvestimento de dividendos e aceleração patrimonial.",
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
          Hub integrado de análise, valuation e inteligência quantitativa para suas decisões de investimento.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tool.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tools.map((tool) => {
          const Icon = tool.icon;

          if (tool.id === "snowball") {
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

          return (
            <TabsContent key={tool.id} value={tool.id} className="mt-6">
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent-text">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-base font-medium">{tool.label}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      A visualização agregada desta ferramenta está em preparação para a interface unificada da v4.
                    </p>
                    <div className="mt-4 flex justify-center">
                      <Button asChild variant="outline" className="gap-2">
                        <Link to={tool.path}>
                          <span>Abrir {tool.label} em tela cheia</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
