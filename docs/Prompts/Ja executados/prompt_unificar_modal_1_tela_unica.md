# Prompt para Claude Code — Modal "Registrar Aporte" em 1 Tela Única (Sem Passos)

## Contexto

`NewContributionDialog.tsx` já é um único `<Dialog>` persistente (bug do
fecha/reabre já corrigido), mas ainda **alterna o conteúdo interno**:
`{!workingItem ? <TickerSearchField> : <ticker travado + TransactionFormFields>}`.
Paulo quer os dois visíveis **juntos, desde a abertura do modal** — sem
sensação de "passo 1, passo 2".

## Objetivo

Busca de ticker + campos da transação (Tipo/Data/Quantidade/Preço/Taxas)
todos visíveis ao mesmo tempo, desde o instante em que o modal abre. Os
campos da transação começam **desabilitados** (não escondidos) e habilitam
assim que um ticker é escolhido — sem troca de layout, só uma mudança de
estado (`disabled` → habilitado) nos mesmos elementos já na tela.

## Escopo técnico

### 1. `TransactionFormFields.tsx` — aceitar estado desabilitado e item opcional

```ts
interface Props {
  item: WatchlistItem | null; // antes obrigatório, agora aceita null
  onSave: (tx: Transaction) => void;
  existingTransactions: Transaction[];
  initialData?: Transaction | null;
  onCancel?: () => void;
  disabled?: boolean; // novo — desabilita todos os inputs + botão Save
}
```

- `currencySymbol` deve ter fallback seguro quando `item` for `null` (ex:
  `"R$"` como padrão neutro, já que sem ticker escolhido não há moeda
  real ainda).
- Todos os campos (`Select` de tipo, `DatePicker`, os 3 `MaskedInput`)
  recebem `disabled={disabled}` (ou o equivalente de cada componente).
- Botão Save: `disabled={disabled || !date || !quantity || !pricePerShare}`.
- `handleSubmit`: se `disabled` ou `!item`, não fazer nada (guard extra,
  já que o botão desabilitado deveria impedir isso, mas defensivo).

**Não alterar** o comportamento de `TransactionForm.tsx`/
`TransactionsPanel.tsx` (que sempre passam um `item` real, nunca `null`,
e nunca passam `disabled`) — testar que continuam idênticos.

### 2. `NewContributionDialog.tsx` — layout único, sem swap condicional

Substituir o `{!workingItem ? ... : ...}` por uma estrutura sempre
presente:

```tsx
<div className="space-y-4">
  <TickerSearchField
    onPick={setPickedHit}
    autoFocus
    // se já houver ticker escolhido, mostrar como campo preenchido/travado
    // com opção de trocar — decidir se isso é uma prop nova do
    // TickerSearchField (ex: `lockedValue`/`onClear`) ou se o campo de
    // busca simplesmente re-preenche com o texto do ticker escolhido e
    // permite editar de novo livremente. Escolher a opção mais simples
    // de implementar sem duplicar UI, reportar a decisão.
  />

  <TransactionFormFields
    item={workingItem}
    onSave={handleSaveTransaction}
    existingTransactions={tickerTxs}
    disabled={!workingItem}
  />
</div>
```

- Remover a `<div className="animate-in fade-in slide-in-from-top-2">`
  (não faz mais sentido — nada aparece/desaparece, os campos já estão lá
  desde o início, só mudam de habilitado pra desabilitado).
- Remover o bloco de "ticker travado + botão Trocar" que existia no
  estado `workingItem` — a própria `TickerSearchField` cuida disso agora
  (ver decisão acima).
- Título do modal: manter `t.transactions.newContributionTitle` sempre,
  sem concatenar o ticker no título (já que agora não há mais "passo 2"
  onde isso fazia sentido visualmente) — ou manter concatenado se ficar
  melhor visualmente, decidir e reportar.

## Regras obrigatórias

- Não duplicar `TickerSearchField` nem `TransactionFormFields` — um único
  de cada, reaproveitados como já estão.
- `TransactionForm.tsx`/`TransactionsPanel.tsx` não podem ter nenhuma
  mudança de comportamento visível — testar lado a lado.
- Testar que escolher um ticker habilita os campos sem re-render
  brusco/flash de conteúdo.

## Testes obrigatórios

1. Abrir o modal → confirmar que campos de transação aparecem
   desabilitados desde o início (não escondidos).
2. Escolher um ticker → confirmar que os campos habilitam no lugar,
   sem trocar de tela/layout.
3. Trocar de ticker depois de já ter escolhido um → confirmar que
   funciona sem fechar o modal.
4. `TransactionForm.tsx`/`TransactionsPanel.tsx`: paridade de
   comportamento antes/depois.

## Verificação obrigatória (evidência real)

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot do modal recém-aberto (campos desabilitados visíveis) e do
   modal com ticker escolhido (campos habilitados), confirmando que é o
   mesmo layout, sem swap

## Ao terminar

Atualizar `docs/SSOT.md`. Trabalhar em `dev`.
