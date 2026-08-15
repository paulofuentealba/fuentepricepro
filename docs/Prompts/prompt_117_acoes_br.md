# PROMPT 117 — Item 1, Fase 2.1: Ações BR Especializadas
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior especializado em modelagem financeira.
Apresente PLANO (Regra 8) antes de qualquer código e aguarde aprovação.

CONTEXTO:
ADR-002 já aprovado. Esta é a Fase 2.1: implementar valuateStockBR dentro do
dispatcher de src/lib/calculations.ts (getAssetValuation permanece o único
ponto de entrada público — NÃO criar arquivo novo de cálculo).

ESCOPO — Ações BR (STOCK_BR):
- Bazin com JCP líquido (aplicar retenção de 15% IR na fonte sobre JCP antes
  de somar a dividendos isentos, para chegar ao "provento líquido").
- Graham com margem de segurança ajustada (raiz de 22,5 × LPA × VPA, com a
  margem como parâmetro, não fixa).
- Gordon (D1/(r-g)), com g = ROE × (1 - Payout).
- DDM em Dois Estágios (H-Model) para empresas em expansão — g_curto por
  3-5 anos convergindo a g_longo (PIB + inflação).
- Toda fórmula deve popular o array assumptions[] do ValuationResult
  (ADR-002) com label em linguagem de resultado, helperText, suggestedRange
  e confidenceBadge calculado a partir da qualidade do dado CVM (reportado
  vs. estimado — reutilizar o padrão de badge já existente no projeto).
- Fuente Consensus para esta classe = mediana apenas dos métodos aplicáveis
  a STOCK_BR (não misturar com métodos de outras classes).

PROIBIDO:
- Qualquer valor de r, g, yield-alvo ou spread hardcoded sem estar também
  exposto como ValuationAssumption editável.
- Alterar useValuedPortfolio para consumir algo diferente do que já consome
  — a mudança é interna ao dispatcher, contrato de saída não muda nesta
  fase.
- Suavizar silenciosamente dado ausente (ex: usar LPA de trimestre anterior
  sem marcar confidenceBadge mais baixo).

ENTREGA:
Plano → aprovação → implementação → tsc/test/build limpos → relatório com
exemplos reais de 2-3 tickers BR mostrando o ValuationResult completo,
incluindo assumptions[].
```
