# Relatório de Execução — Tornar Idempotente o Import CSV de Transações

## Contexto e Problema Diagnosticado

Em `useWatchlistCsvImport.ts`, os IDs das transações sintéticas geradas durante a importação CSV utilizavam sufixos aleatórios (`Math.random().toString(36)`). Como consequência, reimportar o mesmo arquivo CSV (ou importar um ativo que já possuía transações no banco) criava novas transações com novos IDs, **duplicando a quantidade investida e distorcendo o preço médio**.

---

## Solução Aplicada

Alinhado o padrão de ID do CSV ao padrão determinístico já validado na importação de notas de corretagem em PDF (`BrokerNoteUploader.tsx`).

### Padrão Determinístico de ID
Nos 4 pontos de `useWatchlistCsvImport.ts`:
```ts
id: `tx-csv-${uppercaseTicker}-${txTimestamp}-${quantity}-${pricePerShare}`
```

### Comportamento nos 4 Cenários:
1. **Fase 3 (Modelo Avançado por Linha)**: `tx-csv-${uppercaseTicker}-${txTimestamp}-${row.quantity}-${txPrice}`. Se o mesmo CSV com as mesmas linhas for reimportado, o `upsertTransaction` sobrescreve os registros idênticos via ID determinístico sem duplicar.
2. **Fase 1 (Formato Simples - Primeira Posição)**: `tx-csv-${uppercaseTicker}-${txDate}-${importedQty}-${importedAvgPrice}`.
3. **Fase 1 (Formato Simples - Compra por Delta > 0)**: `tx-csv-${uppercaseTicker}-${txTimestamp}-${delta}-${buyPrice}`.
4. **Fase 1 (Formato Simples - Venda por Delta < 0)**: `tx-csv-${uppercaseTicker}-${txTimestamp}-${absDelta}-${importedAvgPrice}`.

> **Nota sobre o Delta**: Se a posição total do usuário não mudar entre duas importações sequenciais (`delta === 0`), a reimportação não gera novas transações de compra/venda. Se o usuário registrar novas compras reais e importar uma quantidade maior (`delta > 0`), um ID determinístico correspondente à nova fração comprada é gerado e registrado corretamente.

---

## Testes Unitários de Idempotência Adicionados

Adicionados 2 cenários de teste em `src/lib/__tests__/csvImportTransactions.test.ts`:

1. **`Scenario 4`**: Simula a importação do mesmo CSV 2 vezes seguidas.
   - **Primeira Importação**: Registra transação `tx-csv-VALE3-1710460800000-100-62.5`. Quantidade final = 100.
   - **Segunda Importação**: Reimporta o mesmo CSV. O ID gerado é idêntico (`tx-csv-VALE3-1710460800000-100-62.5`), o mapa de transações sobrescreve a chave e a quantidade final permanece exatamente **100** (não duplicou para 200).
2. **`Scenario 5`**: Simula reimportação com uma nova compra real adicionada ao CSV.
   - Importa linha original (mantém 100 ações) + nova linha de 50 ações. Quantidade final atualizada corretamente para **150** ações.

---

## Evidências Literais de Validação dos Gates

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **180 passed** / 4 skipped (30 suítes de teste aprovadas, incluindo os 5 testes de `csvImportTransactions.test.ts`).
3. **`npm run build`**: Bundle de produção Client & SSR compilados com sucesso em 962ms.

---

## Registros de Documentação & Commit (Branch `dev`)

- **Branch Ativa**: `dev`
- **Documentos Salvos**:
  - 📄 [`docs/Prompts/Tornar Idempotente o Import CSV de Transacoes.md`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/Prompts/Tornar%20Idempotente%20o%20Import%20CSV%20de%20Transacoes.md)
  - 📄 [`docs/Prompts/Ja executados/Tornar Idempotente o Import CSV de Transacoes.md`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/Prompts/Ja%20executados/Tornar%20Idempotente%20o%20Import%20CSV%20de%20Transacoes.md)
- **Logs**:
  - [`docs/PROMPTS_LOG.md`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/PROMPTS_LOG.md#tornar-idempotente-o-import-csv-de-transa%C3%A7%C3%B5es--conclu%C3%ADdo-e-verificado)
- **Git Commit Local em `dev`**: `refactor(watchlist): torna idempotente o import CSV de transacoes via IDs deterministicos`.
