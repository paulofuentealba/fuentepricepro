import { Link } from "@tanstack/react-router";
import {
  RefreshCw,
  Target,
  ShieldAlert,
  Coins,
  Flame,
  ArrowRight,
  TrendingUp,
  Scale,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n-provider";

export function DecisionEnginesTab() {
  const { t } = useI18n();
  const D = t.docs;
  const R = D.reinvestir;
  const CP = D.contributionPlan;
  const W = D.withdraw;
  const S = D.snowball;

  return (
    <>
      {/* REINVESTIR PROVENTOS */}
      <TabsContent value="reinvestir" className="mt-0 space-y-6">
        <Card className="border-success/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <RefreshCw className="h-5 w-5" />
              {R.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{R.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-success">
                  <Coins className="h-4 w-4" />
                  {R.strategySnowballTitle}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {R.strategySnowballDesc}
                </p>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Target className="h-4 w-4" />
                  {R.strategyDeficitTitle}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {R.strategyDeficitDesc}
                </p>
              </div>

              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-accent-text">
                  <RefreshCw className="h-4 w-4" />
                  {R.strategyDripTitle}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {R.strategyDripDesc}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-muted/50 bg-muted/20 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {R.comparisonTitle}
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {R.comparisonDesc}
              </p>
            </div>

            <div className="pt-2">
              <Button asChild size="sm" className="bg-success text-success-foreground hover:bg-success/90">
                <Link to="/app/reinvestir">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* PLANO DE APORTES INTELIGENTE */}
      <TabsContent value="contribution-plan" className="mt-0 space-y-6">
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Target className="h-5 w-5" />
              {CP.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{CP.description}</p>

            <div className="rounded-md border border-muted/50 bg-muted/30 p-4 font-mono text-sm text-foreground/80">
              {D.hareNiemeyerFormula}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Scale className="h-4 w-4 text-primary" />
                  {CP.hareNiemeyerTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {CP.hareNiemeyerDesc}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  {CP.safetyMarginDeficitTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {CP.safetyMarginDeficitDesc}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-accent/20 bg-accent/10 p-4 text-xs text-foreground/90">
              <span className="font-semibold text-accent-text">{CP.exampleTitle}: </span>
              {CP.exampleDesc}
            </div>

            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/contributionplan">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* DESINVESTIMENTO FISCAL */}
      <TabsContent value="withdraw" className="mt-0 space-y-6">
        <Card className="border-warning/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Coins className="h-5 w-5" />
              {W.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{W.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                <h4 className="text-sm font-semibold text-success">
                  {W.harvestingTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {W.harvestingDesc}
                </p>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <h4 className="text-sm font-semibold text-primary">
                  {W.exemption20kTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {W.exemption20kDesc}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-muted/50 bg-muted/20 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {W.priorityOrderTitle}
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {W.priorityOrderDesc}
              </p>
            </div>

            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/withdraw">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* EFEITO BOLA DE NEVE & FIRE */}
      <TabsContent value="snowball" className="mt-0 space-y-6">
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Flame className="h-5 w-5 text-warning" />
              {S.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{S.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <TrendingUp className="h-4 w-4" />
                  {S.crossoverPointTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {S.crossoverPointDesc}
                </p>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  {S.fireMilestonesTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {S.fireMilestonesDesc}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/snowballeffectsimulator">
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
