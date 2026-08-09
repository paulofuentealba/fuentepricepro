# Item 13: Diagnóstico e Correção de ETFs e STOCK_US no Cash Flow

> [!NOTE]
> Relatório técnico completo do diagnóstico da causa raiz e da solução implementada para o problema de ETFs e ações US (`STOCK_US`) que não eram exibidos na projeção e no histórico de fluxo de caixa (Cash Flow).

---

## 1. Causa Raiz Diagnosticada

### O Problema Identificado:
Quando um investidor possuía em sua carteira ativos denominados em dólar (`STOCK_US` ou `ETF` em `USD`, como `VOO`, `SCHD`, `AAPL`, `MSFT`), ao acessar a tela de Fluxo de Caixa com a moeda de exibição em Real (`BRL`), a tela apresentava estado vazio (**"Your cash-flow story starts here"**) ou omitia completamente o fluxo desses ativos.

### Análise do Código Fonte (`src/lib/cashflow.ts`):
1. **Filtro Rígido por Moeda Exata**:
   - Nas linhas 138, 233 e 310 de `src/lib/cashflow.ts`, o algoritmo continha o filtro estático:
     ```ts
     if (it.currency !== currency) continue;
     ```
   - Como a moeda padrão da aplicação era `"BRL"`, qualquer ativo com `it.currency === "USD"` era **sumariamente descartado** tanto na distribuição de proventos projetados quanto no cálculo de renda realizada e gráfico de investido vs. recebido.
   - Em carteiras compostas exclusivamente ou majoritariamente por ativos US, 100% dos ativos eram descartados, resultando em buckets zerados (`amount: 0`) e disparando a renderização do estado vazio `CashFlowEmptyState`.

2. **Ausência de Conversão de Câmbio (USD/BRL)**:
   - Diferente do `useValuedPortfolio.ts` e do `FIProgressCard.tsx` (que utilizavam a cotação `usdRate`), o motor `cashflow.ts` não possuía suporte ao parâmetro de taxa de câmbio (`fxRate`), impossibilitando a consolidação multi-moeda.

---

## 2. Correção Implementada

### A. Criação da Função de Multiplicador Cambial (`src/lib/cashflow.ts`)
Implementada a função pura `getFxMultiplier`:
```ts
export function getFxMultiplier(
  assetCurrency: Currency,
  targetCurrency: Currency,
  fxRate: number = 5.5
): number {
  if (assetCurrency === targetCurrency) return 1;
  if (assetCurrency === "USD" && targetCurrency === "BRL") return fxRate > 0 ? fxRate : 5.5;
  if (assetCurrency === "BRL" && targetCurrency === "USD") return fxRate > 0 ? 1 / fxRate : 1 / 5.5;
  return 1;
}
```

### B. Atualização do Motor de Buckets (`buildMonthlyBuckets` & `computeInvestedVsReceived`)
- **Remoção do Filtro Exclusivo**: Removida a trava `if (it.currency !== currency) continue;`.
- **Conversão Dinâmica**: Todos os valores projetados, pagos e realizados agora são multiplicados pelo fator cambial `getFxMultiplier(it.currency, currency, fxRate)`.
- **Integração no Componente (`CashFlowCalendar.tsx`)**: O hook `CashFlowCalendar` agora obtém a taxa `fxRate` em tempo real via TanStack Query (`exchangeRateQueryOptions()`) e repassa para a construção dos buckets.

---

## 3. Evidências Literais de Validação

> [!TIP]
> Executados e aprovados com sucesso todos os 3 gates de qualidade.

1. **`npx tsc --noEmit`**: **0 erros** (Exit Code 0).
2. **`npm run test`**: **147 passed** | 4 skipped (25 arquivos de teste aprovados, incluindo novo teste unitário para conversão de ETFs e STOCK_US em USD).
3. **`npm run build`**: Client (4097 módulos em 1.54s) e SSR (251 módulos em 908ms) compilados sem avisos ou erros.

---

## 4. Registro de Git

- **Commit Obrigatório Realizado**: `fix(cashflow): investiga e corrige ETFs e STOCK_US ausentes na projecao de fluxo de caixa [Item 13]`
- **PROMPTS_LOG.md**: Atualizado em `docs/PROMPTS_LOG.md`.
