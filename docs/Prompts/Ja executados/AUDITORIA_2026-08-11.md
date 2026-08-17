# Auditoria Fuente Price Pro — 2026-08-11

> Auditoria completa do código em `C:\Users\paulo\OneDrive\Fuente Price Pro`
> (TanStack Start + React 19 + Firebase/Firestore + Tailwind v4).
>
> **Método:** 5 agentes especializados varreram a base em paralelo (lógica
> financeira, APIs, performance, frontend, SSOT). Todos os achados marcados
> **✓** foram re-verificados manualmente linha a linha no código real (regra
> do `SSOT.md`: nunca aceitar relato sem checar). Achados marcados **⚪**
> foram reportados pelo agente mas não re-verificados nesta sessão.
>
> **Legenda de severidade:** 🔴 BLOQUEANTE (dado financeiro errado) · ALTO ·
> MÉDIO · BAIXO.

---

## 0. Resumo executivo (verificado ✓)

| # | Achado | Área | Severidade |
|---|---|---|---|
| 1 | Cash Flow soma dividendo **bruto + líquido** do mesmo evento → mês passado mostra ~2× (BR) / ~1,7–2,4× (US) | Lógica financeira | 🔴 BLOQUEANTE ✓ |
| 2 | Renda realizada ignora conversão de moeda (USD e BRL somados sem câmbio) | Lógica financeira | 🔴 BLOQUEANTE ✓ |
| 3 | Split/agrupamento não tem efeito com ledger de transações (quantidade derivada sobrescreve) | Lógica financeira | ALTO ✓ |
| 4 | ID de `WatchlistItem` conflitante entre entry points → posições duplicadas | Lógica financeira | ALTO ✓ |
| 5 | Base de renda de dividendos divergente entre telas salvas (net vs gross) | SSOT | ALTO ✓ |
| 6 | Loop autossustentado de `onSnapshot` em `useTransactions` | Performance | ALTO ✓ |
| 7 | 5× `useValuedPortfolio` na home `/app` → ~10 listeners na mesma coleção | Performance | ALTO ✓ |
| 8 | Zero compressão no servidor de produção | Performance | ALTO ✓ |
| 9 | Cadeia de fallback Brapi→Yahoo quebrada (timeout vira 500) | API | ALTO ✓ |
| 10 | Selic lida direto do client, fora da camada de proxy, fallback silencioso 10,5 | API | ALTO ✓ |
| 11 | Home `/app` inteira em pt-BR hardcoded (em produção) — Regra 2 | Frontend | ALTO ✓ |
| 12 | `FeedbackWidget` simula envio com `setTimeout` + toast de sucesso | Frontend | ALTO ✓ |

---

## 1. Bugs na lógica financeira (7 itens)

### 🔴 1.1 Cash Flow superestima a renda confirmada (double-counting) ✓
`src/lib/cashflow.ts:227,255` + `src/components/ceiling/cashflow/CashFlowChart.tsx:83-89,318-351`

Para meses passados, o bucket recebe simultaneamente `paidAmount` (dividendo **bruto** via `amountPerShare × quantidade`) e `realizedAmount` (dividendo **líquido** via `calculateRealizedIncome`). O gráfico empilha os dois no **mesmo `stackId="a"`** com a mesma cor `var(--realized)`, e o tooltip soma `realizedAmount + paidAmount + announcedAmount`.

- BR: ~**2×** o valor real (imposto 0 → net ≈ gross)
- US: ~**1,7×** o bruto / ~**2,4×** o líquido
- Mês corrente: mesmo overlap entre `realizedAmount` (já pago) e `projectedAmount` (projeção inclui o evento já pago)

**Correção:** decidir uma base única por mês (ou só líquido realizado, ou só bruto) e remover o outro do stack/tooltip.

### 🔴 1.2 Renda realizada ignora conversão de moeda ✓
`src/lib/realizedIncome.ts:190-230` + `src/lib/useRealizedIncomeSummary.ts:70-73` + `src/routes/app/index.tsx:73,81`

`computeRealizedIncomeSummary(events, currency)` declara o parâmetro `currency` e **nunca o usa** — soma `ev.amountNet` de eventos USD e BRL sem conversão cambial. O dashboard exibe `realizedSummary.currentYear` formatado como BRL e o Cash Flow idem.

- Carteira mista BR+US: US$100 + R$100 exibidos como R$200 (em vez de ~R$650)
- Carteira 100% US: valor exibido ~5,5× menor que o real

**Correção:** usar o `currency` já recebido e converter via `fx` (mesma taxa do `useValuedPortfolio`).

### 1.3 Split/agrupamento não tem efeito com ledger de transações (ALTO) ✓
`src/components/portfolio/CorporateEventModal.tsx:84-90` + `src/lib/useValuedPortfolio.ts:50-54`

O modal grava apenas `quantity`/`averagePrice` no item da watchlist, sem transação de ajuste. Quando o ativo tem histórico de transações, `useValuedPortfolio` recalcula a quantidade derivada (`recalculateHoldingFromTransactions`) e sobrescreve o valor persistido → o split é efetivamente ignorado para quem usa o ledger: posição, valuation e renda realizada (replay de transações) seguem pré-evento.

**Correção:** gravar uma transação de ajuste idempotente (como as sintéticas de CSV/broker note) em vez de só sobrescrever o item.

### 1.4 ID de `WatchlistItem` conflitante → posições duplicadas (ALTO) ✓
`src/lib/buildWatchlistItem.ts:24` vs `src/lib/watchlist.ts:61-63`

O mesmo ativo ganha IDs diferentes conforme o caminho de entrada:
- `buildWatchlistItem` → `id = `${asset.type.toLowerCase()}:${asset.ticker}`` → `stock_br:PETR4`
- `makeId` (watchlist/csv) → `${type}:${ticker.toUpperCase()}` → `STOCK_BR:PETR4`

Quebra `existingById`/dedup e pode criar posições duplicadas.

**Correção:** unificar em `makeId` como única fonte; `buildWatchlistItem` deve usá-lo.

### 1.5 `normalizeDateStr` usa UTC para datas manuais (MÉDIO) ⚪
`src/lib/realizedIncome.ts:47-58`

`new Date(ms).toISOString().split("T")[0]` converte em UTC. Transações manuais registradas entre 21h–23h59 (BRT) viram o dia seguinte em UTC. Compra na noite anterior à data-com é excluída do entitlement no replay (`txDateStr <= eventExDateStr` em 133-142) e venda é atribuída ao dia errado.

### 1.6 IRR: taxas somadas na venda em vez de subtraídas (MÉDIO) ⚪
`src/lib/portfolioIrr.ts:247-256`

`buildCashFlowsFromPortfolio` calcula `totalCost = (quantity*price + fees) * rate` e usa o mesmo valor para a venda (`amount: +totalCost`). No fluxo de saída o caixa recebido é `quantity*price − fees`; o código **soma** as taxas → venda superestimada em 2×fees, inflando levemente o IRR.

### 1.7 IRR: moeda do provento de BDR classificada errada (MÉDIO) ⚪
`src/lib/portfolioIrr.ts:268`

`isUsd = ev.taxType === "us_dividend" || isUsdAsset(...)`. Para BDR (tipo `STOCK_US` mas moeda BRL), `getTaxType` retorna `us_dividend` mesmo com moeda BRL → provento (em BRL) classificado como USD. No tab BRL o dividendo é descartado; no tab USD é contado como dólar.

### 1.8 Benchmark: primeiro ponto não capitalizado (BAIXO) ⚪
`src/lib/benchmark.ts:29-43`

`calculateDailyCompoundedReturn` retorna 0% no índice 0 sem capitalizar a taxa do primeiro ponto; composição começa no índice 1 → benchmark CDI/Selic ~0,005% abaixo do real no acumulado.

---

## 2. Integrações com APIs externas/internas (14 itens)

### 2.1 Cadeia de fallback quebrada: Brapi fora → 500 em vez de Yahoo (ALTO) ✓
`src/lib/apiService.functions.ts:174-181` + `src/lib/api/brapi.server.ts:28-34` + `src/lib/api/yahoo.server.ts:125-132` + `src/lib/api/http.server.ts:99-103`

`fetchWithRetry` **lança** exceção quando esgota retries em falha de rede/timeout (http.server.ts:99-103) e `r.json()` lança se resposta 200 não for JSON (Yahoo/Nasdaq servem HTML de rate-limit/captcha). Nenhum provider envolve a chamada em try/catch e `fetchAssetFn` não captura → Brapi lenta/fora → `fetchAssetFn` lança 500 em vez de cair para Yahoo (ticker BR) ou exibir NOT_FOUND. É o ponto único de dado de valuation.

**Correção:** envolver cada provider em try/catch dentro do handler (como `fetchRadarFor` já faz) e/ou `fetchWithRetry` retornar `null` ao esgotar retries.

### 2.2 SEC EDGAR: `bvps` mistura period-ends (MÉDIO) ⚪
`src/lib/api/secEdgar.server.ts:123-147`

`fetchSecEdgarFacts` ordena `StockholdersEquity` e `SharesOutstanding` de forma independente por `end` (qualquer form/período, inclusive 10-Q) e pega o mais recente de cada — sem ancorar no mesmo period-end nem filtrar 10-K/FY. O BVPS resultante mistura equity da data A com shares da data B (recompra/split entre datas distorce). O `fetchSecEdgarCompanyFacts` mais novo faz isso certo (`annualFacts` filtra `form==="10-K" && fp==="FY"`), mas **não** é usado no path de enriquecimento de `fetchAssetFn` (só no Piotroski).

**Correção:** reutilizar `annualFacts`/`pickTag` (mesmo period-end) no path de bvps.

### 2.3 Radar dispara ~40-60 requisições concorrentes ao Yahoo (MÉDIO) ⚪
`src/lib/api/http.server.ts:62` (`minInterval` definido e nunca usado) + `src/lib/apiService.functions.ts:337-369`

`fetchRadarFn` dispara ~16 tickers US × (chart + auth/crumb + quoteSummary) ≈ 40-60 requisições concorrentes ao Yahoo a cada cache miss, sem throttle/batch. O helper de rate-limit existe mas está órfão (única referência é doc). Risco real de rate-limit/ban do Yahoo (única fonte de dado US e benchmark).

**Correção:** pool de concorrência (4-6 paralelas) ou `minInterval` por chave.

### 2.4 Fonte de dado conflitante por campo (MÉDIO) ⚪
`src/components/ceiling/watchlist/useLiveQuotesAndMeta.ts:25-52` usa `asset.currentPrice` (Brapi) e `quotes[ticker].price` (Yahoo) lado a lado; `bvps` tem 3 origens: Brapi `bookValue` (`brapi.server.ts:67-70`), CVM `vpa` (`apiService.functions.ts:197-199`) e SEC (`:187-191`), com share-count divergente entre `scripts/ingest-cvm.ts:163` (total shares, inclui tesouraria) e `scripts/validate-cvm.ts:266` (shares outstanding, subtrai tesouraria).

**Correção:** fonte canônica por campo/mercado (BVPS = CVM p/ BR, SEC p/ US) e registrar `asOf`/origem no `ApiAsset`.

### 2.5 Selic lida direto do client, fora do proxy (MÉDIO) ✓
`src/lib/useSelic.ts:13-24`

Fetch client-side direto para `api.bcb.gov.br` (CORS), fallback silencioso `SELIC_FALLBACK=10.5`, duplicando paths de BCB já existentes no servidor (`fetchMacroRatesFn`, `fetchBcbBenchmarkSeries`). Selic usada no Gordon (`calculations.ts:234`) pode ficar errada (10,5 fixo) sem sinal.

**Correção:** rotear via server fn (ex.: reutilizar `fetchMacroRatesFn`) e reportar em `ingestionLog`.

### 2.6 Parsing de cookie do Yahoo quebra com vírgula no Expires (MÉDIO) ⚪
`src/lib/api/yahoo.server.ts:38-44`

`setCookie.split(",")` quebra cookies com `Expires=...` (vírgula na data) e depende da semântica de `headers.get("set-cookie")` do Node (undici), que varia entre versões → cookie de auth corrompido → 401 intermitente → `invalidateYahooAuth()` + quoteSummary null silencioso (EPS/payout/dividendYield somem).

**Correção:** usar `headers.getSetCookie()` e extrair só `name=value`.

### 2.7 Timeout curto para `companyfacts` multi-MB (MÉDIO) ⚪
`src/lib/api/secEdgar.server.ts:98,253`

Timeouts de 2,5s/4s para `companyfacts` que pode ter multi-MB (AAPL ~10MB). `fetchWithTimeout` aborta o download inteiro → `bvps`/Piotroski null silencioso para empresas grandes em cold start.

**Correção:** subir timeout (10s+) ou streaming.

### 2.8 Quote BR sem fallback para Brapi (MÉDIO) ⚪
`src/lib/apiService.functions.ts:265-269`

`fetchQuoteFn` para ticker BR chama só Yahoo (`PETR4.SA`), sem fallback para Brapi — mesmo `fetchFromBrapi` existindo → Yahoo fora → carteira BR sem preço ao vivo.

### 2.9 Sem validação de schema em respostas externas (MÉDIO) ⚪
`src/lib/api/brapi.server.ts:41-46` (`cashDividends` assumido array; `.map` lança se API mudar shape), `:114` e `yahoo.server.ts:183` (`as Currency` sem checagem — ticker não-US devolveria EUR/GBP), `brapi.server.ts:106` assume shape de `dividendEvents`.

**Correção:** zod schema por endpoint (mínimo: `currency`, `cashDividends`, `chart.result[0].meta`).

### 2.10 `parseFloat(cdiData[0].valor)` sem `Number.isFinite` (BAIXO) ⚪
`src/lib/apiService.functions.ts:447-456`

Se BCB devolver `[{"valor": null}]` → `NaN` → `k = NaN/100` envenena o Gordon de todas as telas que usam `fetchMacroRatesFn`.

### 2.11 `fetchAssetPriceHistoryFn` sem sanitização de input (BAIXO) ⚪
`src/lib/apiService.functions.ts:535-539`

Validator retorna `data` cru (ticker/fromDate/toDate não sanitizados, ao contrário de `fetchAssetFn`); `new Date(fromDate)` inválido → `period1=NaN` na URL do Yahoo. Não é injeção (`encodeURIComponent` protege), mas inconsistência.

### 2.12 404 contado como `FAILED` no log de ingestão (BAIXO) ⚪
`src/lib/api/http.server.ts:95-98`

`fetchWithRetry` reporta `FAILED` para qualquer 4xx não-retryável, incluindo 404 de ticker inexistente (caso comum em busca) → `ingestionLog` inflado de falso negativo.

### 2.13 `b3Parser` parsing posicional frágil (BAIXO) ⚪
`src/lib/dataIngestion/b3Parser.ts:198-231`

Usa a primeira data do documento como data do trade, heurística `V/C` para compra/venda, e `normalizeIssuerSpecification` não normaliza acentos/mojibake → nota pode gerar trade com data/tipo errado silenciosamente, e nomes acentuados caem em `unresolvedTrades`.

### 2.14 `parseUsDate` da Nasdaq rígido (BAIXO) ⚪
`src/lib/api/nasdaq.server.ts:37-43`

Assume formato `MM/DD/YYYY`; mudança de formato → parse null → mapa vazio silencioso.

**Verificado sem problema:** User-Agent da SEC EDGAR correto (`'FuentePricePro contato@fuentepricepro.com'`, aplicado em todas as 3 chamadas); nenhuma API key hardcoded; `BRAPI_TOKEN` server-only.

---

## 3. Performance (13 itens)

### 3.1 Loop autossustentado de `onSnapshot` em `useTransactions` (ALTO) ✓
`src/lib/transactions.ts:154,190-207`

`const queryKey = ["transactions", user?.uid ?? "local"]` é criado **inline** (identidade nova a cada render) e é dependência do `useEffect` do `onSnapshot`. O callback do snapshot chama `queryClient.setQueryData(queryKey, ...)` com array novo → cada snapshot → re-render → efeito re-executa → unsubscribe + novo `onSnapshot` (nova leitura completa de `users/{uid}/transactions`) → loop **autossustentado** enquanto a página estiver montada (Dashboard, Carteira, Cash Flow).

**Correção:** memoizar a key (`useMemo(() => [...], [user?.uid])`) como já é feito em `useWatchlist`.

### 3.2 5× `useValuedPortfolio` na home → ~10 listeners na mesma coleção (ALTO) ✓
`src/lib/useValuedPortfolio.ts:23` + `src/lib/watchlist.ts:324-340` + `src/routes/app/index.tsx:72-74` + `HorizonteHero.tsx:127` + `PortfolioTableV2.tsx:28`

`useValuedPortfolio()` é montado 5× na home (`/app`): rota direta + via `useRealizedIncomeSummary` + via `useFIProgress` + `HorizonteHero` + `PortfolioTableV2`. Cada instância registra seu próprio `onSnapshot` de coleção inteira de `users/{uid}/assets` (via `useWatchlist`) e de `users/{uid}/transactions`. React Query deduplica as queries, **não** os listeners. Qualquer mudança dispara 5× `setQueryData` e 5× recompute da cadeia `baseItems → valuedItems → totals`.

**Correção:** elevar a um único `ValuedPortfolioProvider` no layout de `/app`; consumidores leem do contexto.

### 3.3 Dupla leitura de coleção no mount da watchlist (ALTO) ⚪
`src/lib/watchlist.ts:270-340`

No mount, a `queryFn` faz `getDocs` da coleção inteira **e** o `onSnapshot` faz outra leitura completa ao assinar (2 leituras por instância; ×6 na home = 12 leituras redundantes).

**Correção:** com `staleTime: Infinity` + snapshot realtime, eliminar o `getDocs` inicial (deixar o `onSnapshot` como fonte única).

### 3.4 Zero compressão no servidor de produção (ALTO) ✓
`server.production.js:9`

`express.static("dist/client")` sem middleware `compression`; Cloud Run não comprime automaticamente → bundles (~1MB min) e HTML trafegam 3-5× maiores.

**Correção:** `app.use(compression())` antes do static — 1 linha, impacto global.

### 3.5 2 queries por ticker + sem prefetch nas rotas (ALTO) ⚪
`src/lib/useLiveQuotesAndMeta.ts:18-23` + `src/lib/queryOptions.ts:38-47` + `src/lib/apiService.functions.ts:174-240`

Dashboard dispara 2 queries por ticker (quote `staleTime:30s` + asset 5min). `fetchAssetFn` é waterfall multi-hop sem cache no servidor (Brapi → Yahoo → SEC/CVM → Nasdaq → estimativa paymentDate). Não há `loader`/prefetch em nenhuma rota de `/app` → TTFB do primeiro paint escala com N ativos; após 30s cada navegação de volta refetcha N quotes.

**Correção:** `beforeLoad`/`loader` com `ensureQueryData` no caminho crítico; subir `staleTime` do quote; cache server-side 30-60s.

### 3.6 `useFeatureGates` cria listener por chamada (MÉDIO) ⚪
`src/lib/featureGates.ts:66-95`

Usa `useState` + `onSnapshot` próprio (sem React Query) → **cada** `useFeatureGate` registra um novo listener no doc global `config/featureGates`. 1-6 listeners simultâneos conforme a rota.

**Correção:** assinatura única em contexto/query compartilhada.

### 3.7 Heal de `paymentMonths` roda por instância (MÉDIO) ⚪
`src/lib/watchlist.ts:342-402`

Para cada item com `paymentMonths` vazio chama `ensureQueryData(assetQueryOptions(ticker))` e persiste patch de volta ao Firestore com `writeBatch` — por instância de `useWatchlist`. Na home (6 instâncias) o mesmo conjunto é percorrido 6× com N writes de volta.

### 3.8 WatchlistTable: re-render de N linhas por keystroke (MÉDIO) ⚪
`src/components/ceiling/watchlist/WatchlistTable.tsx:107-166`

No modo edição em massa, cada keystroke em um `Input` faz `setEdits` → re-render de todas as linhas (estado de edição no pai, linhas não memoizadas).

**Correção:** extrair linha editável em componente `memo` por id com estado local.

### 3.9 PortfolioTableV2: sort + re-render a cada tick de quote (MÉDIO) ⚪
`src/components/horizonte/PortfolioTableV2.tsx:138-141` + `:47-75`

Tabela sem virtualização, `sorted` recomputado a cada tick de quote (deps incluem `quotes`) → re-render de todas as linhas a cada 30s; cada linha recalcula `getAssetPnL`.

**Correção:** `React.memo` em `PortfolioRow`, memoizar quotes, virtualizar listas grandes.

### 3.10 WatchlistAssetGrid: cards pesados sem virtualização (MÉDIO) ⚪
`src/components/ceiling/watchlist/WatchlistAssetGrid.tsx:56-76`

Renderiza todos os `AssetCard` (recharts, ValuationRadar, ResultStats, GoalPlanner) sem windowing → DOM pesado com 50+ ativos, re-render total a cada tick.

**Correção:** `@tanstack/react-virtual` ou paginação; pelo menos `React.memo` no card.

### 3.11 AuthProvider value não memoizado (BAIXO) ⚪
`src/lib/auth-provider.tsx:25-33`

Objeto `value` e `signOut` recriados a cada render sem `useMemo`/`useCallback` → qualquer re-render re-renderiza todos os consumidores do contexto.

### 3.12 CashFlowChart: tooltips/cells inline (BAIXO) ⚪
`src/components/ceiling/cashflow/CashFlowChart.tsx:72-235`

`CustomTooltip`, `BreakdownTooltip`, `CumulativeTooltip`, `InvestedVsReceivedTooltip` definidos inline (novo tipo a cada render → recharts remonta o tooltip); `data.find(...)` chamado 2× por render; arrays de `<Cell>` reconstruídos a cada render.

### 3.13 Escritas extras no doc do usuário por visita (BAIXO) ⚪
`src/routes/app/index.tsx:110-139` + `src/lib/portfolioSnapshot.ts:28-63`

Home faz `getDoc` + `setDoc` em `users/{uid}` (`lastVisitSnapshot`) por sessão e o Cash Flow grava `portfolioSnapshots/{YYYY-MM-DD}` sobre o mesmo doc que o `SubscriptionProvider` observa em `onSnapshot` → 2-3 leituras/escritas extras por visita; qualquer `setDoc` dispara o listener de subscription.

**Verificado sem problema:** `staleTime`/`gcTime` bem definidos em `queryOptions.ts`; `refetchOnWindowFocus`/`reconnect` desativados globalmente; listeners fazem cleanup correto; recharts/framer-motion/pdfjs-dist em chunks lazy.

---

## 4. Componentes de frontend (26 itens)

### 4.1 Home `/app` inteira em pt-BR hardcoded — em produção (ALTO) ✓
`src/routes/app/index.tsx:100,149,160,162,167,176,179` + `src/components/horizonte/HorizonteHero.tsx:214-215,232,237,243,248-252` + `PortfolioTableV2.tsx:117,128-134` + `NewContributionDialog.tsx:135`

Strings visíveis hardcoded ("Patrimônio total", "Ver tudo", "Sua carteira", "p.p. desde a última visita", "Primeiros R$100 mil", colunas "Ativo/Classe/Posição") e `formatCurrency(..., "BRL", "ptBR")` com locale forçado. Usuário EN/ES vê a home do app em português. **Violação sistemática da Regra 2 (falha crítica).**

### 4.2 Filtros/ordenação da Watchlist invisíveis no mobile (ALTO) ⚪
`src/components/ceiling/watchlist/WatchlistFilterBar.tsx:58-88`

Bloco "Subvalorizada/Valorizada" + `Select` de ordenação `hidden lg:flex` → no mobile/tablet a watchlist não pode ser ordenada nem filtrada por oportunidade (Regra 5).

### 4.3 Toast de auth em inglês no AddToWatchlistDialog (ALTO) ⚪
`src/components/ceiling/AddToWatchlistDialog.tsx:106`

`"Sign in to save this asset to your watchlist..."` hardcoded em inglês → usuário pt-BR/es recebe mensagem em inglês.

### 4.4 FeedbackWidget simula envio (MÉDIO) ✓
`src/components/ceiling/FeedbackWidget.tsx:29-37`

`setTimeout(300)` simula sucesso com comentário "Backend wiring will come later"; toast de sucesso fecha o dialog → usuário acredita que o feedback foi entregue (UX enganosa). Conectar a endpoint ou remover toast de sucesso.

### 4.5 Outros hardcoded de string (MÉDIO)
- `Header.tsx:90` ("USD/BRL R$") e `:56` (`alt="Avatar"`)
- `NextPaymentBanner.tsx:164` ("(est.)")
- `FixedIncomeWizardSheet.tsx:88` — `notes: "Aporte Inicial Renda Fixa"` persistido e exibido no TransactionsPanel
- `AddAssetDropdown.tsx:31,64,75` (corretoras, "CSV/Excel", `|| "Add Asset"`)
- `BrokerNoteUploader.tsx:127-141` (`BROKER_LABELS` pt-BR)
- `CsvImportUploader.tsx:33,36` (toasts + nome de arquivo pt-BR)
- `assetCard/AssetCardHeader.tsx:136` (`aria-label` "Up today"/"Down today")

### 4.6 Placeholders numéricos hardcoded (MÉDIO)
`EditItemDialog.tsx:213,225` ("6"/"100"), `AddToWatchlistDialog.tsx:157,171,184`, `FixedIncomeWizardSheet.tsx:226,246` ("1000.00"/"110"/"6.5"), `TargetAllocationPanel.tsx:131`, `SmartAllocation.tsx:281`.

### 4.7 "N/A" hardcoded (MÉDIO)
`EditItemDialog.tsx:261,274`, `FixedIncomePanel.tsx:21,35`, `ConsensusPyramid.tsx:31,108`, `ResultStats.tsx:167,174`, `CurrencyToggle.tsx:68`, `DividendRadar.tsx:92`.

### 4.8 Fallbacks de string hardcoded (MÉDIO)
`RiskRadar.tsx:27`, `WatchlistAssetGrid.tsx:47,50`, `SmartAllocation.tsx:127`, `ResultStats.tsx:302,336`, `date-picker.tsx:134` ("Select date") — se a chave faltar, quebra o idioma.

### 4.9 Acessibilidade: botões icon-only sem aria-label (MÉDIO)
`TransactionsPanel.tsx:105-110` (edit/delete), `assetCard/AssetCardFinancials.tsx:98,164` (tooltips Info).

### 4.10 `alert()` nativo na validação de short-selling (MÉDIO)
`TransactionFormFields.tsx:55` — bloqueante, não estilizado, inconsistente com sonner.

### 4.11 AllocationChart mouse-only (MÉDIO)
`<Cell onClick>` e legendas clicáveis (filter por tipo) inoperáveis por teclado.

### 4.12 CorporateEventModal: ratio inválido vira no-op silencioso (MÉDIO)
`CorporateEventModal.tsx:53` — `parseFloat(ratio) || 1`: digitar "0" ou lixo vira fator 1 silenciosamente.

### 4.13 Exclusão de ativo sem confirmação/undo (MÉDIO)
`Watchlist.tsx:141-147` — `handleRemove` apaga direto.

### 4.14 Fallback de câmbio `?? 5.5` duplicado em 7 arquivos (MÉDIO)
`Watchlist.tsx:57`, `AllocationChart.tsx:38`, `CashFlowCalendar.tsx:118`, `SmartAllocation.tsx:71`, `HorizonteHero.tsx:221`, `FIProgressCard.tsx:46`, `useFIProgress.ts:75` — e `useValuedPortfolio.ts:142` usa `?? 1`. Dois fallbacks inconsistentes para a mesma conversão.

### 4.15 RiskRadar exibe enum cru e tabelas duplicadas (MÉDIO)
`RiskRadar.tsx:138` — `tItem.type` ("STOCK_BR") em vez de `t.types[...]`; tabelas de concentração de ativo (:164-210) e setor (:222-255) quase idênticas.

### 4.16 SummaryCard local duplica o shared (MÉDIO)
`src/routes/app/index.tsx:39-67` duplica `src/components/ceiling/watchlist/SummaryCard.tsx`.

### 4.17 Feature gates decididos fora do `useFeatureGate` (MÉDIO)
`SmartAllocation.tsx:51-54` — `FEATURE_GATES` local hardcoded `false` + `isPro` de `useSubscription()` no JSX. Gate fora do SSOT de feature gates.

### 4.18 GoalPlanner quebra template i18n (MÉDIO)
`GoalPlanner.tsx:106` — `t.result.sharesNeeded.split("{{qty}}")[0].trim()` deriva label quebrando template traduzido.

### 4.19 `dangerouslySetInnerHTML` em conteúdo traduzido (MÉDIO)
`ResultStats.tsx:259` + `:231` regex para stripar tags — superfície XSS e frágil.

### 4.20 CashFlowCalendar: meses EN/PT sem ES (MÉDIO)
`CashFlowCalendar.tsx:63` — `locale === "en" ? EN : PT` — usuário "es" recebe meses em português.

### 4.21 AnimatedNumber com locale pt-BR hardcoded (MÉDIO)
`AnimatedNumber.tsx:49` — `Intl.NumberFormat("pt-BR")` default quando `format` não passado.

### 4.22 Violação de token no `classify.ts` escapa do lint (MÉDIO)
`src/lib/classify.ts:96` — `bg-emerald-500/15 text-emerald-400 border-emerald-500/30`; e `design-tokens.test.ts:43-46` só varre `*.tsx` (`getAllTsxFiles`) → o teste "0 exceptions" passa com violação ativa. **Incluir `.ts` no scan ou mover para `--primary`.**

### 4.23 Hex hardcoded que quebram tema claro (MÉDIO)
`ConsensusPyramid.tsx:39` (`bg-[#0a0a0c]`, `text-white`), `ResultStats.tsx:128` (`bg-[#1a1a24]`), `shared/AssetCard.tsx:215` (`#09090b`), `HorizonteHero.tsx:115` (`ctx.strokeStyle = "#ffffff"` + fallbacks `:53-55`).

### 4.24 a11y baixo
`LanguageSwitcher.tsx:23-49` (sem `aria-pressed`), `TargetAllocationPanel.tsx:58-60` (sem `aria-expanded`).

### 4.25 `key={i}` com paginação (BAIXO)
`DividendsHistoryPanel.tsx:158` — índice como key em `TableRow`.

### 4.26 DataManagement dev-only com `window.confirm`/race (BAIXO)
`DataManagement.tsx:24-40` — `setTimeout(300)` para "deletar iterativamente" é race-prone; manter atrás de `import.meta.env.DEV`.

**Notas verificadas sem problema:** Radix `Dialog`/`Sheet` com foco gerenciado correto; `SortableHeader` do `PortfolioTableV2` já tem `tabIndex`/`role="button"`/`onKeyDown`/`aria-sort` (corrigido — o achado do SSOT.md não é mais válido); cores F3: restam só `classify.ts:96` + 2 arquivos whitelisted + 4 hex dark cards.

---

## 5. SSOT / duplicação (13 itens)

### 5.1 Base de renda de dividendos divergente entre telas salvas (ALTO) ✓
- A: `useValuedPortfolio.ts:116-121` — soma **líquida** (`netAfterTax`) → `totals.consolidatedIncome`, exibida em `WatchlistKpiSection.tsx:102`
- B: `useFIProgress.ts:92` — `quantity * annualDividend` **bruto** → `monthlyIncomeBRL`, exibido no hero (`HorizonteHero.tsx:215`)
- C: `cashflow.ts:151` — projeção **bruta**; `:243-252` — realizado **líquido**; `CashFlowChart.tsx:84` **soma** líquido + bruto

O mesmo dividendo aparece com valores diferentes no hero (bruto), no KPI (líquido) e no Cash Flow (misturado). **Causa raiz do achado 1.1.**

**Recomendação:** criar seletor único `getPortfolioIncome(item, { basis: "net" | "gross" })`, decidir basis por superfície no nível de produto e nunca somar bases distintas.

### 5.2 Construtor de WatchlistItem duplicado + `id` conflitante (MÉDIO) ✓
- A: `buildWatchlistItem.ts:22-51` — SSOT declarado, `id = `${type.toLowerCase()}:${ticker}`` (linha 24)
- B: `useWatchlistCsvImport.ts:63-101` — reimplementa inline `getCanonicalAnnualDividend` + `getAssetValuation` + montagem, `id` via `makeId`
- C: `watchlist.ts:61-63` — `makeId` = `${type}:${ticker.toUpperCase()}`

Mesmo ativo, IDs diferentes (`stock_br:PETR4` vs `STOCK_BR:PETR4`) → quebra dedup/`existingById`. **Ver também achado 1.4.**

### 5.3 Feature gates fora do ponto único (MÉDIO) ⚪
`useFeatureGate.ts:5-8,14-19` ("THIS IS THE ONLY HOOK") vs `SmartAllocation.tsx:51-54` (const local `FEATURE_GATES`) vs `Watchlist.tsx:51` (`isPro` declarado, não usado). Hoje os flags são `false` (sem divergência runtime), mas qualquer flip futuro aconteceria em JSX.

### 5.4 Formatters duplicados: `formatters.ts` vs `i18n/format.ts` (MÉDIO) ✓
`formatters.ts:14-54` (canônico, **força locale pela moeda**: USD → en-US, senão pt-BR) vs `i18n/format.ts:14-51` (mesmos nomes, usa locale do usuário) — **zero importadores** (verificado). Duplicado morto, armadilha para o próximo agente. **Recomendação: deletar `i18n/format.ts`.**

### 5.5 Magic numbers macroeconômicos duplicados em 8+ pontos (MÉDIO) ✓
- `useSelic.ts:3` — `SELIC_FALLBACK = 10.5` (percentual)
- `calculations.ts:78` — `DEFAULT_SELIC = 0.105` (**decimal**, mesma taxa em unidade diferente)
- `calculations.ts:176` — default `selicPct = 10.5`; `:303` e `:341` — `{ cdi: 10.5, ipca: 4.5 }`
- `apiService.functions.ts:425` — `{ cdi: 10.5, ipca: 4.5 }`
- `?? 10.5` em `useValuedPortfolio.ts:86`, `AssetCard.tsx:388`, `DividendRadar.tsx:77`, `AssetComparator.tsx:227,312`, `PortfolioIrrCard.tsx:34`

**Recomendação:** `macroDefaults.ts` com `SELIC_PCT`, `SELIC_DECIMAL`, `IPCA_PCT`, derivando o decimal.

### 5.6 Paths do Firestore como string literal espalhados (MÉDIO) ⚪
`settings.tsx:67,89,341-344,438-446` ("users"/"assets"/"transactions"/"portfolioSnapshots"), `featureGates.ts:71` ("config"/"featureGates"), `useIssuerTickerMappings.ts:43,77` + `useInvestorProfile.ts:36`, `ingestionLog.server.ts:56`, `cvm.server.ts:19`. O próprio SSOT.md:196-197 registra o risco.

### 5.7 DY do Radar bruto vs. valuation líquido (MÉDIO) ⚪
`DividendRadar.tsx:65-66` (`dy = canonicalDiv / currentPrice` bruto, coluna 91) vs `:73` (`getAssetValuation`, cujo `dividendYield` é líquido p/ US) — coluna DY pode divergir do DY de valuation na mesma tela.

### 5.8 SnowballSimulator usa dividendo-base stale (MÉDIO) ⚪
`SnowballSimulator.tsx:34,61` — `useWatchlist()` cru + `item.annualDividend * item.quantity`, sem `canonicalDividend3y` (viola a Regra 4 "dividendo-base da função canônica").

### 5.9 Formatação inline espalhada (BAIXO-MÉDIO) ⚪
`CashFlowSummary.tsx:203-210` reimplementa `compactWithSymbol`; `ComparatorPerformanceChart.tsx:53-65` `formatDateLabel` custom; `Header.tsx:90` `.toFixed(2)`; ~8 chamadas inline de `new Intl.DateTimeFormat`. Não existe `formatDate` canônico.

### 5.10 Import morto no AssetCard (BAIXO-MÉDIO) ⚪
`AssetCard.tsx:3` — importa `ceilingPrice, safetyMargin` de `calculations` sem uso (resíduo da migração para `item.valuation`).

### 5.11 Tipos quase-duplicados: `Asset`/`ApiAsset`/`AssetMeta` (BAIXO) ⚪
`domain.ts:45-58` (+`AssetMetrics` :9-23) vs `api/types.ts:3-37` vs `watchlist/utils.ts:18`.

### 5.12 `useSelic` fura o padrão de proxy (BAIXO) ✓
Mesma constatação do achado 2.5, vista do ângulo SSOT: único provider externo chamado direto do client.

### 5.13 Criação de transação sintética em 3 caminhos (BAIXO) ⚪
`Watchlist.tsx:171-180` (ajuste manual), `useWatchlistCsvImport.ts:80-89` (`tx-csv-...`), `BrokerNoteUploader.tsx` — shape consistente, mas sem factory única.

**Positivo verificado:** dicionários i18n 872/872/872 sincronizados entre ptBR/en/es — zero drift.

---

## 6. Novos SSOTs recomendados (top 5)

| # | Conceito | Disperso em | Por que merece SSOT | Onde viver |
|---|---|---|---|---|
| 1 | **Renda do portfólio (net/gross)** | `useValuedPortfolio.ts:116-121`, `useFIProgress.ts:92`, `cashflow.ts:151,243-252`, `allocation.ts:134,283-342`, `useAssetCardDerived.ts:22-24`, `useAssetFilterSort.ts:86-116` | Dado financeiro de maior visibilidade, hoje diverge entre telas salvas (5.1/1.1) | `src/lib/portfolioIncome.ts` — `getPortfolioIncome(item, basis)` |
| 2 | **UserConfig (`users/{uid}`)** | `useUserSettings.ts:36-58`, `useInvestorProfile.ts:36-48`, `useIssuerTickerMappings.ts:43-55`, `subscription.tsx`, `app/index.tsx:112`, `settings.tsx:67,89,341` | Doc de usuário lido/escrito em 6 pontos com schemas parciais sobrepostos (risco de clobber) | `src/lib/userConfig.ts` — schema tipado + `useUserDocument()` |
| 3 | **Asset meta resolvido** | `useLiveQuotesAndMeta.ts:34-47`, `watchlist/utils.ts:18`, `useIssuerTickerMappings.ts`, `useValuedPortfolio.ts:98-99` | Resolução "qual o dividendo canônico/dados" repetida e base da Regra 4 | `src/lib/resolveAssetMeta.ts` |
| 4 | **Registro fiscal (tax policy)** | `calculations.ts:52-67`, `realizedIncome.ts:31-42`, `domain.ts:41-42`, `brapi.server.ts` (label JCP) | WHT 30% / JCP 15% / isenção FII implícitas em 3 módulos | `src/lib/taxPolicy.ts` — `getTaxType` + `dividendTaxRate` únicas fontes |
| 5 | **Registry de paths Firestore** | `settings.tsx:342-344`, `featureGates.ts:71`, `useIssuerTickerMappings.ts:43`, `useInvestorProfile.ts:36`, `ingestionLog.server.ts:56`, `cvm.server.ts:19` | Bug recorrente de paths hardcoded documentado na Seção 5 do SSOT.md | `src/lib/firestore/paths.ts` |

**Limpezas rápidas associadas:** deletar `i18n/format.ts`; unificar `makeId`/`buildWatchlistItem`; criar `createTransaction()` factory em `transactions.ts`.

---

## 7. Ordem de prioridade sugerida

| # | Item | Tipo | Esforço |
|---|---|---|---|
| 1 | Cash Flow double-counting (1.1) | Bug financeiro | Pequeno |
| 2 | Conversão de moeda na renda realizada (1.2) | Bug financeiro | Pequeno |
| 3 | Split com transações (1.3) | Bug funcional | Médio |
| 4 | `portfolioIncome.ts` (SSOT de renda) | Arquitetura | Médio — cura 1.1 e 5.1 |
| 5 | Loop `onSnapshot` + listeners duplicados (3.1, 3.2) | Performance | Médio |
| 6 | Compressão no servidor (3.4) | Performance | Trivial (1 linha) |
| 7 | Fallback Brapi→Yahoo (2.1) | Confiabilidade | Pequeno |
| 8 | i18n da home v2 (4.1) | Governança (Regra 2) | Médio — atacar junto com prompts 55-64 |
| 9 | ID de watchlist (1.4 / 5.2) | Bug funcional | Pequeno |
| 10 | `macroDefaults.ts` + deletar `i18n/format.ts` (5.4, 5.5) | SSOT | Pequeno |

---

*Gerado em 2026-08-11 via auditoria multi-agente com verificação manual dos achados críticos.*
