### Prompt Fix — Consolidação de Trades Duplicados do Mesmo Ticker na Importação de PDF ✅

- **Objetivo**: Corrigir a importação de PDF de notas de corretagem (`BrokerNoteUploader.tsx`) para que múltiplos trades do mesmo ticker na mesma nota (ex: 2 compras de WEGE3 no mesmo pregão) não sobrescrevam a posição na Watchlist. Recalcular a quantidade total e o preço médio ponderado consolidado (`recalculateHoldingFromTransactions`) incluindo posições pré-existentes.
- **Implementação Técnica (`src/components/ceiling/watchlist/BrokerNoteUploader.tsx`)**:
  - `consolidateTradesToWatchlistItems`: Função pura exportada para agrupamento por ticker em caixa alta.
  - Gravação individual de cada ordem em `Transaction[]` via `upsertTransaction` preservada.
  - Leitura combinada de transações pré-existentes (`useTransactions().transactions`) e transações recém-criadas na nota (`newlyCreatedTransactions`), prevenindo potenciais race conditions ou inconsistências no cache React Query.
  - Cálculo SSOT de `quantity` e `averagePrice` reutilizando a função pura `recalculateHoldingFromTransactions` de `src/lib/transactions.ts`.
  - Busca de `assetData` consolidada uma única vez por ticker único (evitando chamadas redundantes de API).
- **Testes Unitários (`src/lib/__tests__/pdf-parser.test.ts`)**:
  - Criados 3 testes dedicados na suíte `consolidateTradesToWatchlistItems`:
    1. Importação de 2 trades do mesmo ticker no mesmo PDF (100 @ R$40 + 50 @ R$42 -> `quantity: 150`, `averagePrice: 40.6667`).
    2. Importação de ticker com posição pré-existente (100 @ R$30 antiga + 100 @ R$40 nova -> `quantity: 200`, `averagePrice: 35.00`).
    3. Garantia de não-regressão para múltiplos tickers únicos sem duplicata.
- **Validação de Testes e Build**:
  - `npm run test`: **97/97 testes unitários aprovados** em 16 arquivos de teste.
  - `npm run build`: Compilação Client/SSR 100% limpa.

---