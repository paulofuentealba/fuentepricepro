# PROMPT — Padronizar Aba Dividendos: 2 Estados Visuais + Terminologia Correta
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código.

CONTEXTO:
Duas inconsistências identificadas na aba "Dividendos" de cada ativo
(AssetDetailSheet):

1. TERMINOLOGIA: o chip na tabela mostra "Dividendo" para TODO tipo de
   provento, inclusive de FIIs — mas FIIs distribuem "Rendimento" (isento,
   sem natureza societária de dividendo), não "Dividendo" no sentido
   técnico. Ações BR distribuem Dividendo ou JCP (dois chips diferentes,
   já existem em outro lugar do produto). Ações US distribuem "Dividend".
   Precisa mapear o rótulo correto por classe de ativo, não um texto fixo.

2. CONSISTÊNCIA VISUAL: o gráfico de barras mensal dessa aba (12 meses)
   usa uma cor só para todas as barras. O Cash Flow global (já corrigido
   recentemente) usa 2 estados visuais claros — "Proventos recebidos"
   (sólido) vs "Proventos a receber" (padrão/tom diferente). Esta aba
   precisa do MESMO padrão visual e dos MESMOS tokens, para não parecer
   duas telas de produtos diferentes.

ESCOPO:
1. Mapear o rótulo correto do chip por assetClass:
   - STOCK_BR: "Dividendo" (isento) ou "JCP" (com nota de 15% retido) —
     reaproveitar lógica já existente em outro lugar do produto que já
     distingue os dois, se houver.
   - STOCK_US: "Dividend"
   - FII / FII_INFRA / FIAGRO: "Rendimento"
   - REIT: "Dividend" (REITs distribuem dividendo de verdade, diferente
     de FII brasileiro)
   - ETF: rótulo conforme o que o ETF distribuiu de fato (herda do ativo
     subjacente ou do próprio ETF, investigar antes de decidir)
2. Aplicar os 2 estados visuais no gráfico de 12 meses desta aba, usando
   os MESMOS tokens/componente (ou uma variante do mesmo) já criado para
   o Cash Flow global — não recriar do zero, reaproveitar (Regra 1).
3. i18n: os novos rótulos (Rendimento, Dividend, JCP) precisam estar nos
   3 dicionários, não hardcoded.

PROIBIDO:
- Hardcode de "Dividendo" como rótulo universal — precisa ser derivado da
  assetClass.
- Recriar a lógica visual dos 2 estados do zero — reaproveitar o que já
  existe do Cash Flow.
- Mudar o CÁLCULO de proventos — é só rótulo e apresentação visual.

ENTREGA:
Plano (com a tabela de mapeamento classe → rótulo) → aprovação →
implementação → tsc/test/build reais → captura de tela com um FII (deve
mostrar "Rendimento") e uma ação BR com JCP (deve mostrar "JCP").
```
