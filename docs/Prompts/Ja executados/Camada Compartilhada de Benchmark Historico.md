# Relatório de Execução — Camada Compartilhada de Benchmark Histórico (CDI/Selic/IBOV/S&P 500)

## Contexto e Objetivo
Construção da camada SSOT de dados históricos de benchmarks de mercado (CDI, Selic, IBOVESPA e S&P 500), preparando a infraestrutura para consumo futuro nos 3 pontos da aplicação: Comparador (`AssetComparator.tsx`), Cartão de IRR (`PortfolioIrrCard.tsx`) e Cash Flow.

Nesta etapa, foi desenvolvida estritamente a camada de dados, calculadores de retorno acumulado e a suíte de testes unitários. **Nenhuma tela foi alterada nesta fase.**

---

## Confirmação de Fontes e Séries Oficiais do BCB SGS

Conforme exigido pelas regras de segurança da aplicação, as séries do Banco Central do Brasil (BCB SGS) foram confirmadas contra o catálogo oficial de séries temporais:

1. **CDI Diário (% a.d.) — Série 12**:
   - **Nome Oficial BCB**: *"Taxa de juros - CDI"*
   - **Unidade**: `% a.d.` (porcento ao dia)
   - **URL Oficial**: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?dataInicial=DD/MM/AAAA&dataFinal=DD/MM/AAAA&formato=json`
   - *Nota*: A Série 4389 (usada em `fetchMacroRatesFn`) refere-se à taxa anualizada % a.a. Para composição diária histórica, a Série 12 é a fonte exata.

2. **Selic Diária (% a.d.) — Série 11**:
   - **Nome Oficial BCB**: *"Taxa de juros - Selic acumulada no mês em termos diários"* / *"Taxa de juros - Selic"*
   - **Unidade**: `% a.d.` (porcento ao dia)
   - **URL Oficial**: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?dataInicial=DD/MM/AAAA&dataFinal=DD/MM/AAAA&formato=json`

3. **IBOVESPA (`^BVSP`) & S&P 500 (`^GSPC`)**:
   - **Fonte**: Yahoo Finance Chart API (`v8/finance/chart/{symbol}?interval=1d&period1={startSec}&period2={endSec}`).
   - **Cálculo de Retorno**: `((Fechamento_t / Fechamento_base) - 1) * 100`.

---

## Modificações Realizadas

### 1. Biblioteca de Cálculo de Benchmarks (`src/lib/benchmark.ts`)
- Criadas as funções puras e isoladas de composição de retorno:
  - `calculateDailyCompoundedReturn(dailyRates)`: Calcula os juros compostos diários ($F_t = F_{t-1} \times (1 + r_t / 100)$), iniciando em 0% na data base.
  - `calculatePriceCumulativeReturn(priceSeries)`: Calcula a variação percentual dos preços de fechamento em relação ao primeiro dia da série ($((P_t / P_0) - 1) \times 100$).
- Implementadas as funções assíncronas de busca com retentativa (`fetchWithRetry`):
  - `fetchBcbBenchmarkSeries(seriesCode, fromDate, toDate)`
  - `fetchYahooBenchmarkSeries(symbol, fromDate, toDate)`

### 2. Server Function `fetchBenchmarkHistoryFn` (`src/lib/apiService.functions.ts`)
- Criada a Server Function TanStack Start:
```ts
export const fetchBenchmarkHistoryFn = createServerFn({ method: "GET" })
  .validator((data: { benchmark: "CDI" | "SELIC" | "IBOV" | "SPX"; fromDate: string; toDate: string }) => data)
  .handler(async ({ data }): Promise<BenchmarkPoint[]> => { ... });
```
- **Fallback Gracioso**: Em caso de falha de conexão ou HTTP no BCB ou Yahoo, retorna um array vazio (`[]`) sem lançar exceção.

### 3. TanStack Query Options (`src/lib/queryOptions.ts`)
- Exportada a função `benchmarkHistoryQueryOptions(benchmark, fromDate, toDate)` com política de cache `staleTime: 24h` (`86.400.000 ms`) e `gcTime: 48h`.

### 4. Suíte de Testes Automatizados (`src/lib/__tests__/benchmarkHistory.test.ts`)
- **Teste 1**: Validação da composição de juros compostos diários (ex: 3 dias de 0,05% diários compõem para `0.150075%`, demonstrando que o valor composto supera a soma simples de 0,15%).
- **Teste 2**: Validação do retorno acumulado de preços de fechamento (IBOV/SPX).
- **Teste 3**: Validação de tratamento para séries vazias e simulação de falha de rede (retornando `[]` sem exceção).

---

## Validação dos Gates

1. **`npx tsc --noEmit`**: 0 erros de compilação (Exit code 0).
2. **`npm run test`**: 169 testes passaram em 29 suítes de teste (incluindo `benchmarkHistory.test.ts`).
3. **`npm run build`**: Bundle de produção Client & SSR compilados com sucesso.

---

## Exemplo de Resposta de `calculateDailyCompoundedReturn`

```json
[
  { "date": "2024-01-01", "cumulativeReturnPct": 0 },
  { "date": "2024-01-02", "cumulativeReturnPct": 0.05 },
  { "date": "2024-01-03", "cumulativeReturnPct": 0.100025 },
  { "date": "2024-01-04", "cumulativeReturnPct": 0.150075 }
]
```
