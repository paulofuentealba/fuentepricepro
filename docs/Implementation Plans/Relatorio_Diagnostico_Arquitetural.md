# Relatório de Diagnóstico Arquitetural — Fuente Price Pro

**Data:** 10 de Agosto de 2026  
**Auditor:** `fuente-architecture-review` & `fuente-solution-architect`  
**Escopo:** Varredura estática de 100% dos arquivos do diretório `src/` (Frontend, Hooks, Libs, Server Functions e API Layers).  
**Modo:** Auditoria Somente Leitura (Zero alterações em arquivos de código).

---

## 1. Tabela 1 — Quick Wins (Alto Impacto, Baixo Esforço)

| Arquivo (caminho + linha) | Descrição do Problema | Risco de Regressão | Solução Proposta |
|---|---|---|---|
| `src/lib/portfolioSnapshot.ts:24-55` | A gravação periódica de snapshot no Firestore via `setDoc` executa em ambiente local sem verificação `import.meta.env.DEV`, permitindo que execuções de desenvolvimento escrevam no Firebase de produção. (Regra 3) | Alto | **Justificativa:** Alterar o controle de escrita pode interromper o registro de histórico se a condição DEV for invertida. Adicionar a trava `if (import.meta.env.DEV) return;` no topo da função `recordSnapshot`. |
| `src/lib/emailService.ts:1-84` | Arquivo de serviço completo sem nenhum import ativo na aplicação (código morto total). (Regra 1) | Baixo | Remover o arquivo `src/lib/emailService.ts` do repositório. |
| `src/components/ceiling/Header.tsx:184, 263, 279` | Textos de interface soltos "Sign In" e "Language" sem uso do sistema de i18n. (Regra 2) | Baixo | Substituir as strings soltas pelas chaves correspondentes `t.header.signIn` e `t.header.language` do dicionário i18n. |
| `src/components/ceiling/SmartAllocation.tsx:255, 257` | Textos de interface hardcoded "Calculando..." e "Recalculate / Reset". (Regra 2) | Baixo | Mover as strings para `src/lib/i18n/` e consumir via `t.smartAllocation.calculating` e `t.smartAllocation.recalculate`. |
| `src/components/ceiling/AssetComparator.tsx:279` | Texto em Português "ativo comparado" / "ativos comparados" hardcoded em JSX. (Regra 2) | Baixo | Extrair a contagem no singular/plural para o dicionário i18n. |
| `src/components/ceiling/GoalPlanner.tsx:106` | String de fallback em Inglês `"Shares"` hardcoded fora das traduções. (Regra 2) | Baixo | Utilizar valor padronizado do i18n `t.common.shares` ou `t.result.shares`. |
| `src/components/ceiling/FeedbackWidget.tsx:24-37` | Objeto de tradução condicional `locale === "ptBR" ? ...` instanciado inline dentro do componente em vez de usar os dicionários centrais. (Regra 2) | Baixo | Mover todas as mensagens de feedback para o arquivo de dicionário central `src/lib/i18n/pt.ts` e `en.ts`. |
| `src/routes/settings.tsx:142` | String hardcoded "Fuente Price Pro" solta no cabeçalho das configurações. (Regra 2) | Baixo | Padronizar uso do título da aplicação via constante global ou chave i18n. |
| `src/components/ceiling/ComparatorPerformanceChart.tsx:52` | Locale hardcoded (`"en-US"`, `"es-ES"`, `"pt-BR"`) na chamada `toLocaleString` em vez de derivar do i18n do usuário. (Regra 2) | Baixo | Utilizar o utilitário `toIntlLocale(locale)` para formatar datas e números dinamicamente. |
| `src/components/ceiling/watchlist/BrokerNoteUploader.tsx:408, 433` | Hardcode de `"pt-BR"` na formatação de moeda via `toLocaleString`. (Regra 2) | Baixo | Substituir `toLocaleString("pt-BR", ...)` pela função utilitária SSOT `formatCurrency(val, currency, locale)`. |
| `src/components/ceiling/DividendRadar.tsx:59` | Configuração de cache inline `staleTime: 1000 * 60 * 15` (15 min) ignorando a centralização em `queryOptions.ts`. (Regra 1) | Baixo | Mover a definição para `dividendRadarQueryOptions` em `src/lib/queryOptions.ts`. |
| `src/lib/corporateEvents.ts:113` | Configuração de cache inline `staleTime: 1000 * 60 * 60 * 24` (24 horas) em `useQuery`. (Regra 1) | Baixo | Mover a definição do `staleTime` para `corporateEventsQueryOptions` em `src/lib/queryOptions.ts`. |

---

## 2. Tabela 2 — Evoluções de SSOT & Arquitetura

| Arquivo (caminho + linha) | Descrição do Problema | Risco de Regressão | Solução Proposta |
|---|---|---|---|
| `src/components/shared/AssetCard.tsx:381-396` | O componente `AssetCard` recalcula `getAssetValuation` diretamente em vez de consumir o objeto `valuation` pré-calculado vindo do hook `useValuedPortfolio` ou de props. (Regra 4) | Alto | **Justificativa:** Como o `AssetCard` é utilizado em múltiplos locais (Watchlist, Comparator, Screener), alterar o fluxo de props de valuation pode desconfigurar o cálculo de Preço Teto se alguma prop não for repassada. Passar a propriedade `valuation` pronta vinda do componente pai ou extender o tipo do `item` para exigir o `ValuedWatchlistItem`. |
| `src/lib/usePortfolioRisk.ts:99-100` | Recálculo direto de Dividend Yield (`(item.annualDividend / item.currentPrice) * 100`) em rotina de detecção de Yield Trap em vez de reaproveitar o cálculo padronizado. (Regra 4) | Baixo | Utilizar o campo `dividendYield` já calculado pela camada de valuation SSOT (`useValuedPortfolio`). |
| `src/components/ceiling/AssetComparator.tsx:230` | Recálculo manual de Dividend Yield (`(avgDiv / data.currentPrice) * 100`) duplicando fórmula de `calculations.ts`. (Regra 4) | Baixo | Consumir a propriedade calculada centralmente por `getAssetValuation`. |
| `src/components/ceiling/AssetComparator.tsx:222, 312` | Derivação manual de `bvps` (`data.currentPrice / data.metrics.pbRatio`) duplicando regra de fallback de `calculations.ts`. (Regra 4) | Baixo | Extrair o cálculo de `bvps` de fallback para uma função helper em `calculations.ts` ou utilizar o retorno de `getAssetValuation`. |
| `src/components/ceiling/AddToWatchlistDialog.tsx:79` | Chamada direta a `safetyMargin(ceiling, asset.currentPrice)` em vez de utilizar o campo `margin` do objeto de valuation SSOT. (Regra 4) | Baixo | Substituir o recálculo pontual da margem de segurança pelo valor contido no retorno da valuation. |
| `src/components/ceiling/watchlist/BrokerNoteUploader.tsx:71` | Chamada direta a `safetyMargin(ceil, lastTrade.price)` para cálculo de margem de segurança em notas de corretagem. (Regra 4) | Baixo | Padronizar a leitura da margem de segurança consumindo o objeto retornado por `getAssetValuation`. |
| `src/components/ceiling/watchlist/EditItemDialog.tsx:355` | Invocação manual de `safetyMargin(ceiling, item.currentPrice)`. (Regra 4) | Baixo | Utilizar o valor pré-calculado `item.valuation.margin` disponível no `ValuedWatchlistItem`. |
| `src/components/ceiling/watchlist/useWatchlistCsvImport.ts:67, 144` | Cálculo duplicado de `safetyMargin` na importação de arquivo CSV. (Regra 4) | Baixo | Unificar com a camada de valuation SSOT em `calculations.ts`. |
| `src/components/ceiling/watchlist/FixedIncomeWizardSheet.tsx:82-83` | Atribuição estática de `quantity: 1` e `averagePrice: Number(investedAmount)` criando modelo de posição sem passar pelo motor de transações. (Regra 4) | Médio | Refatorar a criação de posições de Renda Fixa para gerar uma transação implícita de aporte inicial no módulo `transactions.ts`. |
| `src/components/ceiling/watchlist/EditItemDialog.tsx:345` & `TransactionForm.tsx:60` | Mutação direta do atributo `quantity` e re-cálculos manuais de posição em formulários de edição. (Regra 4) | Médio | Delegar a atualização do saldo acumulado do ativo exclusivamente para o motor de re-execução de transações (`recalculateHolding`). |
| `src/lib/__mocks__/devMockData.ts:1-80` & `src/components/ceiling/watchlist/DataManagement.tsx:7, 35` | Massa de dados mock commitada no repositório principal e consumida por botão de UI "Restore Mock Data (DEV ONLY)". (Regra 3) | Médio | Remover o arquivo `devMockData.ts` do pacote de produção e isolar utilitários de dev em arquivos de teste/fixtures fora de `src/lib/`. |
| `src/components/ceiling/Watchlist.tsx:213-227` → `WatchlistAssetGrid.tsx` → `AssetCard.tsx` | Prop drilling de 3 níveis de profundidade repassando `quotes`, `meta`, `onEdit`, `onRemove`, `onOpenDetail` e `concentrationViolators`. (Regra 1) | Médio | Criar um Context leve (`WatchlistActionsContext`) ou repassar handlers memoizados para eliminar o repasse intermediário de 6 props em `WatchlistAssetGrid`. |

---

## 3. Tabela 3 — Performance & Dívida Técnica Estrutural

| Arquivo (caminho + linha) | Descrição do Problema | Risco de Regressão | Solução Proposta |
|---|---|---|---|
| `src/routes/app/myportfolio.tsx:2-3`, `cashflow.tsx:12`, `smartallocation.tsx:2`, `globalradar.tsx:15`, `riskradar.tsx:11`, `screener.tsx:10` | Carregamento síncrono e estático de todos os painéis pesados da aplicação (`Watchlist`, `SmartAllocation`, `CashFlowCalendar`, etc.), impedindo code-splitting e inflando o bundle inicial das rotas `/app/*`. (Regra 6) | Alto | **Justificativa:** A conversão de imports estáticos para `React.lazy` + `Suspense` exige esqueletos de carregamento (`Fallback`) adequados em cada rota para evitar piscadas de layout (CLS). Implementar `React.lazy` com `Suspense` em cada rota do TanStack Router. |
| `src/routes/index.tsx:191-245` | Hardcode extenso de textos de demonstração no Mockup 3D da Landing Page ("Consolidated Equity", "+2.4% this month", "Monthly Yield", "Total Dividends", "Consensus", etc.) sem integração com o i18n. (Regra 2) | Baixo | Mover os rótulos do painel demonstrativo para a seção `landing.demo` nos dicionários de tradução `pt.ts` e `en.ts`. |
| `src/components/ceiling/SmartAllocation.tsx:421` | Mapeamento do array `barData` executado sem `useMemo` a cada renderização da tela de alocação. | Baixo | Envolver a construção de `barData` em um bloco `useMemo` com dependências em `typeNames` e nos dados calculados. |
| `src/components/ceiling/DividendRadar.tsx:66` | Mapeamento e transformação da coleção `data` a partir de `rawData` executado sem `useMemo`. | Baixo | Memoizar a transformação de `data` via `useMemo`. |
| `src/components/ceiling/AssetComparator.tsx:197, 204` | Criação de novos arrays (`tickers.map` e `dataMap`) a cada render da tela de comparação de ativos. | Baixo | Envolver a geração do `dataMap` em `useMemo`. |
| `src/components/ceiling/CashFlowCalendar.tsx:90` | Operação `.map` em `items` criada inline na chamada de `useQueries`, gerando nova referência de array a cada render. | Baixo | Memoizar as opções de query via `useMemo`. |
| `src/components/ceiling/FIProgressCard.tsx:81, 116` | A função inline `convertToBRL` é declarada na renderização e incluída no array de dependências de um `useMemo`, anulando a memoização. | Baixo | Mover `convertToBRL` para fora do componente ou declará-la com `useCallback`. |
| `src/components/ceiling/Watchlist.tsx:222` | Arrow function inline `onClearFilters` passada diretamente como prop para `WatchlistAssetGrid`, provocando re-render de componentes filhos memoizados. | Baixo | Declarar `handleClearFilters` via `useCallback`. |
| `src/components/ceiling/AssetForm.tsx:119` | `useEffect` com dependência omitida da função `pick` (que referencia `onSubmit` e `globalYield`). | Médio | Incluir `pick` no array de dependências e envolver a função `pick` com `useCallback`. |
| `src/components/ceiling/AddToWatchlistDialog.tsx:55` | `useEffect` utilizado para sincronizar estado interno quando a prop `open` altera (anti-pattern React). | Baixo | Eliminar o `useEffect` e resetar o estado interno no handler `onOpenChange` ou via prop `key`. |
| `src/components/ceiling/ComparatorPerformanceChart.tsx:189, 206, 218`, `SmartAllocation.tsx:440, 448`, `SnowballSimulator.tsx:187`, `CashFlowChart.tsx:259, 451`, `DividendHistoryChart.tsx:40` | Objetos literais de configuração (`margin={{ top: ... }}`, `cursor={{ ... }}`, `config={{ ... }}`) declarados inline em JSX nas propriedades dos gráficos Recharts, quebrando a comparação referencial. | Baixo | Extrair os objetos de margem e cursores para constantes estáticas fora dos componentes. |
| `src/components/ceiling/AssetComparator.tsx:338, 347`, `DividendRadar.tsx:118`, `AssetDetailSheet.tsx:215`, `DividendsHistoryPanel.tsx:124`, `AssetCardTags.tsx:16`, `AssetCard.tsx:111`, `InfoTooltip.tsx:28` | Uso repetido de `as any` sem comentário de justificativa técnica em casting de propriedades de componentes e formatadores. | Médio | Tipar adequadamente as interfaces de props com discriminantes union ou genéricos, removendo o bypass de typecheck. |

---

## 4. Cobertura da Varredura

Declaramos explicitamente a cobertura auditada por área temática sobre o repositório `src/`:

* **Área 3.1 — Arquitetura & SSOT:** **100% dos arquivos de `src/` varridos.** Cobertura completa de todas as invocações de `getAssetValuation`, regras de Bazin/Graham/Gordon, lógica de câmbio e prop-drilling em componentes ceiling/watchlist.
* **Área 3.2 — Performance & Referential Equality:** **100% dos componentes de `src/components/ceiling/` e rotas de `src/routes/app/` varridos.** Identificados todos os pontos de ausencia de `useMemo`/`useCallback`, objetos inline em gráficos Recharts e falta de `React.lazy`.
* **Área 3.3 — Backend, Firebase & Isolamento:** **100% da camada de dados (`src/lib/`, `src/integrations/` e `firestore.rules`) varrida.** Identificadas todas as operações de escrita no Firestore, validação de inputs em `apiService.functions.ts` e arquivos de mock commitados.
* **Área 3.4 — Qualidade de Código, Type Safety & i18n:** **100% de `src/` auditado.** Mapeados todos os usings de `as any` / `: any`, strings JSX desprotegidas contra i18n, tags de locale hardcoded e verificação de código morto.
