Prompt 133 — Nucleo do AskEngine [Item 0.3] — REVISADO pos-127/128/129/130/131/132

CONTEXTO
Camada NOVA e greenfield que responde perguntas de decisão. Nunca recalcula
valuation — consome o SSOT. Referência visual: docs/design/v6/prototipo-v6.html.

IMPORTANTE — o terreno mudou desde o desenho original deste prompt. Antes de
codar, revise estes 5 fatos já CONFIRMADOS no código real (não hipóteses):

1. UserSettings HOJE (useUserSettings.ts) já tem TUDO que o AskEngine
   precisa como entrada de critério do usuário:
   targetYield, classTargetYields, excludeAboveCeiling, excludeYieldTraps,
   maxConcentrationPerAsset, maxConcentrationPerClass, smartAllocationTargets.
   NÃO criar um tipo paralelo "UserTargets" novo — o AskContext.targets deve
   ser um subconjunto/adaptação direta de UserSettings, nunca um segundo
   modelo de configuração vivendo ao lado do primeiro (Regra 1). Duplicar
   aqui é o mesmo erro que já corrigimos nos Prompts 129 e 131.

2. resolveTargetYield (calculations.ts, Prompt 131) já resolve a cascata
   item > classe > global, e já está INTEGRADA em useValuedPortfolio.tsx
   e portfolioBffLogic.ts. Isso significa que toda posição que chega da
   carteira valorada JÁ TEM o targetYield efetivo aplicado. O AskEngine
   NÃO deve chamar resolveTargetYield nem getAssetValuation — ele consome
   posições que já saíram do SSOT prontas (ValuedWatchlistItem), incluindo
   consenso e margem já calculados.

3. Os toggles excludeAboveCeiling e excludeYieldTraps (Prompt 131) já
   existem como preferência do usuário, com UI funcionando em
   TargetAllocationPanel/SmartAllocation. O AskEngine deve LER esses dois
   booleanos de UserSettings para decidir exclusão — não inventar uma
   segunda flag de exclusão com nome diferente.

4. suggestedAllocation.ts já resolve alocação por classe somando
   exatamente 100% via Método dos Maiores Restos (confirmado na auditoria,
   função computeSuggestedAllocation + PROFILE_BASE_ALLOCATION +
   STRATEGY_BIAS_MULTIPLIERS + computeMarginBiasMultipliers). Antes de
   escrever a lógica de arredondamento de cotas/percentuais da estratégia
   de referência deste prompt (balanceTargets), VERIFICAR se dá para
   reusar ou adaptar o algoritmo de maiores restos já implementado ali,
   em vez de reimplementar arredondamento determinístico do zero.

5. O disclaimer variante 'calculation' (Prompt 132, RegulatoryDisclaimerBanner
   + resolveDisclaimerText) é o texto que vai acompanhar visualmente as
   telas que consumirem este motor (Prompt 135+). Não é responsabilidade
   deste prompt (sem UI aqui), mas toda reasonKey/copy que o motor gerar
   deve ser compatível em tom com esse enquadramento — cálculo segundo
   critério do usuário, nunca recomendação. Isso é requisito de linguagem
   nos testes de nome/semântica das reasonKeys, não só de código.

INVESTIGAR ANTES (Regra 7) — atualizado
1. Confirmar a assinatura exata de ValuedWatchlistItem (o item retornado
   por useValuedPortfolio) — quais campos já vêm prontos (targetYield
   efetivo, consenso/fuenteConsensus, margin, yieldTrapWarning, payout,
   currency, type). Reportar o shape completo antes de desenhar AskContext.
2. Confirmar se computeSuggestedAllocation pode ser chamada/adaptada pela
   estratégia balanceTargets deste prompt, ou se sua assinatura (que
   recebe profile + strategies + items, não metas diretas) não se encaixa
   — se não encaixar, reportar por que e propor alternativa que ainda
   assim reuse a lógica de arredondamento (Maiores Restos) em vez de
   duplicá-la miudinho.
3. Confirmar como excludeAboveCeiling/excludeYieldTraps são lidos hoje em
   SmartAllocation.tsx (o padrão de leitura de settings) para replicar o
   mesmo padrão no AskEngine.
Apresentar plano com essas respostas ANTES de codar (Regra 8).

TAREFA (após aprovação do plano)
Criar src/lib/askEngine/:

types.ts
- AskContext: { positions: ValuedWatchlistItem[]; availableAmount: number;
    settings: Pick<UserSettings, 'smartAllocationTargets' | 'excludeAboveCeiling'
    | 'excludeYieldTraps' | 'maxConcentrationPerAsset' | 'maxConcentrationPerClass'>;
    asOf: string }
  (o Pick explícito documenta exatamente qual fatia de UserSettings o motor
  consome — não o objeto inteiro solto)
- Strategy: { id: string; labelKey: string; run: (ctx: AskContext) => Allocation[] }
- Allocation: { ticker, amountBRL, quantity, percentOfTotal, reasonKey, reasonParams }
- Excluded: { ticker, reasonKey, reasonParams }
- Consequence: { kind, valueKey, value }
- AskResult: { allocations, leftover, excluded, consequences, state }

engine.ts
- runAsk(ctx: AskContext, strategy: Strategy): AskResult

REQUISITOS INEGOCIÁVEIS
1. Toda Strategy é FUNÇÃO PURA. Sem I/O, sem fetch, sem Firestore,
   sem Date.now() (usar ctx.asOf).
2. O motor NÃO chama getAssetValuation NEM resolveTargetYield — consome
   posições já valoradas e com yield já resolvido (Regra 4/SSOT, reforçado
   pelo fato 2 acima).
3. reasonKey é CHAVE i18n com reasonParams estruturados. NUNCA frase
   montada em código (Regra 2). Tom compatível com o enquadramento do
   disclaimer 'calculation' (fato 5 acima) — nunca linguagem de
   recomendação ("compre", "melhor escolha"), sempre linguagem de cálculo
   ("abaixo do teto configurado", "prioriza classe com maior desvio").
4. settings.smartAllocationTargets vazio ou ausente -> AskResult com
   state 'targets_not_configured', allocations vazio. NUNCA assumir meta
   default (exigência regulatória, já reforçada no schema real desde o
   Prompt 131 — o campo é opcional-vazio por design).
5. Exclusão por excludeAboveCeiling/excludeYieldTraps: se true, ativo
   acima do consenso ou com yieldTrapWarning é excluído com razão. Se
   false (usuário desligou o critério), o ativo pode ser sugerido mesmo
   assim — o motor respeita a configuração, não impõe a própria opinião.
6. Quantidade sempre INTEIRA. Resto vai para leftover.
7. Nenhuma exclusão silenciosa: todo ativo removido aparece em excluded
   com razão.
8. Determinismo: empate resolvido por critério explícito e documentado
   (ticker alfabético), nunca por ordem de array.
9. Invariante: soma(allocations) + leftover === availableAmount.

NESTA ETAPA: apenas 1 estratégia de referência —
strategies/balanceTargets.ts (prioriza classes mais abaixo da meta,
reusando/adaptando o algoritmo de Maiores Restos de suggestedAllocation.ts
conforme resposta da investigação 2 acima).

TESTES OBRIGATÓRIOS (Vitest)
- invariante soma + leftover === disponível
- smartAllocationTargets vazio/ausente -> 'targets_not_configured', nada
  alocado
- excludeAboveCeiling=true exclui ativo acima do consenso, com razão
- excludeAboveCeiling=false permite sugerir ativo acima do consenso
- excludeYieldTraps=true exclui ativo com yieldTrapWarning, com razão
- nenhuma quantidade fracionária
- pureza: mesma entrada -> mesma saída em 2 execuções
- carteira vazia não quebra
- valor disponível menor que 1 cota -> tudo em leftover
- soma dos percentuais alocados nunca ultrapassa 100% mesmo com
  arredondamento (se reusar Maiores Restos, testar que a propriedade se
  mantém aqui também)

PROIBIDO
- I/O dentro de askEngine/
- Chamar getAssetValuation ou resolveTargetYield de dentro do motor
- Criar tipo de configuração paralelo a UserSettings
- Criar componente React nesta etapa
- Assumir meta default
- Texto hardcoded
- Linguagem de recomendação em qualquer reasonKey

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-solution-architect | SIM | define a camada, contratos, e decide reuso vs. duplicação |
| fuente-architecture-review | SIM | gate contra violação de SSOT e contra tipo paralelo a UserSettings |
| fuente-advogado-lgpd-gdpr | SIM | linguagem das reasonKeys precisa manter enquadramento do disclaimer |
| fuente-investidor-profissional | SIM | rigor da lógica de alocação e do reuso do algoritmo de maiores restos |
| fuente-business-architect | SIM | capacidade de negócio nova |
| fuente-product-manager | SIM | escopo mínimo da fase |
| fuente-ux-designer | NÃO | sem UI nesta etapa |
| fuente-investidor-iniciante | NÃO | sem superfície visível |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(ask-engine): nucleo do motor de decisao consumindo UserSettings e SSOT existentes [Item 0.3]

---

Envie o plano com as 3 respostas do "Investigar Antes" antes de codar. Em
especial quero ver o shape completo de ValuedWatchlistItem e a decisão
sobre reusar ou não o algoritmo de Maiores Restos de suggestedAllocation.ts
— não escreva arredondamento de percentuais do zero sem essa resposta.
