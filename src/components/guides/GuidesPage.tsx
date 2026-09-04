import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Calculator,
  LineChart,
  Building,
  Lightbulb,
  Search,
  AlertCircle,
  Percent,
  ShieldCheck,
  Scale,
  Banknote,
  HelpCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ChartContainer } from "@/components/ui/chart";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

export type GuideTabId =
  | "dividend-valuation"
  | "consensus"
  | "bazin"
  | "graham"
  | "gordon"
  | "metrics"
  | "concepts"
  | "risk-radar"
  | "brokers"
  | "glossary";

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.4" opacity=".35" />
      <circle cx="20" cy="20" r="13.5" stroke="var(--accent)" strokeWidth="1.4" opacity=".6" />
      <circle cx="20" cy="20" r="8" fill="var(--accent)" />
    </svg>
  );
}

const CONTAINER = "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8";

interface GuidesPageProps {
  defaultTab?: GuideTabId;
}

export function GuidesPage({ defaultTab = "consensus" }: GuidesPageProps) {
  const { t } = useI18n();
  const D = t.docs;
  const DV = D.dividendValuation;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<GuideTabId>(defaultTab);

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

  const matches = useMemo(() => {
    const term = searchTerm.trim();
    return (...parts: string[]) => {
      if (!term) return true;
      const needle = normalize(term);
      return parts.some((p) => normalize(p).includes(needle));
    };
  }, [searchTerm]);

  // Illustrative example only — mirrors the worked example in the Dividend
  // Valuation tab ($2.00 avg dividend / 6% target = $33.33 ceiling), not
  // live data. Colors are semantic: below ceiling = safe (success), above
  // ceiling = expensive (danger), matching the app's own valuation screens.
  const chartData = [
    { name: DV.chartCurrentLabel, value: 28, tone: "safe" as const },
    { name: DV.chartCeilingLabel, value: 33.33, tone: "ceiling" as const },
    { name: DV.chartOverLabel, value: 40, tone: "over" as const },
  ];
  const chartColor = { safe: "var(--success)", ceiling: "var(--muted-foreground)", over: "var(--danger)" };

  const tabs: { id: GuideTabId; label: string; icon: typeof BookOpen }[] = [
    { id: "consensus", label: D.consensus.title, icon: Lightbulb },
    { id: "bazin", label: D.bazin.title, icon: LineChart },
    { id: "graham", label: D.graham.title, icon: Calculator },
    { id: "gordon", label: D.gordon.title, icon: Building },
    { id: "dividend-valuation", label: DV.title, icon: Gauge },
    { id: "metrics", label: D.metrics.title, icon: Percent },
    { id: "concepts", label: D.concepts.title, icon: ShieldCheck },
    { id: "risk-radar", label: D.riskRadar.title, icon: AlertTriangle },
    { id: "brokers", label: D.supportedBrokers.title, icon: FileText },
    { id: "glossary", label: D.glossary.title, icon: HelpCircle },
  ];

  const visibleTabs = tabs.filter((tab) => matches(tab.label));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className={`${CONTAINER} flex items-center justify-between py-4`}>
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Fuente Price Pro
            </span>
          </Link>
          <Button asChild size="sm" className="bg-success text-success-foreground hover:bg-success/90">
            <Link to="/app">{t.landing.openApp}</Link>
          </Button>
        </div>
      </header>

      <main className={`${CONTAINER} py-12 md:py-16`}>
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-success">
            {t.docs.navLink}
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            <BookOpen className="h-8 w-8 text-primary" />
            {D.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {D.description}
          </p>
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={D.searchPlaceholder}
            className="bg-card pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as GuideTabId)}
          className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-[220px_1fr] md:items-start"
        >
          {/* Mobile: pill scroller — native scrollbar hidden, edge fade signals more content */}
          <nav className="relative -mx-4 px-4 md:hidden">
            <div className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === tab.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
          </nav>

          {/* Desktop: sticky sidebar index — no scroll, no cramped truncation */}
          <nav className="hidden md:block">
            <div className="sticky top-24 space-y-0.5">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0">
          <TabsContent value="consensus" className="mt-0">
            <Card className="border-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Lightbulb className="h-5 w-5" />
                  {D.consensus.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.consensus.description}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bazin" className="mt-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-accent-text" />
                  {D.bazin.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{D.bazin.description}</p>
                <div className="rounded-md border border-muted/50 bg-muted/30 p-4 font-mono text-sm text-foreground/80">
                  {D.bazinFormula}
                </div>
                <div className="rounded-md border border-accent/20 bg-accent/10 p-3 text-xs text-accent-text/90">
                  {D.bazin.example}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="graham" className="mt-6">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-warning" />
                  {D.graham.title}
                </CardTitle>
                <Badge variant="destructive" className="ml-2 border-destructive/30 bg-destructive/15 font-medium text-destructive">
                  {D.graham.notApplicableBadge}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{D.graham.description}</p>
                <p className="text-xs text-destructive/80">* {D.graham.notApplicableReason}</p>
                <div className="flex items-center gap-2 rounded-md border border-muted/50 bg-muted/30 p-4 font-mono text-sm text-foreground/80">
                  <span className="text-muted-foreground">VI = </span>
                  <span>
                    &radic;
                    <span className="border-t border-foreground/80 px-1">(22.5 &times; LPA &times; VPA)</span>
                  </span>
                </div>
                <div className="rounded-md border border-warning/20 bg-warning/10 p-3 text-xs text-warning/90">
                  {D.graham.example}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gordon" className="mt-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-accent-text" />
                  {D.gordon.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{D.gordon.description}</p>
                <div className="rounded-md border border-muted/50 bg-muted/30 p-4 font-mono text-sm text-foreground/80">
                  {D.gordonFormula}
                </div>
                <div className="rounded-md border border-accent/20 bg-accent/10 p-3 text-xs text-accent-text/90">
                  {D.gordon.example}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dividend-valuation" className="mt-6 space-y-6">
            <Card className="border-success/30 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <Gauge className="h-5 w-5" />
                  {DV.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm leading-relaxed text-muted-foreground">{DV.intro}</p>

                <section>
                  <h3 className="text-base font-semibold text-foreground">{DV.yieldFormulaTitle}</h3>
                  <div className="mt-3 rounded-md border border-muted/50 bg-muted/30 p-4 font-mono text-sm text-foreground/80">
                    {DV.yieldFormula}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{DV.yieldFormulaBody}</p>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-foreground">{DV.ceilingFormulaTitle}</h3>
                  <div className="mt-3 rounded-md border border-success/40 bg-success/10 p-4 font-mono text-sm text-foreground">
                    {D.bazinFormula}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{DV.ceilingFormulaBody}</p>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-foreground">{DV.exampleTitle}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{DV.exampleIntro}</p>
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                    <li>{DV.exampleStep1}</li>
                    <li>{DV.exampleStep2}</li>
                    <li>{DV.exampleStep3}</li>
                  </ol>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{DV.exampleNote}</p>

                  <div className="mt-5 h-[180px] w-full">
                    <ChartContainer config={{}} className="h-full w-full">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tickLine={false}
                          axisLine={false}
                          fontSize={11}
                          tick={{ fill: "var(--muted-foreground)" }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={chartColor[entry.tone]} />
                          ))}
                          <LabelList
                            dataKey="value"
                            position="right"
                            className="fill-foreground"
                            fontSize={11}
                            formatter={(v: number) => `$${v.toFixed(2)}`}
                          />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-foreground">{DV.edgeCasesTitle}</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    <li>{DV.edgeCaseCuts}</li>
                    <li>{DV.edgeCaseTax}</li>
                    <li>{DV.edgeCaseCurrency}</li>
                    <li>{DV.edgeCaseMonthly}</li>
                  </ul>
                </section>

                <div className="rounded-2xl border border-success/30 bg-success/5 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success ring-1 ring-success/30">
                      <Calculator className="h-5 w-5" />
                    </div>
                    <div>
                      <Button asChild size="lg" className="mt-1 bg-success text-success-foreground hover:bg-success/90">
                        <Link to="/app">
                          {t.landing.openApp}
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="mt-6 grid gap-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  {D.metrics.safetyMargin.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.metrics.safetyMargin.description}
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Percent className="h-5 w-5 text-primary" />
                  {D.metrics.yieldOnCost.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.metrics.yieldOnCost.description}
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  {D.metrics.payout.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.metrics.payout.description}
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-accent-text" />
                  {D.metrics.cagr.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.metrics.cagr.description}
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="h-5 w-5 text-accent-text" />
                  {D.metrics.dyVsYoc.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.metrics.dyVsYoc.description}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="concepts" className="mt-6 grid gap-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-5 w-5 text-primary" />
                  {D.concepts.snowball.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.concepts.snowball.description}
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Banknote className="h-5 w-5 text-destructive" />
                  {D.concepts.taxes.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.concepts.taxes.description}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk-radar" className="mt-6 grid gap-6">
            <Card className="border-warning/20 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  {D.riskRadar.sectorConcentration.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.riskRadar.sectorConcentration.description}
              </CardContent>
            </Card>
            <Card className="border-warning/20 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  {D.riskRadar.assetConcentration.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.riskRadar.assetConcentration.description}
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {D.riskRadar.payoutRisk.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.riskRadar.payoutRisk.description}
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {D.riskRadar.yieldTrap.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {D.riskRadar.yieldTrap.description}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brokers" className="mt-6 space-y-6">
            <p className="text-sm text-muted-foreground">{D.supportedBrokers.description}</p>
            <Card className="border-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-primary">
                  <FileText className="h-5 w-5" />
                  {D.supportedBrokers.sinacorTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{D.supportedBrokers.sinacorDesc}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    ["XP", "02.332.886/0001-04"],
                    ["Clear", "02.332.886/0011-78"],
                    ["Rico", "02.332.886/0016-82"],
                    ["Modal", "05.389.174/0001-01"],
                    ["BTG Pactual", "43.815.158/0001-22"],
                    ["Banco Inter", "18.945.670/0001-46"],
                    ["NuInvest", "62.169.875/0001-79"],
                    ["Órama", "13.293.225/0001-25"],
                    ["Genial", "27.652.684/0001-62"],
                  ].map(([name, cnpj]) => (
                    <Badge key={name} variant="outline" className="justify-between p-2 font-normal">
                      <span className="font-semibold">{name}</span>
                      <span className="text-[10px] text-muted-foreground">{cnpj}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-accent/20 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-accent-text">
                  <Building className="h-5 w-5" />
                  {D.supportedBrokers.internationalTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {D.supportedBrokers.internationalDesc}
                </p>
                <Badge variant="outline" className="justify-between p-2 font-normal">
                  <span className="font-semibold">Charles Schwab</span>
                  <span className="text-[10px] text-muted-foreground">International Account</span>
                </Badge>
              </CardContent>
            </Card>
            <Card className="border-warning/20 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-warning">
                  <AlertCircle className="h-5 w-5" />
                  {D.supportedBrokers.fallbackTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{D.supportedBrokers.fallbackDesc}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    ["Itaú", "61.194.353/0001-64"],
                    ["Bradesco/Ágora", "74.014.747/0001-35"],
                    ["Santander/Toro", "51.014.223/0001-49"],
                  ].map(([name, cnpj]) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="justify-between border-warning/30 p-2 font-normal text-warning/90"
                    >
                      <span className="font-semibold text-warning">{name}</span>
                      <span className="text-[10px]">{cnpj}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="glossary" className="mt-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  {D.glossary.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(
                  [
                    ["FII", D.glossary.fii],
                    ["REIT", D.glossary.reit],
                    ["LPA / EPS", D.glossary.lpa],
                    ["VPA / Book Value", D.glossary.vpa],
                    ["JCP", D.glossary.jcp],
                  ] as const
                ).map(([term, desc]) => (
                  <div key={term} className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{term}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
