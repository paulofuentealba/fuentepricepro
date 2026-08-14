# RESULTADO — 79 — Yield-Trap Check + Shareholder Yield

## O que foi feito

### 1. `calculateHistoricalYieldAverage` (`src/lib/calculations.ts`)

Investigação do formato real de `fetchAssetPriceHistoryFn`: confirmado que
retorna `BenchmarkPoint[]` (`{ date, cumulativeReturnPct }`), NÃO preço
absoluto — é a mesma série usada pelo gráfico do Comparador
(`calculatePriceCumulativeReturn` em `benchmark.ts`), onde o primeiro ponto
é a base (`cumulativeReturnPct = 0`) e os demais são retorno acumulado desde
essa base.

**Reconstrução de preço absoluto**: como `currentPrice` (cotação viva) é
conhecida separadamente, ancoro a série nela:
`basePrice = currentPrice / (1 + últimoRetorno/100)`, depois
`preço_t = basePrice * (1 + retorno_t/100)` para qualquer ponto.

**Decisão fechamento vs média do ano**: usei o **último ponto de preço
disponível em cada ano calendário** (fechamento do ano), não a média do
ano — é a derivação mais simples a partir da série real (não exige
bucketizar/promediar N pontos diários por ano) e corresponde à leitura
usual de "yield no fim do ano".

Guard de confiabilidade idêntico a `calculateDividendGrowthVolatility`:
exige `length >= 3` anos com dividendo E preço válidos simultaneamente,
senão retorna `null`. Resultado expresso em **percentual** (mesma
convenção de `dividendYield`/`targetYield` no restante do módulo).

### 2. `isYieldTrap(currentYield, historicalYieldAverage): boolean | null`

`currentYield > historicalYieldAverage * 2`. Retorna `null` sempre que
`historicalYieldAverage` for `null`/`undefined`/`<=0` — nunca um `false`
default.

### 3. `getAssetValuation` (mesmo padrão de `selicPct`/`terminalGrowthRate`)

Recebe `historicalYieldAverage?: number | null` e `shareholderYield?: number
| null` já resolvidos pelo chamador (sem I/O dentro da função). Calcula
`yieldTrapWarning` internamente via `isYieldTrap(dividendYield,
historicalYieldAverage)` e repassa `shareholderYield` no retorno. Os dois
branches de early-return (`FIXED_INCOME` e dado insuficiente) também
retornam `yieldTrapWarning: null, shareholderYield: null` explicitamente.

### 4. `calculateShareholderYield` — Shareholder Yield

`shareholderYield = (dividendsPaidTotal + netBuyback) / marketCap`, onde
`netBuyback = (sharesOutstandingPrior - sharesOutstandingCurrent) *
pricePerShare` (queda em ações em circulação = recompra líquida positiva;
aumento = emissão líquida negativa).

**Investigação de cobertura**: `fetchSecEdgarCompanyFacts` já busca
`CommonStockSharesOutstanding`/`EntityCommonStockSharesOutstanding` (usado
no Piotroski) para até 2 anos fiscais — dá pra derivar a variação de ações
em circulação sem fonte de dado nova. **Porém não busca hoje** valor total
de dividendos pagos (`PaymentsOfDividends`) nem `marketCap` — só os campos
listados em `FiscalYearFacts` (netIncome, totalAssets, operatingCashFlow,
longTermDebt, currentAssets, currentLiabilities, sharesOutstanding,
grossProfit, revenues). A função pura está implementada e testada, mas
**nenhum call site foi conectado a dados reais nesta rodada** — conectar
exigiria adicionar novas tags XBRL ao fetcher, o que ultrapassa o escopo
("não implementar over-engineering pra BR sem fonte de dado" também se
aplica aqui: sem os dois inputs que faltam, não dava pra popular US de
verdade sem inventar valor). Cobertura seria US-only mesmo se conectado
(SEC EDGAR, mesma limitação já documentada no Piotroski) — BR fica de fora.

### 5. UI

Sem tela nova. `AssetCard.tsx`:
- Novo componente `YieldTrapBadge` (ícone `AlertTriangle`, tooltip i18n)
  exibido quando `valuation.yieldTrapWarning === true`.
- `SearchVariant` (tela de busca/preview de ativo) ganhou fetch real via
  `assetPriceHistoryQueryOptions` (janela de 5 anos, 1 fetch por ticker
  aberto — não um fan-out de N fetches por portfólio) +
  `calculateHistoricalYieldAverage`, then passado como
  `historicalYieldAverage` para `getAssetValuation`. É o ponto de maior
  valor prático porque é single-asset.
- `WatchlistVariant` (cards da carteira) lê `valuation.yieldTrapWarning` e
  mostra o badge se presente, mas **não foi conectado a um fetch real** —
  `useValuedPortfolio` valoriza N ativos simultaneamente e adicionar N
  fetches de histórico de preço ali seria over-engineering/regressão de
  performance sem pedido explícito; por padrão o campo chega `null` (sem
  aviso) até essa página consumir o resultado de um Comparador ou de
  outra tela que já tenha o histórico carregado.
- Textos i18n adicionados em pt-BR, en, es
  (`result.yieldTrapWarning`/`result.yieldTrapWarningTip`).

## Testes

Adicionados em `src/lib/__tests__/calc.test.ts`, describe "Yield-Trap Check
+ Shareholder Yield (prompt 79)" — 12 casos:
- `calculateHistoricalYieldAverage` com série sintética de 5 anos (10%/ano
  de crescimento de preço, dividendo constante) → média ≈ 4,17% (confere
  manualmente: yields de 5%, 4,55%, 4,13%, 3,76%, 3,42%).
- `calculateHistoricalYieldAverage` com < 3 anos de sobreposição → `null`.
- `isYieldTrap`: 2,5x → `true`; 1,2x → `false`; histórico `null`/`undefined`
  → `null`.
- `calculateShareholderYield`: recompra líquida positiva (resultado > 0),
  emissão líquida (resultado < 0), dados faltando → `null`.
- `getAssetValuation`: `yieldTrapWarning`/`shareholderYield` `null` sem
  input; `yieldTrapWarning: true` quando yield > 2x histórico; ambos `null`
  nos branches `FIXED_INCOME` e "dado insuficiente".

## Verificação

- `npx tsc --noEmit` — limpo, sem erros.
- `npm run test -- --run` — **293 passed | 4 skipped** (nenhuma falha nova;
  os 4 skipped são pré-existentes, não relacionados a este prompt).
- `npm run build` — build de produção concluído com sucesso
  (`✓ built in 849ms`).

## Tickers reais

Este ambiente de execução não tem acesso de rede às APIs externas (SEC
EDGAR / Yahoo Finance/`query2.finance.yahoo.com`) necessárias para rodar
`fetchAssetPriceHistoryFn`/`fetchSecEdgarCompanyFacts` contra tickers de
verdade — não foi possível validar contra 1-2 tickers reais (BR e US) como
pedido. A evidência de correção matemática está nos 12 testes sintéticos
acima (todos verdes), que cobrem reconstrução de preço a partir de retorno
acumulado, o guard de 3 anos, os 3 casos de `isYieldTrap` e os 2 casos de
`calculateShareholderYield`. Recomendo rodar manualmente contra um ticker
BR (ex: TAEE11, histórico de yield alto conhecido) e um US (ex: uma REIT
com corte de dividendo recente) assim que houver acesso de rede, comparando
o valor do console com a matemática documentada acima.
