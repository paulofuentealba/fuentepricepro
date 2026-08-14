# Plano de Implementação — Prompts 103, 104 e 105 (Com Respostas aos 2 Pontos Críticos de Arquitetura)

---

## 🔍 Respostas aos 2 Pontos Críticos de Arquitetura

### 1. Export de Histórico de Transações vs. Posições
- **Diagnóstico**: O achado original da auditoria (Prompt 97) identificou que a plataforma exportava apenas a foto estática consolidada da carteira, sem histórico de lançamentos.
- **Solução Arquitetural no Prompt 105**:
  - Implementar **`buildTransactionsCsv(transactions: Transaction[])`** em `src/lib/csv.ts` gerando o histórico completo de ordens usando os cabeçalhos canônicos canônicos (`Ticker, Tipo, Quantidade, Preço, Taxas, Data`).
  - Implementar **`buildWatchlistFullCsv(items: WatchlistItem[])`** gerando a foto rica de posições analíticas (Ticker, Tipo, Quantidade, Preço Médio, Preço Teto, Margem de Segurança, DY, Setor, Meta Mensal).
  - No menu de exportação da UI de Minha Carteira, disponibilizar opções claras:
    - 📄 **Exportar Posições (Visão Consolidada)**
    - 📜 **Exportar Transações (Histórico Completo de Compras/Vendas)**
  - O novo parser dinâmico (Prompt 103/104) sabe ler ambos de volta como caso trivial de correspondência exata!

### 2. Tratamento Robusto de Falha Parcial no Import em Lote
- **Diagnóstico**: Ao salvar um lote de 100 transações, uma oscilação de rede pode falhar na linha 47. O usuário não pode ficar sem saber o estado do banco.
- **Solução no Prompt 105 (`src/lib/transactionPersistence.ts`)**:
  - A persistência é executada com rastreamento individual de sucesso/erro:
    ```typescript
    export interface BatchPersistenceResult {
      persistedCount: number;
      persistedTransactions: Transaction[];
      failedTransactions: { tx: Transaction; error: string; lineIndex: number }[];
      affectedTickers: string[];
    }
    ```
  - Cada transação tem seu salvamento isolado em `try/catch`. As posições da watchlist (`recalculateHoldingFromTransactions`) são atualizadas atomicamente apenas para as transações que foram salvas com sucesso.
  - Na UI (`DynamicImportModal.tsx`), se houver falhas parciais:
    - Exibição de banner de alerta com contagem: *"85 transações gravadas com sucesso, 15 falharam por erro de conexão."*
    - Tabela com as linhas exatas que falharam e o motivo.
    - Botão **"Tentar Novamente Apenas as Falhas"** e botão **"Baixar Falhas em CSV"** para que o usuário tenha total controle e zero perda de dados.

---

## 🛠️ Detalhamento das 3 Fases de Execução

### FASE 1: PROMPT 103 — Core Engine & Web Worker
- **Arquivos**:
  - `package.json` (instalação de `xlsx` - já executada)
  - `src/lib/dynamicCsvParser.ts` (funções puras: `COLUMN_SEMANTIC_ALIASES`, `normalizeHeader`, `matchColumn`, `parseOperationType`, `parseNumericValue`, `parseDateValue`, `isSupportedAsset`, `parseFile`)
  - `src/workers/importParser.worker.ts` (Web Worker client-side com streaming throttled de progresso via `postMessage`)
  - Fixtures reais em `src/lib/__tests__/fixtures/`:
    - `corretora_br_semicolon.csv`
    - `corretora_us_comma.csv`
    - `planilha_caseira_pt.csv`
  - Testes unitários completos em `src/lib/__tests__/dynamicCsvParser.test.ts`
- **Gate 1**: `tsc --noEmit`, `vitest run`, `build`.

### FASE 2: PROMPT 104 — UI de Importação & Streaming de Progresso
- **Arquivos**:
  - `src/lib/useImportParser.ts` (hook React com máquina de estados `idle | mapping | processing | done | error`)
  - `src/components/horizonte/DynamicImportModal.tsx` (4 estados: Drop Zone, Preview de Mapeamento com confiança e overrides manuais, Feed de Progresso Humanizado e Resumo Final com pendências)
  - Dicionários i18n (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`)
  - Responsividade mobile validada em 375px
- **Gate 2**: `tsc --noEmit`, `vitest run`, `build`.

### FASE 3: PROMPT 105 — Integração Carteira & Export Completo Unificado
- **Arquivos**:
  - `src/lib/transactionPersistence.ts` (persistência segura em lote com captura e recuperação de falha parcial)
  - `src/lib/csv.ts` (`buildTransactionsCsv` + `buildWatchlistFullCsv`)
  - Conexão do `DynamicImportModal` com `transactionPersistence` e `useWatchlist`
  - UI de Minha Carteira com menu de exportação detalhado
  - Teste de round-trip em `src/lib/__tests__/csvRoundTrip.test.ts`
- **Gate 3**: `tsc --noEmit`, `vitest run`, `build`.
