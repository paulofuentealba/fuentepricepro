# Prompt para Antigravity — Fix Crítico: Reimportação de PDF Apaga Customizações (PR4: Item 5)

## Modo de operação

`[EXECUÇÃO]`. Bug crítico de perda de dado, causa raiz já isolada por Claude (debug completo abaixo) — não precisa reinvestigação, só implementação + verificação.

**Um commit:**
```
fix(brokerNoteImport): preservar customizações do usuário em reimportação de PDF [Item 5]
```

## Classificação de severidade (Product Manager)

🔴 **Crítica** — perda silenciosa de dado do usuário (`targetYield`, `payoutRatio`, `customTaxRate`, `targetMonthlyIncome`) em fluxo de uso recorrente (reimportar extrato de corretora).

## Contexto — Causa raiz confirmada (Debug)

Cadeia rastreada: `consolidateTradesToWatchlistItems` (`src/lib/dataIngestion/brokerNoteImport.ts`) → `BrokerNoteImportPage.handleConfirm` (`src/components/portfolio/BrokerNoteImportPage.tsx`) → `useWatchlist().upsertManyAsync` → `setDoc(ref, row, { merge: true })` (`src/lib/watchlist.ts`).

`consolidateTradesToWatchlistItems` constrói cada `WatchlistItem` do zero, sem nunca consultar o item já existente na watchlist:
```ts
const target = 6;                    // sempre 6, ignora existing?.targetYield
...
payoutRatio: null,                    // sempre null
customTaxRate: null,                  // sempre null
targetMonthlyIncome: null,            // sempre null
```

`merge: true` no Firestore só preserva campos **ausentes** do payload — campos presentes com `null` sobrescrevem o documento. Como `itemToRow` sempre inclui essas 4 chaves, **toda reimportação de PDF para um ticker já existente apaga silenciosamente as customizações do usuário**.

O pipeline CSV (`useWatchlistCsvImport.ts`) já faz certo — consulta `existingById.get(id)` e preserva `existing?.targetYield ?? 6`, `existing?.payoutRatio ?? null`, `existing?.customTaxRate ?? null`, `existing?.targetMonthlyIncome ?? null`. Este fix alinha o pipeline PDF ao mesmo padrão.

## Escopo técnico

### 1. `src/lib/dataIngestion/brokerNoteImport.ts`

Adicionar parâmetro `existingWatchlistItems: WatchlistItem[]` a `consolidateTradesToWatchlistItems`:

```ts
export function consolidateTradesToWatchlistItems(
  trades: { ticker: string; quantity: number; price: number; date: string }[],
  existingTransactions: Transaction[],
  newlyCreatedTransactions: Transaction[],
  assetDataMap: Record<string, any> = {},
  detectedBroker?: SupportedBroker | null,
  existingWatchlistItems: WatchlistItem[] = [],
): WatchlistItem[] {
  const existingById = new Map(existingWatchlistItems.map((i) => [i.id, i]));
  // ... dentro do loop for (const [ticker, tickerTrades] of tradesByTicker.entries()):
  const id = makeId(ticker, type);
  const existing = existingById.get(id);
  const target = existing?.targetYield ?? 6;
  // usar `target` (não mais o literal 6) na chamada de getAssetValuation e no targetYield salvo
  ...
  itemsToImport.push({
    id,
    ...
    targetYield: target,
    payoutRatio: existing?.payoutRatio ?? null,
    customTaxRate: existing?.customTaxRate ?? null,
    targetMonthlyIncome: existing?.targetMonthlyIncome ?? null,
    sector: assetData?.sector || existing?.sector || null,
    broker: detectedBroker ? KNOWN_BROKER_LABELS[detectedBroker] : (existing?.broker ?? null),
    ...
  });
}
```
Importar `WatchlistItem` já está feito no arquivo (usado no tipo de retorno) — só adicionar o uso de `existing`.

### 2. `src/components/portfolio/BrokerNoteImportPage.tsx`

No `handleConfirm`, a chamada a `consolidateTradesToWatchlistItems` passa a incluir os itens atuais da watchlist (já disponíveis via `useWatchlist()`, que o componente já consome para `upsertManyAsync`):
```ts
const { items: watchlistItems, upsertManyAsync } = useWatchlist(); // ajustar destructure existente

const itemsToImport = consolidateTradesToWatchlistItems(
  validTrades,
  transactions,
  newlyCreatedTransactions,
  assetDataMap,
  detectedBroker,
  watchlistItems,
);
```

## Pontos de Atenção & Decisões de Arquitetura

| Risco | Decisão |
|---|---|
| `sector: assetData?.sector || existing?.sector || null` muda a prioridade atual (`assetData?.sector || null`) — passa a cair para o setor já salvo se o novo lookup de asset não trouxer setor | Comportamento estritamente melhor (preserva dado antes perdido), sem trade-off — aplicar direto |
| `broker` hoje é sempre sobrescrito pelo broker detectado no PDF atual — ao adicionar fallback para `existing?.broker`, uma reimportação de um broker diferente do original passaria a **não mudar** o campo se `detectedBroker` for null (não deveria acontecer, já que vem de PDF resolvido, mas por segurança o fallback só entra se `detectedBroker` for falsy) | Comportamento correto — nunca fica pior que hoje |
| Este fix **não** cobre a consolidação completa da lógica de reconciliação entre os 3 pipelines de import (CSV/XLSX/PDF) que ainda está duplicada — só corrige o bug de perda de dado no pipeline PDF | Extração de `reconcileImportedTrades()` compartilhada continua pendente para uma próxima passada, fora de escopo aqui por ser mudança estrutural maior — este prompt é о fix cirúrgico |

## Teste obrigatório (além dos 3 gates)

Antes de reportar concluído, validar manualmente (ou escrever teste automatizado se `dataIngestion/__tests__/` já cobre este arquivo):
1. Criar/ter um ativo na watchlist com `targetYield` customizado (ex: 8%), `payoutRatio` preenchido.
2. Importar um PDF de nota de corretagem contendo uma compra do mesmo ticker.
3. Confirmar a importação.
4. Verificar que `targetYield` continua 8% (não voltou para 6%) e `payoutRatio` não virou `null`.

## Arquivos afetados

- `src/lib/dataIngestion/brokerNoteImport.ts`
- `src/components/portfolio/BrokerNoteImportPage.tsx`
- Testes existentes em `src/lib/dataIngestion/__tests__/` (atualizar se cobrirem `consolidateTradesToWatchlistItems`, ou criar caso de regressão para este bug especificamente)

## Proibido

- Tocar em `useWatchlistCsvImport.ts` ou `useImportParser.ts` — este prompt é só o pipeline PDF.
- Extrair a função `reconcileImportedTrades()` compartilhada nesta passada — fora de escopo, ver Ponto de Atenção acima.

## Governança de roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | ✅ | Gate obrigatório |
| `fuente-solution-architect` | ✅ | Acoplamento entre pipeline PDF e camada de persistência |
| `engineering:debug` | ✅ | Causa raiz já isolada por Claude, ver Contexto |
| `fuente-investidor-profissional` | ✅ | Perda de customização de yield-alvo afeta credibilidade com usuário sério |
| Demais 5 roles | ❌ | Sem mudança de UX visível, copy, dado pessoal, ou modelo de negócio |

## Gates de verificação final (colar output literal)

```bash
npx tsc --noEmit
npm run test
npm run build
```

## Mensagem de commit

```
fix(brokerNoteImport): preservar customizações do usuário em reimportação de PDF [Item 5]
```
