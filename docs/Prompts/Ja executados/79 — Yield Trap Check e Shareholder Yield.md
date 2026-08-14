# 79 — Yield-Trap Check + Shareholder Yield

## Contexto e decisão de Paulo (não reabrir)

Regra confirmada pro alerta de yield-trap: **yield atual > 2x a média
histórica de yield do próprio ativo nos últimos 5 anos**. Reaproveitar
`fetchAssetPriceHistoryFn`/`assetPriceHistoryQueryOptions` (já existem,
construídos pro gráfico do Comparador) — não criar fetcher de preço
histórico novo.

## Escopo técnico

### 1. Calcular yield histórico ano-a-ano (não só valor de dividendo)

`calculateDividendGrowthVolatility` (`calculations.ts`) já usa
`dividendHistory: { year: number; amount: number }[]` — reaproveitar essa
mesma fonte de histórico de dividendo.

Criar `calculateHistoricalYieldAverage(dividendHistory, priceHistory)`:
para cada ano com dividendo E preço disponível, `yield_ano = dividendo_ano
/ preço_médio_do_ano` (usar o preço no fechamento do ano, ou média do ano
— decidir e reportar qual é mais simples de derivar da série já buscada
via `fetchAssetPriceHistoryFn`, que retorna pontos de retorno acumulado,
não preço absoluto — **atenção**: pode ser necessário reconstruir preço
absoluto a partir do retorno acumulado + preço atual conhecido, verificar
o formato exato de retorno antes de assumir). Retornar a média dos yields
anuais válidos (mínimo 3 anos de dado pra ser confiável — usar o mesmo
padrão de guard já usado em `calculateDividendGrowthVolatility`, que
exige `length >= 3`).

### 2. Sinalização de yield-trap

Função pura `isYieldTrap(currentYield, historicalYieldAverage): boolean`
— `currentYield > historicalYieldAverage * 2`. Se `historicalYieldAverage`
for `null` (dado insuficiente), retornar `null` (indeterminado), nunca
`false` por padrão (evita afirmar "não é trap" sem dado suficiente pra
saber).

Adicionar o campo ao retorno de `getAssetValuation` (mesmo padrão do
`gordonConfidence`): `yieldTrapWarning: boolean | null`.

### 3. Shareholder Yield (métrica adicional, bundled com este item)

`shareholderYield = (proventos + recompras − emissão de ações) / valor de
mercado`. **Investigar antes de implementar**: a plataforma tem dado de
recompra/emissão de ações hoje? (verificar `fetchSecEdgarCompanyFacts` —
já busca `CommonStockSharesOutstanding` pro Piotroski, dá pra derivar
emissão/recompra líquida ano-a-ano a partir da variação dessa série,
sem precisar de fonte de dado nova). Se a cobertura for só US (via SEC
EDGAR, mesma limitação já documentada no Piotroski), reportar que BR
fica de fora nesta rodada — não implementar over-engineering pra BR sem
fonte de dado.

### 4. UI — onde exibir

Não construir tela nova nesta rodada — só expor os campos calculados
(`yieldTrapWarning`, `shareholderYield`) no retorno de
`getAssetValuation`, e um badge discreto no `AssetCard.tsx`/detalhe do
ativo quando `yieldTrapWarning === true` (ex: ícone de alerta ao lado do
yield, com tooltip explicando "yield 2x acima da média histórica do
próprio ativo — investigar se é sustentável antes de considerar isso
renda passiva confiável").

## Regras obrigatórias

- Reaproveitar `fetchAssetPriceHistoryFn`, `dividendHistory` já
  existentes — não criar fonte de dado nova.
- `yieldTrapWarning`/`shareholderYield` devem ser `null` (não `false`/`0`)
  quando o dado for insuficiente — nunca inventar um "não é trap" sem
  base.
- `getAssetValuation` continua função pura — dado histórico chega já
  resolvido de fora (mesmo padrão de `selicPct`, `terminalGrowthRate`).

## Testes obrigatórios

1. `calculateHistoricalYieldAverage` com série sintética de 5 anos,
   confirmando a média correta.
2. `isYieldTrap` com os 3 casos: yield 2,5x a média (true), yield 1,2x a
   média (false), dado histórico insuficiente (null).
3. `shareholderYield` com caso sintético de recompra líquida positiva e
   negativa (emissão).

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Rodar contra 1-2 tickers reais (BR e US) e reportar o resultado
   literal pra eu conferir a matemática

## Ao terminar

Atualizar `docs/SSOT.md`, seção "Backlog paralelo" — marcar yield-trap
como resolvido, mencionar limitação de cobertura do shareholder yield se
aplicável. Trabalhar em `dev`.
