import React, { useState } from "react";
import { Copy, Check, FileText, Building2, Coins, ShieldCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { TaxRealityContext } from "@/lib/tax/buildTaxContext";
import { cn } from "@/lib/utils";

interface IrpfMirrorReportProps {
  valuedItems: ValuedWatchlistItem[];
  context: TaxRealityContext;
  currentYear?: number;
}

export function IrpfMirrorReport({
  valuedItems,
  context,
  currentYear = new Date().getFullYear(),
}: IrpfMirrorReportProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseYear = currentYear;
  const previousYear = baseYear - 1;

  const copyToClipboard = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedId(id);
        toast.success(`Discriminação copiada: ${label}`);
        setTimeout(() => setCopiedId(null), 2500);
      },
      () => {
        toast.error("Não foi possível copiar para a área de transferência.");
      }
    );
  };

  // 1. BENS E DIREITOS (Custódia Ativa)
  const activePositions = valuedItems.filter(
    (it) => !it.isClosedPosition && (it.quantity ?? 0) > 0
  );

  const formatBensDiscriminação = (item: ValuedWatchlistItem) => {
    const qty = item.quantity ?? 0;
    const avgPrice = item.averagePrice ?? item.currentPrice ?? 0;
    const costBasis = qty * avgPrice;
    const brokerStr = (item as any).broker ? `custodiadas na corretora ${(item as any).broker}` : "custodiadas em corretora autorizada";

    if (item.type === "FII") {
      return `${qty} cotas do Fundo Imobiliário ${item.ticker} (${item.name}), ${brokerStr}, ao custo total de aquisição de ${formatCurrency(costBasis, "BRL", "ptBR")}, com preço médio ponderado de ${formatCurrency(avgPrice, "BRL", "ptBR")} por cota.`;
    }
    if (item.type === "STOCK_BR") {
      return `${qty} ações de ${item.ticker} (${item.name}), ${brokerStr}, ao custo total de aquisição de ${formatCurrency(costBasis, "BRL", "ptBR")}, com preço médio de ${formatCurrency(avgPrice, "BRL", "ptBR")} por ação.`;
    }
    if (item.type === "STOCK_US" || (item.type as string) === "ETF_US") {
      return `${qty} ativos no exterior de ${item.ticker} (${item.name}), ${brokerStr}, adquiridas pelo custo em moeda estrangeira de US$ ${(qty * avgPrice).toFixed(2)} (equivalente ao custo de aquisição declarado na fonte).`;
    }
    if (item.type === "FIXED_INCOME") {
      return `Aplicação financeira de Renda Fixa ${item.ticker} (${item.name}), ${brokerStr}, saldo principal investido de ${formatCurrency(costBasis, "BRL", "ptBR")}.`;
    }
    return `${qty} cotas/ações de ${item.ticker} (${item.name}), ${brokerStr}, ao custo total de aquisição de ${formatCurrency(costBasis, "BRL", "ptBR")}.`;
  };

  const getIrpfGroupCode = (type: string) => {
    switch (type) {
      case "STOCK_BR":
        return { group: "03 - Participações Societárias", code: "01 - Ações (inclusive as listadas em bolsa)" };
      case "FII":
        return { group: "07 - Fundos", code: "03 - Fundos de Investimento Imobiliário (FII)" };
      case "ETF_BR":
        return { group: "07 - Fundos", code: "02 - Fundos de Investimento de Ações e ETFs" };
      case "STOCK_US":
      case "ETF_US":
        return { group: "02 - Bens no Exterior", code: "01 - Ações e outros títulos no exterior" };
      case "FIXED_INCOME":
        return { group: "04 - Aplicações Financeiras", code: "02 - Títulos públicos / privados de renda fixa" };
      default:
        return { group: "99 - Outros Bens", code: "99 - Outros bens e direitos" };
    }
  };

  // 2. RENDIMENTOS ISENTOS (Dividendos BR + FIIs)
  const exemptDividends = context.brDividendsTaxResult.positions.filter((p) => p.grossAmount > 0);

  // 3. RENDIMENTOS TRIBUTAÇÃO EXCLUSIVA (JCP)
  const jcpPositions = context.jcpTaxResult.positions.filter((p) => p.grossAmount > 0);

  return (
    <div className="space-y-6" data-testid="irpf-mirror-report">
      {/* Header Banner */}
      <Card className="border-border/70 bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <StatusBadge variant="default" icon={FileText}>
                  DECLARAÇÃO DE AJUSTE ANUAL (IRPF {baseYear + 1} / ANO-CALENDÁRIO {baseYear})
                </StatusBadge>
              </div>
              <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                Espelho do IRPF (Pronto para Copiar)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                Discriminações padronizadas conforme o leiaute da Receita Federal do Brasil. Copie
                e cole diretamente no Programa Gerador da Declaração (PGD) ou no e-CAC sem risco de digitação incorreta.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  let text = `ESPELHO IRPF ${baseYear + 1} (ANO-CALENDÁRIO ${baseYear})\n\n=== BENS E DIREITOS ===\n`;
                  activePositions.forEach((pos) => {
                    const group = getIrpfGroupCode(pos.type);
                    text += `\n[${pos.ticker}] ${group.group} | ${group.code}\n${formatBensDiscriminação(pos)}\nSituação em 31/12/${baseYear}: R$ ${((pos.quantity ?? 0) * (pos.averagePrice ?? 0)).toFixed(2)}\n`;
                  });
                  text += `\n=== RENDIMENTOS ISENTOS (CÓDIGO 09) ===\n`;
                  exemptDividends.forEach((d) => {
                    text += `${d.ticker}: R$ ${d.grossAmount.toFixed(2)}\n`;
                  });
                  text += `\n=== RENDIMENTOS EXCLUSIVOS / JCP (CÓDIGO 10) ===\n`;
                  jcpPositions.forEach((j) => {
                    text += `${j.ticker}: Líquido R$ ${j.netAmount.toFixed(2)} (Retido na fonte: R$ ${j.withheldTax.toFixed(2)})\n`;
                  });

                  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `espelho-irpf-${baseYear}.txt`;
                  a.click();
                  toast.success("Relatório IRPF exportado com sucesso!");
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Exportar Tudo (.txt)
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs: Bens e Direitos / Rendimentos Isentos / Tributação Exclusiva */}
      <Tabs defaultValue="bens" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-xl mb-4">
          <TabsTrigger value="bens" className="text-xs">
            Bens e Direitos ({activePositions.length})
          </TabsTrigger>
          <TabsTrigger value="isentos" className="text-xs">
            Rendimentos Isentos ({exemptDividends.length})
          </TabsTrigger>
          <TabsTrigger value="exclusivos" className="text-xs">
            Tributação Exclusiva / JCP ({jcpPositions.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BENS E DIREITOS */}
        <TabsContent value="bens" className="space-y-4">
          {activePositions.length === 0 ? (
            <div className="p-8 text-center border rounded-xl border-dashed border-border/70 text-muted-foreground text-sm">
              Nenhum bem ou posição ativa na carteira para o ano-calendário.
            </div>
          ) : (
            activePositions.map((item) => {
              const info = getIrpfGroupCode(item.type);
              const discrimText = formatBensDiscriminação(item);
              const costBasis = (item.quantity ?? 0) * (item.averagePrice ?? item.currentPrice ?? 0);
              const isCopied = copiedId === `bem-${item.id}`;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs hover:border-border transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-foreground bg-muted px-2 py-0.5 rounded">
                        {item.ticker}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Grupo: <strong className="text-foreground font-semibold">{info.group}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Código: <strong className="text-foreground font-semibold">{info.code}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Discrimination Text Box */}
                  <div className="rounded-lg bg-muted/40 border border-border/50 p-3 relative group">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Texto da Discriminação (Campo 13 do IRPF):
                    </div>
                    <p className="text-xs text-foreground/90 font-mono leading-relaxed select-all">
                      {discrimText}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2">
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-muted-foreground">
                          Situação em 31/12/{previousYear}:{" "}
                          <strong className="text-foreground font-bold">R$ 0,00</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Situação em 31/12/{baseYear}:{" "}
                          <strong className="text-primary font-bold">
                            {formatCurrency(costBasis, "BRL", "ptBR")}
                          </strong>
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isCopied ? "default" : "secondary"}
                        className="h-7 text-xs gap-1.5"
                        onClick={() => copyToClipboard(discrimText, `bem-${item.id}`, item.ticker)}
                      >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {isCopied ? "Copiado!" : "Copiar Discriminação"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* TAB 2: RENDIMENTOS ISENTOS */}
        <TabsContent value="isentos" className="space-y-4">
          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                Rendimentos Isentos e Não Tributáveis (Código 09 - Lucros e Dividendos)
              </CardTitle>
              <CardDescription className="text-xs">
                Valores recebidos a título de dividendos de ações brasileiras e rendimentos de FIIs durante o ano-calendário {baseYear}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {exemptDividends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum dividendo isento apurado no período.
                </p>
              ) : (
                exemptDividends.map((pos, idx) => {
                  const copyText = `Dividendos recebidos da fonte pagadora ${pos.ticker} no valor total de ${formatCurrency(pos.grossAmount, "BRL", "ptBR")}.`;
                  const isCopied = copiedId === `isento-${idx}`;

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/50 bg-muted/20 p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded">
                            {pos.ticker}
                          </span>
                          <span className="text-xs text-muted-foreground">Código 09 • Lucros e Dividendos</span>
                        </div>
                        <div className="text-xs font-semibold text-success mt-1">
                          Valor Declarável: {formatCurrency(pos.grossAmount, "BRL", "ptBR")}
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isCopied ? "default" : "outline"}
                        className="h-7 text-xs gap-1.5"
                        onClick={() => copyToClipboard(copyText, `isento-${idx}`, pos.ticker)}
                      >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {isCopied ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: TRIBUTAÇÃO EXCLUSIVA / JCP */}
        <TabsContent value="exclusivos" className="space-y-4">
          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Coins className="h-4 w-4 text-accent-text" />
                Rendimentos Sujeitos à Tributação Exclusiva/Definitiva (Código 10 - JCP)
              </CardTitle>
              <CardDescription className="text-xs">
                Juros sobre Capital Próprio já com IR de 15% retido na fonte. No IRPF, informe o valor líquido recebido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {jcpPositions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum JCP apurado no período.
                </p>
              ) : (
                jcpPositions.map((pos, idx) => {
                  const copyText = `Juros sobre Capital Próprio (JCP) de ${pos.ticker}: Valor Bruto ${formatCurrency(pos.grossAmount, "BRL", "ptBR")}, IR Retido na Fonte ${formatCurrency(pos.withheldTax, "BRL", "ptBR")}, Valor Líquido ${formatCurrency(pos.netAmount, "BRL", "ptBR")}.`;
                  const isCopied = copiedId === `jcp-${idx}`;

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/50 bg-muted/20 p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded">
                            {pos.ticker}
                          </span>
                          <span className="text-xs text-muted-foreground">Código 10 • Juros sobre Capital Próprio</span>
                        </div>
                        <div className="text-xs font-semibold text-foreground mt-1 flex items-center gap-3">
                          <span>Líquido Recebido: <strong className="text-success">{formatCurrency(pos.netAmount, "BRL", "ptBR")}</strong></span>
                          <span className="text-muted-foreground">IR Retido (15%): {formatCurrency(pos.withheldTax, "BRL", "ptBR")}</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isCopied ? "default" : "outline"}
                        className="h-7 text-xs gap-1.5"
                        onClick={() => copyToClipboard(copyText, `jcp-${idx}`, pos.ticker)}
                      >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {isCopied ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
