# Design: Nova Dashboard da Home (`/app`)

**Data:** 2026-09-04
**Status:** Aprovado para plano de implementação
**Origem:** Protótipo interativo `fuente_price_pro_interactive_prototype (6).html`, seção "VIEW 1: DASHBOARD" (linhas 1124–1292)

## Contexto

A home atual do app (`src/routes/app/index.tsx`) é enxuta: `HorizonteHero` (canvas animado de cobertura FIRE) + grid de 3 KPIs (patrimônio, renda do ano, maior posição) + prévia da tabela de portfólio (4 linhas).

O usuário avaliou um protótipo HTML estático com uma Dashboard bem mais densa — um "painel de inteligência de carteira" combinando FIRE tracking, motor de sugestão de aportes, alocação por classe e uma matriz de oportunidades com Preço Teto Fuente. Decisão: substituir a home atual por essa nova estrutura.

Investigação prévia mostrou que **a maior parte da lógica de negócio já existe** no codebase, espalhada em páginas/hooks próprios:

| Bloco do protótipo | Fonte de dados/lógica já existente |
|---|---|
| KPIs | `useValuedPortfolio` (patrimônio, renda), `useUserSettings.estimatedMonthlyContribution` (aporte) |
| FIRE Engine | `useFIProgress` (coverage, target, meses até FI) |
| Contribution Engine | `src/lib/askEngine/*` (`correctDriftStrategy`, `accelerateSnowballStrategy`, `buyDiscountStrategy`) |
| Alocação por classe | `src/lib/portfolioAllocationState.ts` |
| Matriz de oportunidades | `useValuedPortfolio().valuedItems` (inclui posições possuídas + watchlist, já carrega `valuation.margin/activeCeiling/dividendYield`) |

O trabalho é majoritariamente **composição de UI nova sobre lógica existente**, não criação de novos motores de cálculo.

## Decisões de escopo (confirmadas com o usuário)

1. **Escopo:** só a seção Dashboard do protótipo (não as outras 6 views: Portfólio Global, Watchlist, Motor de Aportes standalone, Dividendos, IR, Raio-X do Ativo).
2. **Visual:** manter o design system atual do app (tokens shadcn, tema claro/escuro existente). Não adotar a paleta "dark luxury" (dourado/verde/serif) do protótipo — só replicar estrutura e conteúdo dos blocos.
3. **Horizonte Hero:** será **substituído** pelo novo `FireEngineCard` (barra de progresso + milestones + crossover point). A lógica de snapshot de "última visita" (`lastVisitSnapshot` no Firestore) é preservada e a frase de delta ("+X p.p. desde a última visita") passa a ser exibida dentro do `FireEngineCard`, não mais isolada acima do hero.
4. **KPI "Poder de Aporte Disponível":** alimentado por `settings.estimatedMonthlyContribution` (campo já persistido, hoje usado por `useFIProgress`). Não requer novo campo de configuração.
5. **Contribution Engine:** embutido inline na Dashboard (não um link/CTA para `/app/contributionplan`), reaproveitando diretamente as funções de `askEngine` com uma UI de resultado condensada — sem duplicar `/app/contributionplan`, que continua existindo como página completa.
6. **Matriz de Oportunidades:** lista ativos **possuídos + watchlist** (não só a carteira atual), já que `useValuedPortfolio().valuedItems` cobre ambos.

## Arquitetura

### Arquivos novos
- `src/components/dashboard/DashboardKpiGrid.tsx`
- `src/components/dashboard/FireEngineCard.tsx`
- `src/components/dashboard/ContributionEngineCard.tsx`
- `src/components/dashboard/AllocationOverviewCard.tsx`
- `src/components/dashboard/OpportunityMatrixTable.tsx`
- `src/lib/selectors/weightedYieldOnCost.ts` (nova função pura: YoC líquido médio ponderado por valor de posição)
- `src/lib/selectors/recommendedAction.ts` (nova função pura: deriva texto de "Ação Recomendada" a partir de `margin`/`yieldTrapWarning`, no mesmo espírito de `computeCardVerdict` em `ScreenerScreen.tsx`)
- `src/lib/selectors/taxRegimeLabel.ts` (nova função pura: mapeia `item.type`/`currency` para o rótulo de regime tributário, reaproveitando as regras já documentadas em `netAfterTax`/conteúdo fiscal existente)

### Arquivo reescrito
- `src/routes/app/index.tsx` — remove `HorizonteHero`, `SummaryCard` grid antigo e a exibição solta de `coverageDeltaLabel`; orquestra os 5 componentes novos. Mantém a leitura/escrita do snapshot Firestore (`lastVisitSnapshot`), mas passa o delta calculado como prop para `FireEngineCard`.

### Não alterados
- `FIProgressCard.tsx`, `HorizonteHero.tsx` continuam existindo e sendo usados em `myportfolio.tsx` — nenhuma mudança neles.
- `/app/contributionplan.tsx` continua existindo como página completa (AskScreen).
- `askEngine`, `useFIProgress`, `useValuedPortfolio`, `portfolioAllocationState` — consumidos, não modificados.

## Componentes — detalhamento

### `DashboardKpiGrid`
Props: `{ netWorth, weightedYoc, monthlyIncome, availableContribution, isLoading }`. 4 cards no mesmo padrão visual do `SummaryCard` atual (reaproveita esse componente ou uma variante dele — decisão de implementação, não de design).

### `FireEngineCard`
Props: `{ coveragePercent, monthlyIncome, monthlyCostGoal, monthsToFI, deltaSinceLastVisit }`.
- Input de custo de vida mensal com presets (5k/8k/12k/15k) — grava em `settings.monthlyLivingCostGoal` (já existe).
- Barra de progresso 0–100%.
- Milestones (25/50/75/100%) calculados a partir de `targetCapital`/`monthlyCostGoal`.
- Crossover point estimado a partir de `monthsToFI`.
- Linha de delta desde a última visita (retomada do comportamento atual).

### `ContributionEngineCard`
Props: `{ valuedItems, settings, currency, isLoading }`.
- Input de valor + presets (1k/2.5k/5k/10k).
- Roda `correctDriftStrategy` (estratégia padrão, mesma do `/app/contributionplan`) sobre o valor informado.
- Lista condensada dos top resultados (ticker, valor sugerido, razão).
- Sem exportação CSV nem seletor de estratégia (fica reservado à página completa) — versão condensada conforme conversado.

### `AllocationOverviewCard`
Props: `{ allocationState }` (saída de `portfolioAllocationState.ts`). Grid meta vs. atual por classe, em formato compacto.

### `OpportunityMatrixTable`
Props: `{ valuedItems, isLoading }`.
- Colunas: Ativo, Classe, Cotação Atual, Preço Teto Fuente (`activeCeiling`), Margem de Segurança (`margin`), DY Líquido (`dividendYield`), Regime Tributário (`taxRegimeLabel`), Ação Recomendada (`recommendedAction`).
- Chips de filtro por classe (Ações BR, FIIs, Fiagros, FI-Infras, REITs, ETFs US, ETFs BR, Ações US), replicando os filtros do protótipo.
- Inclui itens com `quantity === 0` (watchlist) e `quantity > 0` (possuídos).

## Dados e cálculos novos

**YoC líquido médio ponderado** (`weightedYieldOnCost.ts`):
```
soma(valor_posição_i * yieldOnCost_liquido_i) / soma(valor_posição_i)
```
Usa `getPositionValue` (já existe em `calculations.ts`) para valor de posição e `dividendYield`/`netAfterTax` para o YoC líquido de cada item.

**Ação Recomendada** (`recommendedAction.ts`): reaproveita o padrão de `computeCardVerdict` (ScreenerScreen) — classifica em algo como "Comprar" (margem ≥ 10%), "Observar" (margem 0–10%), "Evitar/Esticado" (margem < 0), "Yield Trap" (aviso ativo), "Sem dados".

**Regime Tributário** (`taxRegimeLabel.ts`): mapeia `AssetType` para rótulos como "Isento (Lei 11.033)", "Isenção Dupla (Lei 12.431)", "WHT 30% Compensável", etc. — mesmas regras hoje descritas em `src/lib/legal-content.ts`/página de IR, centralizadas numa função reutilizável.

## i18n

Todos os textos novos entram em `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`, seguindo o padrão de chaves aninhadas já usado (ex: `t.dashboard.fireEngine.title`).

## Testes

- Funções puras novas (`weightedYieldOnCost`, `recommendedAction`, `taxRegimeLabel`) ganham testes unitários com fixtures, seguindo o padrão de `src/lib/__tests__/`.
- Componentes recebem dados via props sempre que possível, permitindo testes de render com fixtures fixas (padrão já usado em `ConsensusPyramid.test.tsx`, `WatchlistKpiSection.test.tsx`).
- Teste de integração leve do novo `app/index.tsx` garantindo que os 5 blocos renderizam sem crash com portfólio vazio e com portfólio populado (estados de loading/empty já são um padrão tratado em várias telas do projeto).

## Riscos / pontos de atenção

- **Responsividade:** a tabela de 8 colunas (`OpportunityMatrixTable`) precisa de tratamento mobile — o app já usa `responsive-table.tsx` em outros lugares; reaproveitar esse padrão.
- **Performance:** `ContributionEngineCard` roda `askEngine` a cada input de valor — já é o comportamento de `/app/contributionplan` hoje, sem soluço reportado; manter debounce se necessário (decisão de implementação).
- **YoC líquido médio ponderado** é um cálculo novo sem precedente direto no código — precisa de revisão cuidadosa nos testes para não divergir do "Yield on Cost" já exibido em outros lugares (ex: `FixedIncomePanel`, watchlist).
