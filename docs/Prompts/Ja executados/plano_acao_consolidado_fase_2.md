# Plano de Ação Consolidado — Fase 2 Sweep (Sub-lotes A, B, C, D)

**Total de achados individuais:** ~58, distribuídos em 7 clusters por causa raiz
**Metodologia:** `fuente-solution-architect` (agrupamento por padrão, não por
arquivo) + `fuente-product-manager` (classificação de severidade) +
`fuente-architecture-review` (gate das 9 Regras)

---

## Cluster 0 — 🔴 Corrigir Imediatamente, Sem Decisão de Produto

Bugs de integridade de dado ou fluxo quebrado. Zero ambiguidade de solução.

| # | Achado | Origem | Pontuação | Ação |
|---|---|---|---|---|
| 0.1 | Snapshot de patrimônio corrompido no Firestore (`totalInvestedBRL` usa `currentPrice` em vez de `averagePrice`) | D | 40 | Consumir `totals.totalInvestedBRL` de `useValuedPortfolio` |
| 0.2 | CTA "Desbloquear Pro" morto (eventos DOM sem listener) | D | 50 | Substituir por `useAuthModal()`/`PaywallDialog` direto |
| 0.3 | Edição de tipo de ativo não propaga pro motor de cálculo | D | 45 | `onSubmit` deve disparar ao mudar tipo, não só ao selecionar |
| 0.4 | CSV import avançado sem `return true` — modal nunca fecha | B | 40 | Adicionar `return true;` no ramo `isAdvancedTemplate` |
| 0.5 | `FeedbackWidget` descarta mensagens do usuário silenciosamente (setTimeout fake) | D | 36 | Integrar com backend real ou desativar com aviso "Em breve" |
| 0.6 | Auto-pick de ticker seleciona ativo errado silenciosamente | D | 36 | Só selecionar em match exato, nunca `?? suggestions[0]` |
| 0.7 | Contaminação cambial na TIR (fallback BRL injetado em cálculo USD) | C | 28 | Não usar `currentPortfolioValue` consolidado como fallback nativo |
| 0.8 | `AddToWatchlistDialog` sem validação de valor negativo | D | 35 | Bloquear preço médio / meta mensal < 0 |
| 0.9 | Fees descartados em import de nota/CSV avançado | B | 32 | Ratear/mapear `fees` para a `Transaction` |
| 0.10 | `parseInt` trunca frações e zera custódia silenciosamente | B | 32 | Validar antes de aceitar, nunca forçar a zero sem aviso |
| 0.11 | `SnowballSimulator` ignora `useValuedPortfolio`, descarta ativos cross-currency | D | 32 | Consumir `useValuedPortfolio` + conversão de câmbio real |
| 0.12 | Meta de custo de vida sem moeda associada → distorção de 5,5× nos anos p/ FI | D | 32 | Armazenar moeda de origem da meta |
| 0.13 | `AddToWatchlistDialog.tsx:50` — mesmo bug de ID do Item 17, 3ª ocorrência | Pré-Fase-2 | — | Usar `makeId()`, mesma correção do Item 17 |

**Subtotal Cluster 0: 13 itens — prioridade máxima, cada um vira 1 ciclo de plano→diff→gates, igual aos 5 itens de código anteriores.**

---

## Cluster 1 — 🟠 Fuso Horário / Manipulação de Data (padrão sistêmico)

Mesma causa raiz repetida em 4 lugares — provável 1 correção central resolve os 4.

| # | Achado | Origem | Pontuação |
|---|---|---|---|
| 1.1 | `AddFixedIncomeDialog` + `DividendsHistoryPanel` — `toISOString().split("T")[0]` gera dia errado em GMT-3 após 21h | B | 35 |
| 1.2 | `utils.ts:formatExDate` — mesma comparação UTC vs local, oculta "Data Com" do dia | B | 32 |
| 1.3 | `AssetCard.tsx:419-424` — janela de histórico com skew de 1 dia | A | 16 |

**Ação recomendada:** criar 1 helper único de data local (`getLocalDateISO()` ou similar) em `src/lib/` e substituir as 3+ ocorrências, em vez de corrigir cada uma isoladamente. Mesmo padrão da correção que já fizemos em `cashflow.ts` (local vs UTC) — reaproveitar a lição.

---

## Cluster 2 — 🟡 Fallback Silencioso Sem Indicação Visual (padrão de auditabilidade)

`fuente-investidor-profissional`: todo valor estimado/fallback precisa de sinal visual — princípio já estabelecido nesta investigação (mesmo padrão do bug `isPaid`/`paymentDateEstimated` que já corrigimos).

| # | Achado | Origem | Pontuação |
|---|---|---|---|
| 2.1 | `AllocationChart` — câmbio `?? 5.5` silencioso | B | 35 |
| 2.2 | `PortfolioIrrCard` — CDI cai pra Selic sem indicar | C | 25 |
| 2.3 | `AssetComparator`/`DividendRadar` — Selic fallback sem indicador | D | 28 |
| 2.4 | `useLiveQuotesAndMeta` — suprime `isError`/`isFetching` | B | 28 |
| 2.5 | `BrokerNoteUploader` — data inválida vira `Date.now()` silenciosamente | B | 35 |

**Ação recomendada:** criar um componente/padrão compartilhado (`FallbackBadge` ou `EstimatedIndicator`) + convenção de nomear toda variável de fallback com flag explícita (`isFallback: boolean`), reaproveitando o padrão que já criamos pro `isPaid`.

---

## Cluster 3 — i18n Hardcode (maior cluster em volume, menor risco individual)

19 ocorrências. Baixo risco técnico cada uma, mas em volume é uma degradação real da experiência em `en`/`es`.

| Arquivo | Achado | Origem |
|---|---|---|
| `FIProgressCard.tsx` | "ano"/"anos"/"mês"/"meses", título, disclaimer | A, D |
| `useAssetCardDerived.ts` | Texto de compartilhamento em inglês fixo | A |
| `ValuationAssumptionsModal.tsx` | Nota de auditoria em português fixa | A |
| `AssetCardHeader.tsx` + `AssetCard.tsx` | 2 `aria-label` em inglês | A |
| `CashFlowEmptyState.tsx` | PT/EN hardcoded, exclui espanhol | C |
| `PortfolioIrrCard.tsx` | Sufixos "% a.a." e `.toFixed(1)` sem locale | C |
| `CashFlowChart.tsx` | Formatação manual de data DD/MM | C |
| `FixedIncomePanel.tsx` | "% do CDI" sem chave i18n | B |
| `SmartAllocation.tsx:471` | Tooltip força "BRL" | D |
| `WatchlistKpiSection.tsx:89,102` | Moeda consolidada hardcoded "BRL" | B |
| `AddToWatchlistDialog.tsx:106` | Texto de auth 100% em inglês | D |
| `MaskedInput.tsx` | Sem suporte a `es`, moeda acoplada à língua | D |
| `GoalPlanner.tsx:105-107` | `.split("{{qty}}")` quebra gramática em pt/es | D |
| `AssetDataDisplay.tsx:91` | `.toFixed(1)` sem separador decimal localizado | D |
| `RiskRadar.tsx` | Enum bruto exibido, botão fixo em português | D |
| `Header.tsx:138` | Badge de câmbio hardcoded | D |

**Ação recomendada:** não abrir 16 planos separados — agrupar num único ciclo "i18n sweep" por dicionário (todas as chaves novas nos 3 idiomas de uma vez), como já fizemos nos itens anteriores.

---

## Cluster 4 — Acoplamento / SSOT (arquitetural, menor urgência)

| # | Achado | Origem | Pontuação |
|---|---|---|---|
| 4.1 | `AssetCardHeader.tsx` — lógica de risco inline, deveria ser função de domínio | A | 20 |
| 4.2 | `AssetCardHeader.tsx` — yield recalculado inline fora do SSOT | A | 20 |
| 4.3 | `flagFor` triplicado (`AssetCard.tsx`, `SmartAllocation.tsx`, `watchlist/utils.ts`) | A | 10 |
| 4.4 | `CashFlowSummary.tsx:compactWithSymbol` diverge de `formatters.ts` | C | 20 |
| 4.5 | `ResultStats.tsx` — prop `isPro` morta concorrendo com `useFeatureGate` | C | 25 |
| 4.6 | `WatchlistKpiSection.tsx` — `useQueries` duplicado do hook pai | B | 28 |
| 4.7 | `AssetDetailSheet.tsx:367-372` — conversão cambial inline sem `convertCurrency()` | B | 25 |
| 4.8 | `AssetDetailSheet.tsx:147` — mutação Firestore direto em subcomponente de apresentação | B | 24 |

---

## Cluster 5 — UX / Semântica Visual (decisão de produto leve, não bug puro)

| # | Achado | Origem | Pontuação | Nota |
|---|---|---|---|---|
| 5.1 | `ResultStats.tsx` — paywall bloqueia clique no `InfoTooltip` | C | 30 | Fix técnico simples (`stopPropagation`), sem decisão de produto |
| 5.2 | `ResultStats.tsx` — card de Preço Teto sempre verde, mesmo com margem negativa | C | 20 | Decisão de cor — `fuente-ux-designer` |
| 5.3 | `ConsensusPyramid.tsx` — tooltip só aparece quando modelo é nulo | B | 25 | Fix simples |
| 5.4 | `CashFlowSummary.tsx` — falta tooltip sobre retenção de 15% no JCP | C | 20 | Adição, não bug |
| 5.5 | `DividendHistoryChart.tsx` — eixos Y ocultos, sem referência auditável | C | 16 | `fuente-ux-designer` |
| 5.6 | `AssetComparator.tsx:341` — ativos novos marcados incorretamente como "Simulação" | D | 25 | Bug de lógica, fix direto |
| 5.7 | `TickerSearchField.tsx` — colisão visual de popovers durante busca | D | 28 | Polish visual |
| 5.8 | `DividendHistoryChart.tsx:24-32` — YoY sem ordenação + 0% artificial no 1º ano | C | 28 | Bug de cálculo |

---

## Cluster 6 — Compliance / Regulatório

| # | Achado | Origem | Pontuação |
|---|---|---|---|
| 6.1 | `RegulatoryDisclaimerBanner.tsx` — rotas `/app/riskradar` e `/app/fi` fora da lista de disclaimer CVM obrigatório | D | 28 |

**Nota:** `fuente-advogado-lgpd-gdpr` — isso é o único achado da Fase 2 com implicação regulatória direta (CVM). Merece checagem antes do Cluster 0, apesar da pontuação não ser a mais alta — é risco de compliance, não só UX.

---

## Cluster 7 — Código Morto

| # | Achado | Origem |
|---|---|---|
| 7.1 | `SummaryCard.tsx` (watchlist/) órfão, nunca importado — atenção: existe um componente homônimo ativo em `routes/app/index.tsx`, não confundir na remoção | B |
| 7.2 | `CashFlowHeader.tsx:7` — tipo `ViewMode` exportado sem uso | C |

---

## Ordem de Execução Recomendada (Product Manager — RICE informal)

1. **Cluster 6** (compliance CVM) — risco regulatório, resolve rápido, prioridade ética antes de tudo.
2. **Cluster 0** (13 itens críticos) — maior severidade combinada, cada um vira 1 ciclo de plano→diff→gates como fizemos nos 5 itens anteriores.
3. **Cluster 1** (fuso horário, 3 ocorrências → 1 correção central).
4. **Cluster 2** (fallback silencioso, 5 ocorrências → 1 padrão compartilhado).
5. **Cluster 4** (acoplamento/SSOT, 8 itens — menor urgência, mas mesma classe de problema que já resolvemos nos itens de código).
6. **Cluster 5** (UX/semântica, 8 itens).
7. **Cluster 3** (i18n, 16 itens — 1 ciclo único de dicionário).
8. **Cluster 7** (código morto, 2 itens — trivial, pode entrar em qualquer PR de baixo risco).

---

## Governança (Regra 9)

Cada cluster, ao virar prompt de execução, recebe sua própria tabela de 9 papéis
— não uma tabela única para os 58 achados. Mantendo o padrão que já seguimos em
toda essa investigação: plano → diff real → 3 gates → aprovação → commit → push,
item por item ou cluster por cluster conforme o agrupamento acima, nunca em lote
sem revisão.
