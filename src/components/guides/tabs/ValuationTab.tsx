import { Link } from "@tanstack/react-router";
import {
  Lightbulb,
  LineChart,
  Calculator,
  Building,
  Sparkles,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { ChartContainer } from "@/components/ui/chart";
import { useI18n } from "@/lib/i18n-provider";

export function ValuationTab() {
  const { t } = useI18n();
  const D = t.docs;
  const DV = D.dividendValuation;

  const chartData = [
    { name: DV.chartCurrentLabel, value: 28, tone: "safe" as const },
    { name: DV.chartCeilingLabel, value: 33.33, tone: "ceiling" as const },
    { name: DV.chartOverLabel, value: 40, tone: "over" as const },
  ];
  const chartColor = {
    safe: "var(--success)",
    ceiling: "var(--muted-foreground)",
    over: "var(--danger)",
  };

  return (
    <>
      {/* O CONSENSO FUENTE */}
      <TabsContent value="consensus" className="mt-0 space-y-6">
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Lightbulb className="h-5 w-5" />
              {D.consensus.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{D.consensus.description}</p>
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <span className="text-xs font-semibold text-foreground">1. Décio Bazin</span>
                <p className="mt-1 text-xs text-muted-foreground">{D.bazin.title} (Preço Teto / DY Alvo)</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <span className="text-xs font-semibold text-foreground">2. Benjamin Graham</span>
                <p className="mt-1 text-xs text-muted-foreground">{D.graham.title} (Valor Intrínseco LPA/VPA)</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <span className="text-xs font-semibold text-foreground">3. Gordon H-Model</span>
                <p className="mt-1 text-xs text-muted-foreground">{D.gordon.title} (Crescimento em 2 Estágios)</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <span className="text-xs font-semibold text-foreground">4. Peter Lynch</span>
                <p className="mt-1 text-xs text-muted-foreground">{D.peterLynch.title} (GARP & PEG)</p>
              </div>
            </div>
            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* MÉTODO BAZIN */}
      <TabsContent value="bazin" className="mt-0 space-y-6">
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
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
              <span className="font-semibold text-primary">Nota Técnica: </span>
              {D.bazin.fiiSpreadNote}
            </div>
            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/explore">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* FÓRMULA DE GRAHAM */}
      <TabsContent value="graham" className="mt-0 space-y-6">
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
            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/comparator">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* MODELO DE GORDON & H-MODEL */}
      <TabsContent value="gordon" className="mt-0 space-y-6">
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
            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/explore">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* MODELO DE PETER LYNCH */}
      <TabsContent value="peter-lynch" className="mt-0 space-y-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-success" />
              {D.peterLynch.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{D.peterLynch.description}</p>
            <div className="rounded-md border border-muted/50 bg-muted/30 p-4 font-mono text-sm text-foreground/80">
              {D.peterLynch.formula}
            </div>
            <div className="rounded-md border border-success/20 bg-success/10 p-3 text-xs text-success">
              {D.peterLynch.example}
            </div>
            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/screener">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* GUIA DE VALUATION POR DIVIDENDOS */}
      <TabsContent value="dividend-valuation" className="mt-0 space-y-6">
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
    </>
  );
}
