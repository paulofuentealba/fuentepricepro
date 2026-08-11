# Prompt para Antigravity — Restaurar Transação Sintética na Edição Manual (Regressão do Item 6C Fase 2)

## Contexto

Auditoria encontrou uma regressão real: `handleDialogSave` em
`src/components/ceiling/Watchlist.tsx` (consumido por `EditItemDialog.tsx`
via `WatchlistDialogs.tsx`) hoje faz apenas:

```ts
const handleDialogSave = useCallback(
  (patch: Partial<WatchlistItem>) => {
    if (!editing) return;
    update(editing.id, patch);
    toast.success(t.toasts.assetUpdated);
    setEditing(null);
  },
  [editing, update, t.toasts.assetUpdated],
);
```

Isso grava `quantity`/`averagePrice` direto no `WatchlistItem` via
`update()`, sem passar pelo sistema de transações. O Item 6C Fase 2
(implementado anteriormente nesta mesma base de código) fazia essa edição
gerar uma **transação sintética por delta** — mesmo padrão que hoje ainda
funciona corretamente em `WatchlistTable.tsx` (edição inline) e no import
CSV (`useWatchlistCsvImport.ts`). Esse padrão se perdeu especificamente no
fluxo do `EditItemDialog`/`handleDialogSave`.

## Correção obrigatória

1. Investigar o histórico do arquivo (`git log -p --follow -- src/components/ceiling/watchlist/EditItemDialog.tsx`
   e o mesmo para `Watchlist.tsx`) pra confirmar em qual commit a lógica
   de transação sintética foi removida/sobrescrita — reportar o commit
   encontrado, não só corrigir sem entender a causa.
2. Restaurar o comportamento: ao salvar uma edição manual de quantidade
   via `EditItemDialog`, calcular o delta entre a posição atual (derivada
   de `recalculateHoldingFromTransactions`) e a quantidade digitada, e
   criar uma transação sintética com esse delta — mesmo padrão já usado
   em `WatchlistTable.tsx` e documentado no Item 6C Fase 2 original.
   Rótulo da transação: reaproveitar a chave i18n já usada pra "Ajuste
   manual de posição" (buscar a chave exata já existente, não criar
   nova).
3. Se `patch.averagePrice` também for editado manualmente nesse diálogo,
   aplicar a mesma lógica de preço-por-delta ponderado já usada no import
   CSV (`useWatchlistCsvImport.ts`, cálculo de
   `(targetTotalCost - currentTotalCost) / delta`) — reaproveitar o
   mesmo cálculo, não duplicar.
4. Manter o fallback de compatibilidade (`item.quantity`/`item.averagePrice`
   continuam sendo escritos também, como já era o padrão estabelecido no
   6C Fase 2) — não remover esses campos do documento.

## Regras obrigatórias

- Não alterar `WatchlistTable.tsx` nem `useWatchlistCsvImport.ts` — eles
  já estão corretos, servem de referência.
- Diagnosticar a causa raiz (qual commit reverteu isso) antes de corrigir
  — importante entender se foi uma sobrescrita acidental em algum dos
  commits em massa desta sessão, pra evitar que aconteça de novo.
- Considerar adicionar um teste de regressão específico que teria pego
  essa regressão automaticamente (ex: teste que verifica que editar
  quantidade via `EditItemDialog`/`handleDialogSave` sempre resulta em
  uma nova entrada em `transactions`, não só no campo direto do item).

## Testes obrigatórios

1. Teste de regressão: editar quantidade de um ativo com histórico de
   transações existente via o fluxo do `EditItemDialog` → confirmar que
   uma transação sintética nova aparece no histórico, com o delta
   correto.
2. Teste confirmando que o preço médio final bate com o valor editado
   manualmente, calculado via `recalculateHoldingFromTransactions`.
3. Confirmar que os testes já existentes de `csvImportTransactions.test.ts`
   e `transactions.test.ts` continuam passando.

## Verificação obrigatória (evidência real)

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. O commit/momento exato onde a regressão foi introduzida (se
   encontrado)
3. Evidência do teste de regressão passando

## Ao terminar

Atualizar `docs/PROMPTS_LOG.md` com a causa raiz encontrada e a correção.
Trabalhar em `dev`.
