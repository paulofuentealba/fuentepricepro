# Resultado — Proteção Contra Duplicata em Lançamento Manual de Transação

Prompt de origem: `docs/Prompts/prompt_idempotencia_lancamento_manual.md`

## Resumo

`TransactionFormFields.tsx` (compartilhado por `TransactionForm.tsx`,
`NewContributionDialog.tsx` e, portanto, os 3 pontos de entrada — Registrar
Aporte, Adicionar Renda Variável, edição de transação existente) agora:

1. Trava o botão Salvar durante o `await onSave(tx)`, prevenindo duplo-clique.
2. Avisa (sem bloquear, sem sobrescrever) quando detecta uma transação
   client-side já idêntica, deixando a decisão final com o usuário.

**Nenhuma mudança em ID determinístico ou sobrescrita silenciosa** — decisão
de produto já tomada no prompt e respeitada. O comportamento de idempotência
do import CSV/PDF continua intocado.

## Arquivos alterados

### `src/components/ceiling/watchlist/TransactionFormFields.tsx`

- **Travamento do botão (causa raiz do duplo-clique)**:
  - `isSaving` (estado, para a UI) + `savingRef` (ref, para o guard
    síncrono) — usei os dois porque `setState` não é síncrono: dois
    `handleSubmit` disparados na mesma tick (o cenário real de duplo-clique)
    ainda leriam `isSaving === false` se o guard dependesse só do estado.
    `savingRef.current` é setado imediatamente, fechando essa janela.
  - `handleSubmit` agora é `async`; separei a construção da transação
    (`buildTransaction`) da persistência (`persist`), que faz
    `setIsSaving(true)` → `await onSave(tx)` → `setIsSaving(false)` no
    `finally` (mesmo se `onSave` rejeitar, o botão não trava pra sempre).
  - Botão Save: `disabled={disabled || isSaving || !date || !quantity || !pricePerShare}`,
    com `Loader2` + texto "Salvando..." durante `isSaving` — mesmo padrão
    visual já usado em `BrokerNoteUploader.tsx` (`Loader2` com
    `animate-spin`), confirmado antes de implementar.
  - Prop `onSave` com tipo ajustado para `(tx: Transaction) => void | Promise<void>`,
    cobrindo tanto `TransactionForm.tsx` (síncrono) quanto
    `NewContributionDialog.tsx` (já `async`).
- **Aviso de possível duplicata**:
  - `findDuplicate(tx)`: comparação client-side contra `existingTransactions`
    (prop já recebida, sem chamada ao servidor) por
    `ticker`+`type`+mesmo dia (`isSameDay`, comparando ano/mês/dia — não o
    timestamp exato)+`quantity`+`pricePerShare`.
  - Se encontrar, mostra `AlertDialog` (shadcn/ui, já existia em
    `src/components/ui/alert-dialog.tsx` mas nunca tinha sido usado em
    lugar nenhum — confirmado antes de implementar) em vez de `alert()` do
    browser.
  - Só chama `onSave` se o usuário confirmar explicitamente
    ("Salvar mesmo assim"); cancelar fecha o aviso sem persistir nada.

### `src/lib/i18n/dict.ptBR.ts` / `dict.en.ts` / `dict.es.ts`

Novas chaves, nos 3 idiomas:
- `common.saving` — texto do botão durante o salvamento.
- `transactions.duplicateWarningTitle`, `duplicateWarningDescription`
  (com placeholders `{{ticker}}`/`{{date}}`), `duplicateWarningConfirm`,
  `duplicateWarningCancel`.

### `src/components/ceiling/watchlist/__tests__/TransactionFormFields.test.tsx` (novo)

Suíte automatizada cobrindo os 5 cenários obrigatórios do prompt:
1. Dois `submit` síncronos em sequência (simulando duplo-clique) → `onSave`
   chamado só 1 vez.
2. Transação com valores idênticos a uma existente → aviso aparece,
   `onSave` não é chamado antes da confirmação.
3. Confirmar no aviso → `onSave` chamado normalmente.
4. Cancelar no aviso → `onSave` nunca chamado (implícito no teste 2, via
   clique em "Cancelar").
5. Valores diferentes de qualquer transação existente → salva direto, sem
   aviso algum.

Precisou de um `afterEach(cleanup())` explícito (`@testing-library/react`)
porque este projeto roda Vitest sem `globals: true` — sem isso, o DOM de um
teste ficava vazando pro próximo dentro do mesmo arquivo e queries por
`id` pegavam elementos obsoletos.

## Regras obrigatórias — conferidas

- Nenhuma mudança em ID determinístico/sobrescrita silenciosa — não
  reaberto.
- Comportamento de idempotência do CSV/PDF intocado (nenhum arquivo desse
  fluxo foi alterado).
- Correção aplicada só em `TransactionFormFields.tsx` — automaticamente
  vale para os 3 pontos de entrada que o usam.

## Verificação (código, sem testes de tela)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erros |
| `npm run test` | ✅ 241 passed, 4 skipped (4 novos testes cobrindo os 5 cenários obrigatórios) |
| `npm run build` | ✅ build limpo |

## Testes na tela que precisam ser feitos manualmente

1. Em qualquer um dos 3 pontos de entrada (Registrar Aporte, Adicionar
   Renda Variável, editar transação existente), preencher o formulário e
   clicar duas vezes rápido em "Salvar" → confirmar que só 1 transação é
   criada, e que o botão mostra "Salvando..." com spinner e fica
   desabilitado até a operação terminar.
2. Salvar uma transação com ticker/tipo/data(mesmo dia)/quantidade/preço
   idênticos a uma já existente → confirmar que aparece o diálogo "Possível
   transação duplicada" antes de salvar.
3. Confirmar no diálogo ("Salvar mesmo assim") → confirmar que a nova
   transação é salva e que a existente **não** é sobrescrita (2 transações
   distintas no histórico do ativo).
4. Cancelar no diálogo → confirmar que nenhuma transação nova é criada e
   que o formulário permanece preenchido (usuário pode ajustar e tentar de
   novo).
5. Salvar uma transação com valores diferentes de qualquer uma já existente
   → confirmar que salva direto, sem aviso nenhum.
6. Testar o caso de erro: forçar uma falha de rede/erro no salvamento (se
   possível simular) → confirmar que o botão volta a ficar habilitado
   depois do erro, em vez de travado permanentemente em "Salvando...".
