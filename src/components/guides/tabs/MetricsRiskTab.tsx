import { Link } from "@tanstack/react-router";
import {
  Percent,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Scale,
  AlertTriangle,
  ArrowRight,
  Globe,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n-provider";

export function MetricsRiskTab() {
  const { t } = useI18n();
  const D = t.docs;
  const M = D.metrics;
  const R = D.riskRadar;
  const CD = D.currencyDecomposition;

  return (
    <>
      {/* MÉTRICAS ESSENCIAIS */}
      <TabsContent value="metrics" className="mt-0 grid gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {M.safetyMargin.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {M.safetyMargin.description}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-5 w-5 text-primary" />
              {M.yieldOnCost.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {M.yieldOnCost.description}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-warning" />
              {M.payout.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {M.payout.description}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-accent-text" />
              {M.cagr.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {M.cagr.description}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-5 w-5 text-accent-text" />
              {M.dyVsYoc.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {M.dyVsYoc.description}
          </CardContent>
        </Card>
      </TabsContent>

      {/* RADAR DE RISCOS */}
      <TabsContent value="risk-radar" className="mt-0 grid gap-6">
        <Card className="border-warning/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-warning">
              <AlertTriangle className="h-5 w-5" />
              {R.sectorConcentration.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {R.sectorConcentration.description}
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-warning">
              <AlertTriangle className="h-5 w-5" />
              {R.assetConcentration.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {R.assetConcentration.description}
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {R.payoutRisk.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {R.payoutRisk.description}
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {R.yieldTrap.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {R.yieldTrap.description}
          </CardContent>
        </Card>

        <div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/app/riskradar">
              {D.openInApp}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </TabsContent>

      {/* DECOMPOSIÇÃO CAMBIAL */}
      <TabsContent value="currency-decomposition" className="mt-0 space-y-6">
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Globe className="h-5 w-5" />
              {CD.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{CD.description}</p>

            <div className="rounded-md border border-muted/50 bg-muted/30 p-4 font-mono text-sm text-foreground/80">
              {D.fxDecompositionFormula}
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <h4 className="text-sm font-semibold text-foreground">
                {CD.assetVsFxTitle}
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {CD.assetVsFxDesc}
              </p>
            </div>

            <div className="rounded-lg border border-accent/20 bg-accent/10 p-4 text-xs text-foreground/90">
              <span className="font-semibold text-accent-text">{CD.exampleTitle}: </span>
              {CD.exampleDesc}
            </div>

            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/myportfolio">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
}
