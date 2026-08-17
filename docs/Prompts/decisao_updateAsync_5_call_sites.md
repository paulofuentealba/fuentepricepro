# Decisão — Escopo do updateAsync (resposta à pergunta da Fase 2)

> Copiar e colar no chat `[EXECUÇÃO]`.

## Decisão: os 5, não só os 2 (3 e 4)

Fui conferir os outros 4 call sites antes de decidir — não é "precaução
genérica", achei um problema concreto:

**`WatchlistTable.tsx` (item 5) é o pior dos 5, mais grave até que
TransactionsPanel.** `handleSave` roda um `for` síncrono disparando
`update()` fire-and-forget para **múltiplos tickers diferentes ao mesmo
tempo** (edição em lote da tabela) — e na sequência, `setIsEditing(false)`
e o toast `assetsUpdatedCount` de sucesso disparam **imediatamente**, sem
esperar nenhuma gravação confirmar. Se qualquer uma das N gravações
falhar, o usuário vê "X ativos atualizados com sucesso" mesmo que uma
tenha falhado silenciosamente. Isso é o mesmo bug de fundo do
TransactionsPanel, só que multiplicado por N ativos numa única ação.

**Classificação dos 5 call sites:**

| # | Arquivo | Risco | Ação |
|---|---|---|---|
| 3, 4 | `TransactionsPanel.tsx` (Save/Delete) | Confirmado — causa raiz do bug reportado (BRAP4) | `updateAsync`, obrigatório |
| 5 | `WatchlistTable.tsx` (handleSave, edição em lote) | Mesma classe de bug, N ativos por vez, sem feedback de erro por item | `updateAsync`, obrigatório — E ajuste adicional abaixo |
| 2 | `EditPositionFields.tsx` | Edição manual direta de `quantity`/`averagePrice`/valuation — mesmo campo do bug original | `updateAsync`, obrigatório |
| 1 | `AssetDetailSheet.tsx` (`investingSince`) | Campo único, sem encadeamento com outro estado, menor risco | `updateAsync` por consistência (Regra 1), não é urgente sozinho |

## Ajuste adicional exigido para o item 5 (`WatchlistTable.tsx`)

Trocar `.mutate()` por `.mutateAsync()` sozinho não resolve o problema de
feedback aqui — o `for` precisa esperar TODAS as gravações antes de
mostrar sucesso, e reportar se alguma falhou:

```typescript
const handleSave = async () => {
  const results = await Promise.allSettled(
    Object.entries(edits)
      .filter(([id, vals]) => {
        const it = items.find((x) => x.id === id);
        if (!it) return false;
        const newQty = parseInt(vals.qty, 10);
        const qty = isNaN(newQty) || newQty < 0 ? 0 : newQty;
        const newAvg = parseFloat(vals.avg);
        const avg = isNaN(newAvg) || newAvg <= 0 ? null : newAvg;
        return it.quantity !== qty || it.averagePrice !== avg;
      })
      .map(([id, vals]) => {
        const newQty = parseInt(vals.qty, 10);
        const qty = isNaN(newQty) || newQty < 0 ? 0 : newQty;
        const newAvg = parseFloat(vals.avg);
        const avg = isNaN(newAvg) || newAvg <= 0 ? null : newAvg;
        return updateAsync(id, { quantity: qty, averagePrice: avg });
      })
  );

  setIsEditing(false);

  const succeeded = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  if (succeeded > 0) {
    toast.success(t.toasts.assetsUpdatedCount.replace("{{count}}", String(succeeded)));
  }
  if (failed > 0) {
    toast.error(`${failed} ativo(s) falharam ao salvar — revise antes de confiar nos números.`);
  }
};
```

Ajuste o texto do toast de erro para a chave de i18n correspondente (não
hardcode string visível ao usuário — Regra 2). Se não existir chave
pronta para esse caso, crie uma nova nos 3 idiomas.

## TAREFA
1. Implementar `updateAsync` em `useWatchlist()` como já combinado.
2. Trocar os 5 call sites para `updateAsync`, com o ajuste adicional de
   `Promise.allSettled` + feedback de erro em `WatchlistTable.tsx`.
3. Para o item 1 (`AssetDetailSheet.tsx`), trocar só a chamada, sem
   necessidade de `await` bloqueante na UI se não fizer sentido ali — mas
   usar `updateAsync` e tratar erro com toast, no mínimo.
4. Rode `npm run test`, `npx tsc --noEmit`, `npm run build` — output
   literal e completo.
5. Teste manualmente o fluxo de edição em lote da `WatchlistTable` com
   pelo menos 3 ativos editados de uma vez, confirmando que o toast só
   aparece depois de todas as gravações resolverem.
6. Commits separados: um para `updateAsync` no hook, um para cada call
   site migrado (ou agrupados por componente, não um commit gigante de
   novo).

## PROIBIDO
- Proibido deixar `WatchlistTable.handleSave` disparando toast de sucesso
  antes de esperar todas as gravações.
- Proibido hardcode de string de erro nova sem passar pelo sistema de i18n.
