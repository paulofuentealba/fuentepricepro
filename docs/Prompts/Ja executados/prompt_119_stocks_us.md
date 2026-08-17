# PROMPT 119 — Item 1, Fase 2.2: Stocks US Especializadas
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior especializado em modelagem financeira.
Apresente PLANO (Regra 8) antes de qualquer código.

CONTEXTO:
Fase 2.1 (Ações BR) já concluída e aprovada, estabelecendo o padrão de
implementação dentro do dispatcher. Esta é a Fase 2.2: valuateStockUS.

ESCOPO — Stocks US (STOCK_US):
- Total Shareholder Yield (dividendos + recompras via SEC EDGAR — usar
  campo já extraído de CommonStockSharesOutstanding para detectar redução
  de float).
- Gordon Multi-Estágio para Dividend Aristocrats (g1 > g2 > g_infinito,
  ancorado em histórico de 10-25 anos de aumento contínuo, quando
  disponível).
- FCFE Yield Teto (fluxo de caixa livre ao acionista).
- Peter Lynch Modificado (PEG + Dividend Yield).
- Aplicar retenção de 30% withholding tax (ou 15% se já houver lógica de
  W-8BEN/treaty implementada — reutilizar, não reimplementar) no provento
  líquido usado como base.
- Mesmo padrão de assumptions[] e confidenceBadge da Fase 2.1.
- Fuente Consensus desta classe = mediana só dos métodos aplicáveis a
  STOCK_US.

PROIBIDO:
- Reimplementar a lógica de withholding tax se ela já existir em outro
  lugar do código — buscar antes de criar (Regra 1).
- Hardcode de premissa sem exposição em assumptions[].
- Misturar Fuente Consensus de STOCK_US com métodos de STOCK_BR no mesmo
  cálculo de mediana.

ENTREGA:
Plano → aprovação → implementação → tsc/test/build limpos → exemplos reais
de 2-3 tickers US (incluir ao menos 1 dividend aristocrat conhecido).
```
