# Relatório de Status Consolidado — Varredura Multi-Lente (Sweep v2)
**Referência:** `super_prompt_v2_sweep_multi_skill.md` & Plano de Ação Consolidado  
**Data:** 24 de Agosto de 2026 | **Status da Base de Código:** Branch `dev` | 116 arquivos de teste | **710 testes unitários passando** (0 falhas) | **Fases 1, 2 e 3: 100% Concluídas**

---

## 🧭 1. Visão Geral do Fatiamento do Sweep

A varredura completa multi-lente (9 perspectivas aplicadas sobre os 274 arquivos da base) foi estruturada em **3 Fases principais**, agora **100% concluídas**:

1. **FASE 1 — Núcleo Financeiro (`src/lib/` & APIs de Servidor):**
   - Foco em integridade contábil, cálculos matemáticos, timezone, fallbacks cambiais/macroeconômicos e resiliência de cache.
   - **Status:** **100% Concluída e Mesclada em main/dev.**

2. **FASE 2 — Camada de Componentes (`src/components/ceiling/**`):**
   - **Tier 0 (Críticos):** Bugs de integridade de dados no Firestore, acoplamento destrutivo e fluxos de usuário quebrados (13 itens).
     - **Status:** **100% Concluído e Mesclado em main/dev.**
   - **Tier 1 (Auditabilidade, Suavização Silenciosa, Semântica Visual & Acoplamento):**
     - **Lote 1 (6 itens):** Paywall em tooltips, badges de contingência CDI/Selic, displayCurrency na Watchlist, Consensus Pyramid tooltips, desacoplamento de mutação no AssetDetailSheet e Compliance CVM.
       - **Status:** **100% Concluído e Mesclado em main/dev.**
     - **Lote 2 (8 itens):** Resiliência temporal em date ranges, ordenação cronológica e YoY nulo no 1º ano de dividendos, Preço Teto neutro para margens negativas, prevenção de badge espúrio de simulação, prevenção de colisão em popover de busca, desduplicação SSOT de observers de dividendos, conversão cambial canônica no header do sheet e remoção da prop morta `isPro`.
       - **Status:** **100% Concluído e Mesclado em main/dev.**
     - **Tier 1 Total:** **100% Concluído (14 de 14 itens aprovados e mesclados em main/dev).**
   - **Tier 2 (i18n, Formatação & Limpeza de Código Morto — 21 itens fatiados em 3 Lotes):**
     - **Lote 1 (9 itens — Troca Direta de String por Chave):** **100% Concluído e Mesclado em main/dev (`409e9c0`).**
     - **Lote 2 (7 itens — Lógica de Formatação e Locale):** **100% Concluído e Mesclado em main/dev (`dd9fbff`).**
     - **Lote 3 (5 itens — Limpeza de Código Morto & Chaves Órfãs):** **100% Concluído e Mesclado em main/dev (`77cefdd`).**
   - **Status Geral da Fase 2:** **100% CONCLUÍDA (48 itens aprovados e testados).**

3. **FASE 3 — Rotas, Governança de Dados Pessoais (LGPD) e Infraestrutura:**
   - **Tier 1 / Lote 1 (Segurança & Estabilidade — 3 itens):** Guarda de rota em `/settings` (`beforeLoad`), sanitização de tickers e limitação de payload (`MAX_PORTFOLIO_BFF_ITEMS = 250`) no BFF, validação de datas ISO e allowlist de benchmark em `fetchBenchmarkHistoryFn`.
     - **Status:** **100% Concluído (`138e93e`).**
   - **Tier 2 / Lote 2 (Governança LGPD — 2 itens):** Inclusão de mensagens de feedback no backup pré-exclusão (`dataExport.ts`) e TTL de 12 meses (365 dias) no Cookie Consent (`cookieConsent.ts`).
     - **Status:** **100% Concluído (`1d248c0`).**
   - **Status Geral da Fase 3:** **100% CONCLUÍDA (5 de 5 itens aprovados e testados).**

---

## ✅ 2. Histórico de Alterações Realizadas (100% Concluído)

### 🔹 FASE 1 — Núcleo Financeiro (Todos os Lotes 1, 2, 3 e Sub-lotes A, B, C)

| Lote / Sub-lote | Arquivos Alterados | Descrição da Correção Realizada |
| :--- | :--- | :--- |
| **Lote 1** | `calculations.ts` | Prevenção de `NaN` em datas malformadas de Renda Fixa; padronização de `calculateShareholderYield` para escala percentual (0–100%) com teste de pipeline ponta a ponta. |
| **Lote 2** | `portfolioBff.ts`, `cashflow.ts`, `portfolioIrr.ts`, `apiService.functions.ts`, `dadosDeMercadoScraper.server.ts`, `secEdgar.server.ts` | • Unificação de fallback cambial para o SSOT `EXCHANGE_RATE_FALLBACK` em BFF e hooks.<br>• Alinhamento de indexação de mês em `computeCashFlowSummary` com buckets UTC.<br>• Correção no cálculo de IRR para evitar fabricação de `currentPrice` como custo de aquisição.<br>• Prevenção de fallback para modo guest quando usuário possui transações reais no ledger.<br>• Implementação de Backoff TTL no cache de CIK da SEC EDGAR contra efeito manada (N+1 outage stampede).<br>• Sanitização de expressões regulares contra Regex Injection em `dadosDeMercadoScraper.server.ts`.<br>• Sanitização rigorosa de credenciais e API keys em logs de erro de rede e telemetria. |
| **Lote 3** | `calculations.ts`, `calculations_stock_br.ts`, `piotroski.ts`, `macroDefaults.ts` | • Retorno `null` para modelos Gordon com resultado não-positivo.<br>• Aplicação de `netAfterTax` e taxa de desconto por moeda em valuation genérico.<br>• Pontuação de alavancagem de Piotroski para endividamento zero sustentado.<br>• Juros compostos geométricos padrão ANBIMA para indexador IPCA em títulos de renda fixa.<br>• Centralização de constantes macroeconômicas internacionais no SSOT `macroDefaults.ts`.<br>• Remoção da propriedade não utilizada `exchangeRate` em `AssetValuationParams`.<br>• Propagação de `null` indeterminado para `yieldTrapWarning` em modo BFF. |
| **Sub-lotes A, B e C** | `realizedIncome.ts`, `cashflow.ts`, `AssetProjectionPanel.tsx`, `dividendProjection.ts`, `suggestedAllocation.ts`, `hgBrasil.server.ts`, `cacheConfig.server.ts` | • Uso de `getLocalDateISOString` em `normalizeDateStr` prevenindo skew de timezone UTC.<br>• `EXCHANGE_RATE_FALLBACK` definido como parâmetro default canônico em `cashflow.ts`.<br>• Contrato estrito decimal para `annualYield` e ajuste de escala de `currentDy` em `AssetProjectionPanel`.<br>• Composição geométrica mensal em `simulateDividendProjection`.<br>• Algoritmo de maiores restos de **Hare-Niemeyer** implementado em `suggestedAllocation.ts`.<br>• Exigência de correspondência exata de ticker na API HG Brasil, eliminando fallback silencioso de `items[0]`.<br>• Centralização de todos os TTLs de cache server-side no SSOT `cacheConfig.server.ts`. |

---

### 🔹 FASE 2 — Tier 0 (Bugs Críticos de Integridade e Quebra de Fluxo)

| Item | Componente / Arquivo | Descrição da Correção Realizada |
| :--- | :--- | :--- |
| **0.1** | `CashFlowCalendar.tsx` | **🔴 Snapshot Histórico Corrompido:** `totalInvestedBRL` corrigido de `quantity * currentPrice` para o custo real `averagePrice * quantity`, estancando a gravação de dados incorretos de rentabilidade no Firestore de usuários reais. |
| **0.2** | `BlurredPreviewOverlay.tsx` | **🔴 CTA Morto:** Substituído dispatch de eventos DOM órfãos sem listener por consumo direto de `useAuthModal().openAuthModal()` e `PaywallDialog`. |
| **0.3** | `AssetForm.tsx` | **🔴 Edição de Tipo:** Disparo imediato de `onSubmit` ao alterar classe do ativo no dropdown. |
| **0.4** | `useWatchlistCsvImport.ts` | **🔴 Modal Travado:** Adicionado `return true;` no fluxo de CSV avançado para fechar o diálogo de importação. |
| **0.5** | `FeedbackWidget.tsx` | **🔴 Descarte Silencioso:** Mensagens agora são gravadas no Firestore (coleção `feedback`) e integradas à rotina de exclusão de conta LGPD. |
| **0.6** | `TickerSearchField.tsx` | **🔴 Auto-pick Errado:** Restrito auto-pick exclusivamente para match exato (`s.ticker === target`). |
| **0.7** | `PortfolioIrrCard.tsx` | **🔴 Contaminação Cambial:** Eliminado fallback para patrimônio consolidado BRL no cálculo da TIR em USD. |
| **0.8** | `AddToWatchlistDialog.tsx` | **🔴 Validação Defensiva:** Bloqueio de valores negativos para preço médio e meta mensal. |
| **0.9 / 0.13** | `useWatchlistCsvImport.ts` / `BrokerNoteUploader.tsx` | **🔴 Taxas Descartadas:** Preservação de taxas operacionais (`fees`) no round-trip de CSV e rateio SINACOR com cap de sanidade de 2%. |
| **0.10** | `WatchlistTable.tsx` | **🔴 Custódia Zerada:** Substituído `parseInt` por `parseFloat` e bloqueio de input inválido sem zerar custódia. |
| **0.11** | `SnowballSimulator.tsx` | **🔴 Multi-moeda:** Consolidação cross-currency via `useValuedPortfolio` e taxa de câmbio oficial. |
| **0.12** | `FIProgressCard.tsx` | **🔴 Distorção de 5,5×:** Rastreamento da moeda de origem da meta de custo de vida e conversão cambial na projeção. |

---

### 🔹 FASE 2 — Tier 1 / Lote 1 (Auditabilidade e Suavização Silenciosa)

| Item | Componente / Arquivo | Descrição da Correção Realizada | Commit |
| :--- | :--- | :--- | :---: |
| **Item 1** | `ResultStats.tsx` | Desacoplado `InfoTooltip` educativo de "Exceções Fiscais" do gatilho de paywall (`stopPropagation`). | `236a7a6` |
| **Item 2** | `PortfolioIrrCard.tsx` | Badge de contingência visual para benchmarks CDI e Selic em fallback + correção no memo de `annualizedSelic`. | `84e1a68` |
| **Item 3** | `WatchlistKpiSection.tsx` | Totais consolidados respeitam `settings.displayCurrency` via `convertCurrency()`, mantendo boxes individuais em moeda nativa. | `bb054fb` |
| **Item 4** | `ConsensusPyramid.tsx` | Tooltips conceituais concisos (`t.tooltips.*`) exibidos para modelos calculados válidos (> 0) e justificativa de não aplicabilidade para nulos. | `9b96fe1` |
| **Item 5** | `AssetDetailSheet.tsx` | Desacoplada a mutação de `investingSince` em `AssetHoldings` de hooks diretos de banco, delegando ao container pai via prop estreita `onUpdateInvestingSince`. | `605812c` |
| **Item 6** | `RegulatoryDisclaimerBanner.tsx` | Migração para *Secure-by-Default* com *Deny-List* (`EXCLUDED_APP_ROUTES = ["/app/docs"]`), cobrindo automaticamente todas as telas analíticas atuais e futuras. | `f46e3a1` |

---

### 🔹 FASE 2 — Tier 1 / Lote 2 (Resiliência Temporal, Semântica Visual & Acoplamento)

| Item | Componente / Arquivo | Descrição da Correção Realizada | Commit |
| :--- | :--- | :--- | :---: |
| **Item 1** | `AssetCard.tsx`, `ComparatorPerformanceChart.tsx`, `PortfolioIrrCard.tsx` | Padronização temporal usando `getLocalDateISOString()` para cálculo de janelas de preços e rentabilidade, evitando skew de data após 21h GMT-3. | `97c1963` |
| **Item 2** | `DividendHistoryChart.tsx` | Ordenação cronológica estrita por ano antes do cálculo YoY e definição de `yoy: null` (exibido como `"—"`) para o primeiro ano da série histórica. | `f825b6a` |
| **Item 3** | `ResultStats.tsx` | Alinhamento da estilização do card de Preço Teto com a Margem de Segurança (`!isUnavailable && positive`), aplicando estilo neutro `border-muted/30 bg-muted/10` para margens negativas. | `0bcc525` |
| **Item 4** | `AssetComparator.tsx` | Correção da avaliação de `isSimulation` para `Boolean(savedItem && activeYield !== savedItem.targetYield)`, impedindo badge espúrio de simulação em novos ativos pesquisados. | `83274c0` |
| **Item 5** | `TickerSearchField.tsx` | Unificação de containers de popover em um elemento único com precedência estrita para o estado `searching`, evitando colisão visual e exibição de dados defasados durante digitação. | `a5ffeb4` |
| **Item 6** | `WatchlistKpiSection.tsx`, `useLiveQuotesAndMeta.ts`, `useValuedPortfolio.tsx`, `Watchlist.tsx`, `useRealizedIncomeSummary.ts`, `CashFlowCalendar.tsx` | Desduplicação arquitetural SSOT de observers de dividendos (`useQueries`), centralizando a extração em `useLiveQuotesAndMeta` / `useValuedPortfolio` e eliminando subscriptions redundantes. | `83ff7a1` |
| **Item 7** | `AssetDetailSheet.tsx` | Substituição da multiplicação cambial inline `livePrice * fx.USDBRL` no header do sheet pelo helper canônico SSOT `convertCurrency(livePrice, "USD", "BRL", fx.USDBRL)`. | `50d3290` |
| **Item 8** | `ResultStats.tsx`, `AssetCard.tsx` | Remoção da propriedade morta `isPro` de `Props`, da desestruturação e de seu call-site em `AssetCard`, unificando no hook direto `useFeatureGate("customTaxUnlocked")`. | `37097ac` |

---

### 🔹 FASE 2 — Tier 2 / Lote 1 (i18n: Troca Direta de String por Chave — 9 de 9 Concluídos)

| Item | Componente / Arquivo | Descrição da Correção Realizada | Commit |
| :--- | :--- | :--- | :---: |
| **Item 1** | `useAssetCardDerived.ts`, `resultCard.ts`, `dict.*.ts` | Localização do template de compartilhamento social (`result.shareTemplate`) nos 3 idiomas (`ptBR`, `en`, `es`). | `46ede00` |
| **Item 2** | `AddToWatchlistDialog.tsx`, `dict.*.ts` | Localização da mensagem de prompt de autenticação (`watchlist.signInToSave`) nos 3 idiomas. | `d3ebc24` |
| **Item 3** | `Header.tsx` | Formatação canônica do badge de câmbio USD/BRL com `formatCurrency(fx.USDBRL, "BRL", locale)`. | `d280fd7` |
| **Item 4** | `CashFlowEmptyState.tsx`, `dict.*.ts` | Substituição de ternários binários por chaves canônicas `tabs.cashflow.emptyTitle`, `emptyDesc` e `emptyAddFirstAsset` nos 3 dicionários. | `8821f48` |
| **Item 5** | `FixedIncomePanel.tsx`, `dict.*.ts` | Localização da concatenação `% do CDI` via chave canônica `watchlist.fixedIncomePanel.cdiRate` parametrizada nos 3 dicionários. | `eb8f0c7` |
| **Item 6** | `FIProgressCard.tsx`, `dict.*.ts` | Localização do título "Independência financeira" e do aviso de rodapé via `t.fiMode.financialIndependence` e `t.fiMode.consolidatedValuesNotice` nos 3 dicionários. | `2e554ad` |
| **Item 7** | `ValuationAssumptionsModal.tsx`, `dict.*.ts` | Localização do texto de auditoria das fontes de dados via `t.valuationAssumptions.auditDisclaimer` preservando siglas técnicas institucionais (CVM / SEC EDGAR / BACEN SGS). | `cb73ecc` |
| **Item 8** | `AssetDynamicFaqAccordion.tsx` | Remoção de fallbacks hardcoded em português no FAQ (`assetFaq?.title || ...`), migrando para acesso tipado direto às chaves já existentes nos 3 dicionários. | `0484053` |
| **Item 9** | `TransactionsPanel.tsx` | Remoção de fallback hardcoded em português no saldo corrente (`runningBalance?.replace(...) ?? ...`), migrando para acesso tipado canônico à chave já existente `t.transactions.runningBalance`. | `409e9c0` |

---

### 🔹 FASE 2 — Tier 2 / Lote 2 (i18n: Lógica de Formatação e Locale — 7 de 7 Concluídos)

| Item | Componente / Arquivo | Descrição da Correção Realizada | Commit |
| :--- | :--- | :--- | :---: |
| **Item 1** | `FIProgressCard.tsx`, `dict.*.ts` | Localização completa da contagem regressiva via chaves canônicas `fiMode.yearSingle`, `yearPlural`, `monthSingle`, `monthPlural` e `andJoiner` nos 3 idiomas (`ptBR`, `en`, `es`). *Nota de design:* Avaliou-se reaproveitar `formatMonthsAsYearsMonths` de `formatters.ts`, mas a função é hardcoded em PT internamente; a adoção de chaves tipadas diretas isolou o domínio de forma mais robusta. | `22334ee` |
| **Item 2** | `ValuationAssumptionsModal.tsx`, `AssetDetailSheet.tsx` | Substituição do prefixo fixo `R$` e de `.toFixed(2)` por `formatCurrency(val, currency, locale)` e `formatNumber(margin, locale, 1)`, com propagação de `currency` a partir do ativo. | `61ad060` |
| **Item 3** | `MaskedInput.tsx` | Suporte estrito a separadores monetários do idioma Espanhol (`es` usando `.` para milhar e `,` para decimal, idêntico a `ptBR`), desacoplando o fallback monetário defensivo. | `6ca5a99` |
| **Item 4** | `GoalPlanner.tsx`, `dict.*.ts` | Substituição da quebra frágil com `.split("{{qty}}")` pela criação da chave de rótulo canônica `t.result.sharesNeededLabel` ("Cotas necessárias" / "Shares needed" / "Acciones necesarias"). | `5abbbeb` |
| **Item 5** | `AssetDataDisplay.tsx` | Substituição de `.toFixed(1)` rígido em `SafetyMarginBadge` por `formatNumber(margin, locale, 1)` respeitando o locale do usuário. | `d4cb566` |
| **Item 6** | `RiskRadar.tsx` | Remoção de fallback redundante em português no botão de empty state (`t.emptyStates.goToPortfolio`) e sanitização canônica de ticker com `displayTicker` na tabela de concentração. | `1fc74e2` |
| **Item 7** | `DividendHeatmapCard.tsx`, `dict.*.ts` | Localização dinâmica de meses abreviados com `Intl.DateTimeFormat`, chave de cabeçalho `t.dividendHeatmap.yearHeader`, tooltip com `formatCurrency` respeitando moeda do ativo e números formatados com `formatNumber`/`formatPercent`. | `57bbf58` |

---

### 🔹 FASE 2 — Tier 2 / Lote 3 (Limpeza de Código Morto & Chaves Órfãs — 5 de 5 Concluídos)

| Item | Componente / Arquivo | Descrição da Correção Realizada | Commit |
| :--- | :--- | :--- | :---: |
| **Item 1** | `SummaryCard.tsx` | Exclusão do arquivo órfão `src/components/ceiling/watchlist/SummaryCard.tsx` (não importado, mantendo a implementação ativa local em `src/routes/app/index.tsx`). | `6e388ce` |
| **Item 2** | `CashFlowHeader.tsx` | Remoção da exportação do tipo não utilizado `ViewMode`. | `3deb2a8` |
| **Item 3** | `AssetCard.tsx` | Unificação e consolidação de imports por módulo/categoria e remoção dos símbolos não utilizados `ceilingPrice` e `safetyMargin`. | `2b956d8` |
| **Item 4** | `dict.*.ts` | Remoção da chave órfã `result.sharesNeeded` nos 3 dicionários (`ptBR`, `en`, `es`), preservando `result.sharesNeededLabel`. | `3774fd3` |
| **Item 5** | `dict.*.ts` | Remoção do array estático órfão `dividendHeatmap.monthsShort` nos 3 dicionários (`ptBR`, `en`, `es`), substituído pela geração dinâmica via `Intl.DateTimeFormat`. | `b8d61c0` |

---

### 🔹 FASE 3 — Rotas, Governança LGPD e Infraestrutura (5 de 5 Concluídos)

#### Tier 1 / Lote 1 — Segurança e Estabilidade Server-Side

| Item | Componente / Arquivo | Descrição da Correção Realizada | Commit |
| :--- | :--- | :--- | :--- |
| **Item 1** | `settings.tsx` | Adicionada guarda de rota assíncrona `beforeLoad` aguardando inicialização do Firebase Auth e redirecionando visitantes anônimos para `/auth`. | `138e93e` |
| **Item 2** | `portfolioBffLogic.ts`, `portfolioBff.functions.ts` | Adicionado teto defensivo de `MAX_PORTFOLIO_BFF_ITEMS = 250` contra DoS e sanitização estrita de tickers (descarte seguro de nulos, vazios ou tipos não-string sem falhar a requisição). | `138e93e` |
| **Item 3** | `apiService.functions.ts`, `benchmark.server.ts` | Validação de datas ISO `YYYY-MM-DD`, allowlist de benchmarks e guardas defensivas contra timestamps `NaN` nas chamadas ao Banco Central (SGS) e Yahoo Finance. | `138e93e` |

#### Tier 2 / Lote 2 — Governança de Dados Pessoais (LGPD)

| Item | Componente / Arquivo | Descrição da Correção Realizada | Commit |
| :--- | :--- | :--- | :--- |
| **Item 1** | `dataExport.ts`, `settings.tsx` | Inclusão das mensagens da subcoleção `users/{uid}/feedbacks` no backup JSON de exportação pré-exclusão, garantindo a completude do direito de acesso/portabilidade LGPD. | `1d248c0` |
| **Item 2** | `cookieConsent.ts` | Implementado TTL de **12 meses (365 dias)** no consentimento de cookies persistido em `localStorage`, reexibindo o banner automaticamente após a expiração. | `1d248c0` |

---

## ⏳ 3. Status das Pendências e Backlog

Com a conclusão da Fase 3, **todas as 3 Fases do Sweep v2 foram integralmente executadas e validadas**:
- **Fase 1 (Núcleo Financeiro):** 100% Concluída.
- **Fase 2 (Camada de Componentes — Tiers 0, 1 e 2):** 100% Concluída (48 itens).
- **Fase 3 (Rotas, Governança LGPD e Infraestrutura — Tiers 1 e 2):** 100% Concluída (5 itens).

### 📌 Itens de Backlog / Evolução Futura (Registrados para pós-monetização)
1. **Regra de Firestore Preventiva para Campos de Privilégio:** Quando campos administrativos (como `role`, `isAdmin`) forem adicionados ao documento `users/{userId}`, adicionar validação estrita no `firestore.rules` impedindo auto-atribuição pelo usuário (hoje o privilégio é 100% controlado via Firebase Auth Custom Claims, sem risco).

---

## 🎯 4. Conclusão Final do Sweep v2

A **Varredura Arquitetural Multi-Lente (Sweep v2) ESTÁ 100% CONCLUÍDA**, com:
- **Total de Correções:** **53+ melhorias estruturais, financeiras e de governança** aplicadas em toda a base.
- **Proteção e Qualidade:** **710 testes unitários passando em 116 arquivos**, 0 erros de tipagem TypeScript (`npx tsc --noEmit`), e build de produção 100% limpo com validação de design tokens e SSOT.
- **Conformidade LGPD & CVM:** Exportação integral de dados, exclusão ponta a ponta com revogação de credenciais, disclaimer regulatório preventivo e governança de cookies com expiração periódica.
