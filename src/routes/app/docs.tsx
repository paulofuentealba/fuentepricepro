import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";
import { BookOpen, Calculator, LineChart, Building, Lightbulb } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/app/docs")({
  component: DocsPage,
});

function DocsPage() {
  const { t } = useI18n();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-emerald-500" />
          {t.docs.title}
        </h1>
        <p className="text-muted-foreground">
          {t.docs.consensus.description}
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="bg-background/60 backdrop-blur-md border-emerald-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <Lightbulb className="h-5 w-5" />
              {t.docs.consensus.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            {t.docs.consensus.description}
          </CardContent>
        </Card>

        <Card className="bg-background/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-indigo-400" />
              {t.docs.bazin.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.docs.bazin.description}
            </p>
            <div className="bg-muted/30 p-4 rounded-md font-mono text-sm overflow-x-auto text-foreground/80 border border-muted/50">
              Preço Teto = Dividendo Médio (Últimos Anos) / 0.06
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-400" />
              {t.docs.graham.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.docs.graham.description}
            </p>
            <div className="bg-muted/30 p-4 rounded-md font-mono text-sm overflow-x-auto text-foreground/80 flex items-center gap-2 border border-muted/50">
              <span className="text-muted-foreground">VI = </span>
              <span>
                &radic;<span className="border-t border-foreground/80 px-1">(22.5 &times; LPA &times; VPA)</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-400" />
              {t.docs.gordon.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.docs.gordon.description}
            </p>
            <div className="bg-muted/30 p-4 rounded-md font-mono text-sm overflow-x-auto text-foreground/80 border border-muted/50">
              Preço Justo = (Dividendo Atual &times; (1 + Crescimento)) / (Taxa de Desconto - Crescimento)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
