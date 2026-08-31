# PROMPT — Diagnóstico de Escopo: Consolidar FII_INFRA/FIAGRO em FII
> Copiar e colar no chat `[EXECUÇÃO]` do Antigravity.

## 🛑 MODO DE OPERAÇÃO
Modo de DIAGNÓSTICO EXCLUSIVO — não codar nada ainda. Decisão de produto já tomada por Paulo:
simplificar o modelo de classificação, tratando `FII_INFRA` e `FIAGRO` como `FII` em todo o
sistema — sem distinção de subtipo. Objetivo deste prompt é mapear o raio de impacto real antes de
eu fatiar a execução em lotes.

## O que investigar

### A. Todos os locais que referenciam `FII_INFRA` e/ou `FIAGRO` no código
Liste, com arquivo + linha exata, todo lugar que:
- Testa `type === "FII_INFRA"` ou `type === "FIAGRO"` explicitamente (separado de `"FII"`).
- Inclui `FII_INFRA`/`FIAGRO` em arrays de tipos (ex.: `MONTHLY_TYPES` em `cashflow.ts`).
- Usa esses valores em lógica de dispatch de valuation (`calculations.ts` — confirme se o modelo
  Gordon/Bazin trata os 3 tipos de forma idêntica hoje ou se há alguma diferença sutil de fórmula
  ou de premissas entre FII/FII_INFRA/FIAGRO que se perderia na consolidação).
- Usa esses valores em `fiiPaymentRules.ts` (estimativa de data de pagamento) — confirme se as
  regras de calendário de distribuição são as mesmas pros 3 tipos ou se há diferença regulatória
  real (CVM trata FII, FII-Infra e FIAGRO com instruções normativas parcialmente diferentes —
  verifique se isso importa pra lógica de estimativa de data, não só pro rótulo).
- Usa esses valores em `realizedIncome.ts` (`getTaxType`) — confirme se o tratamento fiscal
  (isenção de IR) é idêntico pros 3 hoje no código, e se há qualquer diferença tributária real na
  legislação brasileira entre FII, FII-Infra e FIAGRO que a simplificação apagaria incorretamente
  (isso é importante — FIAGRO tem regras de isenção específicas que podem não ser sempre idênticas
  às de FII comum; não presuma, confirme).
- Usa esses valores em classificação automática (`classify.ts`, `classify.server.ts`,
  `hgBrasilClassification.server.ts`) — como a HG Brasil e a heurística local hoje decidem entre os
  3 tipos, e o que precisaria mudar pra sempre resolver como `FII`.
- Usa esses valores em `dict.ptBR.ts`/`dict.en.ts`/`dict.es.ts` (`types.FII_INFRA`,
  `types.FIAGRO`) e em qualquer filtro de UI (ex.: dropdown de tipo de ativo em `AssetForm.tsx` ou
  equivalente).
- Usa esses valores em cálculo de indicadores fundamentalistas específicos de imobiliário (Cap
  Rate, Vacância) — confirme se esses indicadores fazem sentido igual pra FIAGRO (fundo agro, não
  imobiliário) e se a consolidação em "FII" vai fazer a UI tentar mostrar "Vacância" pra um fundo de
  recebíveis do agronegócio, o que seria um erro de UX introduzido pela própria simplificação.

### B. Impacto em dados já existentes
- Existe algum usuário com ativos hoje classificados como `FII_INFRA` ou `FIAGRO` no Firestore
  (produção)? Se sim, aproximadamente quantos documentos — não precisa ser exato, uma ordem de
  grandeza via amostragem já ajuda a dimensionar se precisa de migração de dados ou se a
  reclassificação pode ser só na camada de exibição/tipo daqui pra frente.
- Se decidirmos migrar dados existentes, isso é uma escrita em massa no Firestore de produção —
  reporte como achado de risco, não proponha o script de migração ainda.

## Formato do Relatório

Para cada subitem (A e B): status + achados com arquivo/linha exata, igual ao padrão dos sweeps
anteriores. Ao final, uma seção "Recomendação de Fatiamento" com sua sugestão de quais mudanças são
seguras de agrupar num lote único vs. quais merecem lote separado por risco (ex.: mudança de tipo
puro em UI/formulário provavelmente é baixo risco; qualquer coisa que toque cálculo fiscal ou
estimativa de data de pagamento merece mais cautela).

Não proponha correção de código neste prompt — só diagnóstico. Eu decido o fatiamento depois de ver
o relatório completo.
