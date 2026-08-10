# Relatório de Execução — Segmentar IRR Card por Moeda (CDI+Selic / S&P 500)

## Contexto e Objetivo
O componente `PortfolioIrrCard.tsx` recebia a prop `activeCurrency`, mas exibia a Rentabilidade Interna (IRR) blended (todos os ativos convertidos para BRL) comparados exclusivamente contra a taxa Selic.

Nesta etapa, o toggle de moeda (`BRL` / `USD`) foi integrado para segmentar a rentabilidade por moeda nativa sem conversão cambial, comparando com benchmarks anualizados compatíveis:
- **Toggle em BRL**: Calcula o IRR apenas com cashflows de ativos BRL (sem conversão cambial), exibindo 3 cartões lado a lado: **IRR (BRL)**, **CDI** e **Selic**, utilizando o **CDI** como benchmark de referência principal no badge de diferença (`+X.X% vs CDI`).
- **Toggle em USD**: Calcula o IRR apenas com cashflows de ativos USD (sem conversão cambial), exibindo 2 cartões lado a lado: **IRR (USD)** e **S&P 500**, com badge de diferença (`+X.X% vs S&P 500`).
- **Estado Vazio**: Exibição de card limpo e explicativo quando não houver transações na moeda selecionada (ex: carteira sem ativos em USD com toggle em USD).

---

## Modificações Realizadas

### 1. Filtro por Moeda em `src/lib/portfolioIrr.ts`
- Atualizada a função `buildCashFlowsFromPortfolio` com o parâmetro opcional `targetCurrency?: Currency | null`.
- Quando `targetCurrency` é especificado:
  - Transações e eventos de proventos são estritamente filtrados pela moeda do ativo (`BRL` ou `USD`).
  - Ativos na moeda selecionada não sofrem conversão cambial (`rate = 1`).
  - Transações de outras moedas são descartadas do cálculo do IRR daquela moeda específica.

### 2. Função Pura de Anualização `annualizeReturn` (`src/lib/benchmark.ts`)
- Criada a função pura de anualização por juros compostos:
```ts
export function annualizeReturn(cumulativeReturnPct: number, days: number): number {
  if (!days || days <= 0 || !Number.isFinite(cumulativeReturnPct)) return 0;
  const factor = 1 + cumulativeReturnPct / 100;
  if (factor <= 0) return -100;
  const annualizedFactor = Math.pow(factor, 365 / days);
  return Number(((annualizedFactor - 1) * 100).toFixed(4));
}
```

### 3. Reformulação do `PortfolioIrrCard.tsx`
- **Isolamento de Moeda**: Calcula o horizonte temporal (`fromDate` a `toDate`) com base na transação mais antiga daquela moeda específica.
- **Consultas a Benchmarks**:
  - `BRL`: Busca séries do `CDI` e `SELIC` via `benchmarkHistoryQueryOptions` no período exato e anualiza.
  - `USD`: Busca série do `SPX` (S&P 500) via `benchmarkHistoryQueryOptions` no período exato e anualiza.
- **Layout Responsivo**:
  - `BRL`: Grid de 3 colunas em desktop (`IRR (BRL)`, `CDI`, `Selic`). Badge de diferença de referência comparado contra o **CDI**.
  - `USD`: Grid de 2 colunas em desktop (`IRR (USD)`, `S&P 500`). Badge de diferença comparado contra o **S&P 500**.
- **Estado Vazio**: Card informativo renderizado com ícone `Percent` caso não existam transações na moeda selecionada.

### 4. Dicionários i18n (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`)
Adicionadas as seguintes chaves sob `t.tabs.chart`:

| Chave i18n | Português (PT-BR) | Inglês (EN) | Espanhol (ES) |
|---|---|---|---|
| `cdiBenchmark` | `"Benchmark (CDI)"` | `"CDI Benchmark"` | `"Referencia (CDI)"` |
| `spxBenchmark` | `"Benchmark (S&P 500)"` | `"Benchmark (S&P 500)"` | `"Referencia (S&P 500)"` |
| `irrBrlLabel` | `"IRR (BRL)"` | `"IRR (BRL)"` | `"TIR (BRL)"` |
| `irrUsdLabel` | `"IRR (USD)"` | `"IRR (USD)"` | `"TIR (USD)"` |
| `irrEmptyStateTitle` | `"Sem ativos em {{currency}} nesta carteira"` | `"No {{currency}} assets in this portfolio"` | `"Sin activos en {{currency}} en este portafolio"` |
| `irrEmptyStateDesc` | `"Adicione transações de ativos denominados em {{currency}} para calcular o IRR nesta moeda."` | `"Add transactions for {{currency}} assets to calculate the IRR in this currency."` | `"Añada transacciones de activos en {{currency}} para calcular la TIR en esta moneda."` |

---

## Validação dos Gates

1. **`npx tsc --noEmit`**: **0 erros** de compilação (Exit code 0).
2. **`npm run test`**: **172 passed** | 4 skipped (30 suítes de teste aprovadas, incluindo `portfolioIrr.test.ts` e `benchmarkHistory.test.ts`).
3. **`npm run build`**: Client e SSR compilados com sucesso.

---

## Exemplo de Renderização

- **BRL**:
  - Título: `RETORNO DA CARTEIRA (IRR) (BRL)`
  - Badge: `+4.2% vs CDI`
  - Cards: `[ IRR (BRL): 15.2% a.a. ] [ Benchmark (CDI): 11.0% a.a. ] [ Benchmark (Selic): 10.9% a.a. ]`
- **USD**:
  - Título: `RETORNO DA CARTEIRA (IRR) (USD)`
  - Badge: `+2.1% vs S&P 500`
  - Cards: `[ IRR (USD): 18.5% a.a. ] [ Benchmark (S&P 500): 16.4% a.a. ]`
