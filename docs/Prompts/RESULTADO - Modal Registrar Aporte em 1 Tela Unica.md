# Resultado — Modal "Registrar Aporte" em 1 Tela Única (Sem Passos)

Prompt de origem: `docs/Prompts/prompt_unificar_modal_1_tela_unica.md`

## Resumo

Busca de ticker e campos da transação agora ficam **visíveis juntos, desde a
abertura do modal**. Os campos da transação começam desabilitados e habilitam
no lugar assim que um ticker é escolhido — sem troca de tela, sem
esconder/mostrar bloco, só mudança de `disabled` nos mesmos elementos.

## Arquivos alterados

### 1. `src/components/ceiling/watchlist/TransactionFormFields.tsx`
- `item` passou a aceitar `WatchlistItem | null` (antes obrigatório).
- Nova prop `disabled?: boolean` — propagada para os campos `Select` (tipo),
  `DatePicker` (data), e os 3 `MaskedInput` (quantidade, preço, taxas).
- `currencySymbol` com fallback seguro (`"R$"`) quando `item` é `null`.
- Botão Save: `disabled={disabled || !date || !quantity || !pricePerShare}`.
- `handleSubmit`: guard extra `if (disabled || !item || !date) return;`.
- `DatePicker` já aceitava `disabled` tanto como `boolean` quanto como função
  de validação por data — combinei os dois: `disabled ? true : (fn de range
  passado/futuro já existente)`, preservando a restrição de datas quando o
  campo está habilitado.

### 2. `src/components/horizonte/NewContributionDialog.tsx`
- Removido o swap condicional `{!workingItem ? <TickerSearchField> :
  <ticker travado + TransactionFormFields>}`. Layout agora é único e sempre
  presente: `TickerSearchField` seguido de `TransactionFormFields`, com
  `disabled={!workingItem}` nesse último.
- Removido o bloco de "ticker travado + botão Trocar" (`Label` + `Button`
  "Trocar") — a própria `TickerSearchField` já permite reescrever/editar o
  ticker no mesmo input (digitar de novo reabre as sugestões e permite
  escolher outro), então não havia necessidade de UI duplicada.
- Removida a função `handleChangeTicker` (não é mais chamada por lugar
  nenhum — trocar de ticker agora é só editar o campo de busca).
- Removida a `<div className="animate-in fade-in slide-in-from-top-2">` —
  nada mais aparece/desaparece.
- Removidos os imports não usados (`Button`, `Label`, `displayTicker`).
- Adicionado `key={workingItem?.ticker ?? "empty"}` no `TransactionFormFields`
  para forçar reset dos campos internos (quantidade/preço/taxas/data/tipo)
  ao trocar de ticker — antes esse reset acontecia "de graça" porque o
  componente desmontava/remontava junto com o swap condicional; sem essa
  `key` os valores antigos ficariam presos ao trocar de ativo no meio do
  fluxo.

## Decisões tomadas (conforme pedido no prompt para "decidir e reportar")

1. **Como trocar de ticker já escolhido**: não criei prop nova
   (`lockedValue`/`onClear`) no `TickerSearchField`. O campo de busca já
   reexibe o texto do ticker escolhido (`setQuery(hit.ticker)` no `pick()`)
   e, ao editar, zera `selected` e reabre a lista de sugestões — comportamento
   nativo do componente, sem duplicar UI. Opção mais simples, sem tocar em
   `TickerSearchField.tsx`.
2. **Título do modal**: mantido estático (`t.transactions.newContributionTitle`),
   sem concatenar o ticker escolhido. Como não existe mais "passo 2", a
   concatenação perdeu o propósito visual de indicar progresso; manter fixo
   evita o header "pulando" de tamanho quando um ticker é escolhido.

## Paridade garantida

- `TransactionForm.tsx` (usado por `TransactionsPanel.tsx`) continua passando
  sempre um `item` real e nunca passa `disabled` — como o valor default de
  `disabled` é `undefined` (falsy), o comportamento desse fluxo é idêntico
  ao anterior. Conferido lendo o arquivo, nenhuma alteração foi necessária
  nele.

## Verificação (código, sem testes de tela)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erros |
| `npm run test` | ✅ 237 passed, 4 skipped (237/241) |
| `npm run build` | ✅ build limpo |

## Testes na tela que precisam ser feitos manualmente

1. Abrir o modal "Registrar Aporte" (home Horizonte FI) → confirmar que os
   campos Tipo/Data/Quantidade/Preço/Taxas aparecem **visíveis mas
   desabilitados** desde o instante em que o modal abre (não escondidos).
2. Buscar e escolher um ticker → confirmar que os mesmos campos **habilitam
   no lugar**, sem flash/re-render brusco, sem trocar de tela.
3. Com um ticker já escolhido, editar o campo de busca e escolher outro
   ticker diferente → confirmar que funciona sem fechar o modal, e que os
   campos da transação resetam (limpo, sem valores do ticker anterior).
4. Preencher e salvar um aporte → confirmar que o modal fecha e, ao reabrir,
   volta ao estado inicial (busca vazia, campos desabilitados).
5. Fluxo de edição de transação existente (`TransactionForm.tsx`, acessado
   pela tela de detalhe do ativo/`TransactionsPanel.tsx`) → confirmar que
   nada mudou visualmente ali (sem campo de busca, sem estado desabilitado).
