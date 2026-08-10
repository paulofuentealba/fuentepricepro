# Plano de Implementação: Fix — Gravação Automática de Transações na Importação de Nota de Corretagem (Idempotente)

Corrigir a omissão de gravação no histórico de transações (`Transaction[]`) durante a importação de notas de corretagem via PDF em `BrokerNoteUploader.tsx`, utilizando um ID determinístico para idempotência em re-importações.

---

## ⚠️ Pontos de Atenção & Decisões de Arquitetura (Risco ➔ Decisão)

1. **ID Determinístico de Transação para Garantia de Idempotência**
   - **Risco**: Se o ID da transação usasse `Math.random()`, o re-upload acidental da mesma nota PDF (duplo clique ou falha pontual de rede) criaria registros duplicados em `Transaction[]`, distorcendo a renda realizada e o IRR da carteira.
   - **Decisão**: Gerar o ID da transação de forma estritamente determinística a partir dos dados do trade:
     ```ts
     const id = `tx-pdf-${trade.ticker.toUpperCase()}-${txTimestamp}-${trade.quantity}-${trade.price}`;
     ```
     Desta forma, re-importar o mesmo PDF resulta em um `setDoc` / `upsert` com a mesma chave, sobrescrevendo com segurança em vez de duplicar.
   - **Limitação Conhecida Mapeada**: Caso ocorram dois trades genuinamente distintos no mesmo dia com os exatos mesmos valores (mesmo ticker, mesma data, mesma quantidade e mesmo preço por ação), eles gerarão o mesmo ID determinístico. É uma limitação rara e aceita nesta fase para priorizar a garantia de idempotência anti-duplicação.

2. **Conversão Precisa de Data de Ordem ("DD/MM/YYYY" ➔ Timestamp com UTC Meio-Dia)**
   - **Risco**: Passar a string `"DD/MM/YYYY"` direto para `new Date()` pode resultar em `NaN` ou virar 23:00 do dia anterior dependendo do fuso horário local do navegador.
   - **Decisão**: Implementar a função `parseDdMmYyyyToTimestamp(dateStr)` que extrai dia/mês/ano e gera o timestamp usando `Date.UTC(year, month, day, 12, 0, 0)`.

3. **Risco Conhecido Mapeado: Divergência Temporária em Múltiplas Ordens do Mesmo Ticker**
   - **Risco**: Se um único PDF contiver múltiplas ordens do mesmo ticker (ex: duas compras de `WEGE3` no mesmo pregão), a lógica atual de `WatchlistItem` gera itens substituindo a posição atual na watchlist sem consolidar a quantidade total.
   - **Decisão (Escopo Delimitado)**: Por especificação explícita desta tarefa, **NÃO alteraremos a lógica de consolidação da watchlist agora** (ficará para a próxima tarefa). Gravaremos 100% das transações em `Transaction[]`.

---

## Proposed Changes

### Core Logic

#### [MODIFY] [BrokerNoteUploader.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/BrokerNoteUploader.tsx)
- Importar `useTransactions` de `@/lib/transactions`.
- Consumir `const { upsert: upsertTransaction } = useTransactions();`.
- Implementar `parseDdMmYyyyToTimestamp(dateStr: string): number`.
- No loop de `result.trades` dentro de `processFile`:
  - Montar a `Transaction` com o ID determinístico:
    ```ts
    const txTimestamp = parseDdMmYyyyToTimestamp(trade.date);
    const transaction: Transaction = {
      id: `tx-pdf-${trade.ticker.toUpperCase()}-${txTimestamp}-${trade.quantity}-${trade.price}`,
      ticker: trade.ticker.toUpperCase(),
      type: "buy",
      date: txTimestamp,
      quantity: trade.quantity,
      pricePerShare: trade.price,
      fees: null,
    };
    await upsertTransaction(transaction);
    ```

---

### Unit Tests

#### [MODIFY] [pdf-parser.test.ts](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/__tests__/pdf-parser.test.ts)
- Adicionar teste unitário de parsing de data `"DD/MM/YYYY"` para timestamp UTC meio-dia.
- Adicionar teste unitário validando que cada trade parseado gera um objeto `Transaction` com o ID determinístico no formato `tx-pdf-{ticker}-{timestamp}-{qty}-{price}`.

---

## Plano de Verificação

### Automated Tests
- Executar `npm run test` e verificar aprovação dos 93+ testes unitários.
- Executar `npm run build` garantindo zero erros de compilação SSR/Vite.

### Documentation Updates
- Atualizar `docs/BACKLOG_V2.md` (seção 1.1) registrando o fix de gravação em `Transaction[]` idempotente e a limitação de consolidação de watchlist reservada para o próximo prompt.
- Registar o progresso no `docs/PROMPTS_LOG.md`.
