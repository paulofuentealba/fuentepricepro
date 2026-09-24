import { Link } from "@tanstack/react-router";
import {
  Banknote,
  Landmark,
  ShieldCheck,
  FileText,
  Globe,
  Percent,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n-provider";

export function TaxGuideTab() {
  const { t } = useI18n();
  const D = t.docs;
  const TB = D.taxBrazil;
  const TU = D.taxUsa;
  const FI = D.fiInfra;

  return (
    <>
      {/* TRIBUTAÇÃO BRASIL */}
      <TabsContent value="tax-brazil" className="mt-0 space-y-6">
        <Card className="border-success/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <Landmark className="h-5 w-5" />
              {TB.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{TB.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Banknote className="h-4 w-4 text-success" />
                  {TB.stocksTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {TB.stocksDesc}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Percent className="h-4 w-4 text-primary" />
                  {TB.jcpTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {TB.jcpDesc}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent-text" />
                  {TB.fiiTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {TB.fiiDesc}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-warning" />
                  {TB.darfTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {TB.darfDesc}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/tax">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* TRIBUTAÇÃO ESTADOS UNIDOS */}
      <TabsContent value="tax-usa" className="mt-0 space-y-6">
        <Card className="border-accent/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent-text">
              <Globe className="h-5 w-5" />
              {TU.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{TU.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                <h4 className="text-sm font-semibold text-accent-text">
                  {TU.wht30Title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {TU.wht30Desc}
                </p>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <h4 className="text-sm font-semibold text-primary">
                  {TU.reitTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {TU.reitDesc}
                </p>
              </div>

              <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                <h4 className="text-sm font-semibold text-success">
                  {TU.irpfOffsetTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {TU.irpfOffsetDesc}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/tax">
                  {D.openInApp}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* FI-INFRAESTRUTURA */}
      <TabsContent value="fi-infra" className="mt-0 space-y-6">
        <Card className="border-success/30 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <ShieldCheck className="h-5 w-5" />
              {FI.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{FI.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                <h4 className="text-sm font-semibold text-success">
                  {FI.doubleExemptionTitle}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {FI.doubleExemptionDesc}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h4 className="text-sm font-semibold text-foreground">
                  {FI.lei12431Title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {FI.lei12431Desc}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs text-warning/90">
              <div className="flex items-center gap-1.5 font-semibold text-warning">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {FI.riskTitle}
              </div>
              <p className="mt-1.5 leading-relaxed text-muted-foreground">
                {FI.riskDesc}
              </p>
            </div>

            <div className="pt-2">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/app/tax">
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
