import React from "react";
import { Calendar, CheckCircle2, Clock, DollarSign, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import type { Currency } from "@/lib/domain";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";
import { cn } from "@/lib/utils";

interface MonthlyCashflowTimelineProps {
  events: RealizedIncomeEvent[];
  currency?: Currency;
  className?: string;
}

export function MonthlyCashflowTimeline({
  events,
  currency = "BRL",
  className,
}: MonthlyCashflowTimelineProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Filter events whose payment date or ex-date is in the current month
  const monthEvents = events
    .filter((e) => {
      const dateStr = e.paymentDate || e.exDate;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .sort((a, b) => {
      const da = new Date(a.paymentDate || a.exDate).getTime();
      const db = new Date(b.paymentDate || b.exDate).getTime();
      return da - db;
    });

  const monthTotal = monthEvents.reduce((sum, e) => sum + (e.amountNet ?? 0), 0);

  // Group events by week of the month
  const weeks = [
    { label: "Semana 1 (Dias 01 a 07)", minDay: 1, maxDay: 7 },
    { label: "Semana 2 (Dias 08 a 14)", minDay: 8, maxDay: 14 },
    { label: "Semana 3 (Dias 15 a 21)", minDay: 15, maxDay: 21 },
    { label: "Semana 4+ (Dias 22 em diante)", minDay: 22, maxDay: 31 },
  ];

  const monthName = now.toLocaleString("pt-BR", { month: "long" });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <Card
      data-testid="monthly-cashflow-timeline"
      className={cn("border-border/75 bg-card shadow-xs", className)}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-text inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-accent-text" />
              CALENDÁRIO DE CAIXA • {capitalizedMonth.toUpperCase()} {currentYear}
            </span>
            <CardTitle className="mt-1 font-serif text-lg font-bold text-foreground">
              Linha do Tempo de Proventos do Mês
            </CardTitle>
            <CardDescription className="text-xs">
              Previsão de pingos em conta e datas COM por semana no mês corrente.
            </CardDescription>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">
              Total Previsto no Mês
            </div>
            <div className="font-mono text-xl font-bold text-success">
              {formatCurrency(monthTotal, currency, "ptBR")}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {monthEvents.length === 0 ? (
          <div className="p-8 text-center border rounded-xl border-dashed border-border/70 text-muted-foreground text-xs">
            Nenhum provento com crédito previsto especificamente para este mês até o momento.
            Consulte os próximos meses na tabela de Sazonalidade Anual abaixo.
          </div>
        ) : (
          <div className="space-y-4">
            {weeks.map((week, wIdx) => {
              const weekEvents = monthEvents.filter((e) => {
                const dateStr = e.paymentDate || e.exDate;
                const day = new Date(dateStr).getDate();
                return day >= week.minDay && day <= week.maxDay;
              });

              if (weekEvents.length === 0) return null;

              const weekTotal = weekEvents.reduce((sum, e) => sum + (e.amountNet ?? 0), 0);

              return (
                <div key={wIdx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-border/40 pb-1 font-semibold text-muted-foreground">
                    <span>{week.label}</span>
                    <span className="font-mono text-foreground font-bold">
                      {formatCurrency(weekTotal, currency, "ptBR")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {weekEvents.map((evt, eIdx) => {
                      const dateStr = evt.paymentDate || evt.exDate;
                      const evtDate = new Date(dateStr);
                      const isPast = evt.isPaid || evtDate.getTime() < now.getTime();

                      return (
                        <div
                          key={eIdx}
                          className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold font-mono",
                                isPast
                                  ? "bg-success/15 text-success"
                                  : "bg-primary/15 text-primary"
                              )}
                            >
                              {evtDate.getDate().toString().padStart(2, "0")}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <strong className="font-mono text-xs font-bold text-foreground">
                                  {evt.ticker}
                                </strong>
                                <span className="text-[10px] text-muted-foreground">
                                  {evt.taxType === "jcp" ? "JCP" : "Dividendo"}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-muted-foreground mt-0.5">
                                {evt.paymentDate ? `Crédito: ${new Date(evt.paymentDate).toLocaleDateString("pt-BR")}` : `Data COM: ${new Date(evt.exDate).toLocaleDateString("pt-BR")}`}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-xs text-success">
                              +{formatCurrency(evt.amountNet, currency, "ptBR")}
                            </div>
                            <span
                              className={cn(
                                "inline-flex items-center text-[10px] gap-0.5 mt-0.5",
                                isPast ? "text-success" : "text-muted-foreground"
                              )}
                            >
                              {isPast ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" /> Pago
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" /> A receber
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
