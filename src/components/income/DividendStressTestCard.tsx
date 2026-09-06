import React, { useState } from "react";
import { AlertTriangle, TrendingDown, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { Currency } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface DividendStressTestCardProps {
  monthlyProjectedIncome: number;
  currency?: Currency;
  survivalTargetMonthly?: number;
  className?: string;
}

export function DividendStressTestCard({
  monthlyProjectedIncome,
  currency = "BRL",
  survivalTargetMonthly = 3000,
  className,
}: DividendStressTestCardProps) {
  const [stressCutPct, setStressCutPct] = useState<number>(30); // default 30% cut

  const presets = [
    { label: "Normal (0%)", cut: 0, desc: "Fluxo projetado sem choques" },
    { label: "Queda Moderada (-15%)", cut: 15, desc: "Desaceleração de lucros" },
    { label: "Corte Severo (-30%)", cut: 30, desc: "Crise de commodities / juros altos" },
    { label: "Choque Extremo (-50%)", cut: 50, desc: "Crise sistêmica (estilo 2008/2020)" },
  ];

  const stressedMonthlyIncome = monthlyProjectedIncome * (1 - stressCutPct / 100);
  const monthlyLoss = monthlyProjectedIncome - stressedMonthlyIncome;
  const annualLoss = monthlyLoss * 12;

  const coverageRatioPct =
    survivalTargetMonthly > 0 ? (stressedMonthlyIncome / survivalTargetMonthly) * 100 : 100;
  const isSurviving = stressedMonthlyIncome >= survivalTargetMonthly;

  return (
    <Card
      data-testid="dividend-stress-test-card"
      className={cn("border-border/75 bg-card shadow-xs", className)}
    >
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-accent-text inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-accent-text" />
              STRESS TEST DE FLUXO DE CAIXA
            </span>
            <CardTitle className="mt-1 font-serif text-lg font-bold text-foreground">
              Simulador de Crise e Resiliência de Proventos
            </CardTitle>
            <CardDescription className="text-xs">
              Simule o impacto de cortes nos lucros e dividendos sobre sua renda mensal líquida.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map((p) => (
              <Button
                key={p.cut}
                type="button"
                size="sm"
                variant={stressCutPct === p.cut ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => setStressCutPct(p.cut)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Slider */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-foreground">Intensidade do Corte Hipotético:</span>
            <strong className="font-mono text-danger text-sm">-{stressCutPct}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            step="5"
            value={stressCutPct}
            onChange={(e) => setStressCutPct(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-danger"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0% (Cenário Base)</span>
            <span>-25% (Corte Médio)</span>
            <span>-50% (Crise)</span>
            <span>-70% (Catástrofe)</span>
          </div>
        </div>

        {/* Output Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Renda Mensal Sob Estresse
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">
              {formatCurrency(stressedMonthlyIncome, currency, "ptBR")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              vs {formatCurrency(monthlyProjectedIncome, currency, "ptBR")} projetados
            </div>
          </div>

          <div className="rounded-xl border border-danger/30 bg-danger/5 p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-danger">
              Impacto no Orçamento (Perda)
            </div>
            <div className="text-2xl font-bold font-mono text-danger mt-1">
              -{formatCurrency(monthlyLoss, currency, "ptBR")}/mês
            </div>
            <div className="text-xs text-danger/80 mt-0.5">
              -{formatCurrency(annualLoss, currency, "ptBR")} ao ano
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cobertura de Custo de Vida
            </div>
            <div
              className={cn(
                "text-2xl font-bold font-mono mt-1",
                isSurviving ? "text-success" : "text-warning"
              )}
            >
              {coverageRatioPct.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Meta base de {formatCurrency(survivalTargetMonthly, currency, "ptBR")}/mês
            </div>
          </div>
        </div>

        {/* Diagnosis & Defensive Action */}
        <div
          className={cn(
            "rounded-xl p-4 text-xs leading-relaxed border flex items-start gap-3",
            stressCutPct === 0
              ? "bg-primary/10 border-primary/20 text-foreground"
              : isSurviving
              ? "bg-success/10 border-success/30 text-foreground"
              : "bg-danger/10 border-danger/30 text-foreground"
          )}
        >
          <Sparkles className="h-5 w-5 text-accent-text shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold block">
              {stressCutPct === 0
                ? "Carteira em ritmo normal de proventos."
                : isSurviving
                ? `Carteira blindada: Mesmo com corte de ${stressCutPct}%, sua renda continua cobrindo os custos essenciais.`
                : `Atenção ao déficit: Em um corte de ${stressCutPct}%, seus proventos cobririam apenas ${coverageRatioPct.toFixed(0)}% da meta de custo.`}
            </strong>
            <p className="text-muted-foreground text-[11px]">
              Recomendação inteligente: Para proteger o portfólio contra quedas nos proventos,
              priorize ativos com Dividend Safety Score acima de 80 (geradoras de utilidade pública e seguros) e equilibre a carteira com títulos de Renda Fixa pós-fixada.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
