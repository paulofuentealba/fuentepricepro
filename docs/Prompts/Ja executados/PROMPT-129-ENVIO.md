Prompt 129 — Auditoria de reuso antes da v4 [Item 0.5] — SEM CÓDIGO

CONTEXTO
A v4 adiciona telas e um motor de decisão. Antes de escrever qualquer linha,
precisamos saber exatamente o que JÁ existe, para estender em vez de duplicar
(Regra 1). Erros já cometidos em planejamento anterior: propor criar metas de
alocação e disclaimer regulatório que já existiam no código.

TAREFA — ESTE PROMPT NÃO ALTERA NENHUM ARQUIVO
Produzir um relatório em docs/design/v6/AUDITORIA-REUSO.md com:

1. METAS DE ALOCAÇÃO
   - Ler src/components/ceiling/TargetAllocationPanel.tsx e
     src/lib/suggestedAllocation.ts
   - Documentar: shape de targets, como são persistidos, validação de soma,
     como PROFILE_BASE_ALLOCATION e STRATEGY_BIAS_MULTIPLIERS funcionam
   - Responder: dá para estender para yield-alvo POR CLASSE? O que muda?

2. DISCLAIMER
   - Ler src/components/shared/RegulatoryDisclaimerBanner.tsx
   - Documentar props, variantes, onde é usado hoje
   - Responder: suporta variantes 'calculation' / 'tax' / 'full'?
     Há registro de aceite versionado?

3. SMART ALLOCATION vs PLANO DE APORTE
   - Ler src/components/ceiling/SmartAllocation.tsx
   - Documentar o que ela JÁ faz: estratégias, metas, alocação sugerida
   - Responder: qual a sobreposição real com o "Plano de aporte" do protótipo?

4. PROVENTOS
   - Ler realizedIncome.ts e useRealizedIncomeSummary.ts
   - Responder: dá para saber quanto foi recebido e AINDA NÃO reinvestido?
     Se não, o que falta?

5. FISCAL ESPALHADO
   - Buscar em todo src/ por: withholding, 0.30, JCP, isencao, isento,
     20000, taxRate, imposto
   - Listar CADA ocorrência com arquivo:linha e o que faz

6. CALENDÁRIO E SAZONALIDADE
   - Ler cashflow.ts, dividendHeatmap.ts, CashFlowCalendar.tsx,
     fiiPaymentRules.ts
   - Responder: dá para derivar "meses secos" com o que existe?
     E "dividendos por ano"?

7. COMPONENTES REUSÁVEIS
   - Listar de components/shared e components/ui o que serve para as telas
     novas: MetricBox, StatusBadge, AssetCard, ResultSkeleton,
     TickerSearchField, BlurredPreviewOverlay, LockedPanel
   - Para cada um: serve como está / precisa extensão / não serve (por quê)

8. NAVEGAÇÃO
   - Ler layout/Sidebar.tsx e layout/MobileBottomNav.tsx
   - Documentar estrutura atual e chaves i18n de navegação

9. FEATURE GATES
   - Ler featureGates.ts e o uso de useFeatureGate
   - Documentar como adicionar gate novo

10. THESISSNAPSHOT (novo desde o Prompt 127 — confirmar estado atual)
    - Confirmar que ThesisSnapshot está em produção em transactionsLogic.ts
    - Confirmar que já é gerado em compras via NewContributionDialog,
      TransactionsPanel e persistTransactionsBatch (import em lote)
    - Documentar: hoje já é possível ler o snapshot de uma transação
      específica para uso futuro nas telas de Auditoria e "O que mudou"?
      Que consulta seria necessária?

11. DESIGN TOKENS (novo desde o Prompt 128 — confirmar estado atual)
    - Confirmar que a paleta Colheita está ativa em src/styles.css nos
      dois modos, e que muted-foreground está com o valor corrigido
      (sólido, sem alpha, ≥4.5:1 nos dois modos)

PROIBIDO
- Alterar QUALQUER arquivo de código
- Propor solução — este prompt é diagnóstico
- Afirmar que algo não existe sem ter buscado com pelo menos 3 termos

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build
(devem passar inalterados — nenhum código foi tocado)

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | auditoria é a função central deste prompt |
| fuente-solution-architect | SIM | mapeia o que a nova camada pode reusar |
| fuente-product-manager | SIM | conflito SmartAllocation×Plano é decisão de produto |
| demais papéis | NÃO | diagnóstico sem código, UI, cálculo ou dado pessoal |

COMMIT
docs(design): auditoria de reuso pre-v4 [Item 0.5]

---

Envie o relatório completo (não resumido) antes de qualquer commit. Vou ler
pessoalmente cada seção antes de liberar o Prompt 130, e conferir pelo menos
os pontos 1, 2 e 3 contra os arquivos reais — são os que mais already causaram
retrabalho no planejamento anterior.
