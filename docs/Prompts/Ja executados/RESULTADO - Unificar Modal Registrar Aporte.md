# RESULTADO — Unificar Modal "Registrar Aporte"

> Nota: `docs/PROMPTS_LOG.md` não existe mais nesta versão do projeto (consolidado no SSOT em
> execuções anteriores). Este resultado é documentado apenas neste arquivo.

## 1. Botão duplicado removido

`src/routes/app/index.tsx`: removido o botão "Registrar aporte" da seção "Sua carteira" (ficou só
"Ver tudo" ali). Como consequência, o estado `showContributionDialog`/`setShowContributionDialog`
e a instância própria de `<NewContributionDialog>` que essa rota mantinha também eram redundantes
(o `HorizonteHero.tsx` já tem seu próprio estado e sua própria instância do dialog) — removidos
junto, bem como os imports agora não usados (`NewContributionDialog`, `PlusCircle`). O único ponto
de entrada do fluxo de aporte na home passou a ser o botão dentro do `HorizonteHero`.

## 2. Modal unificado em um único `<Dialog>` persistente

Causa raiz confirmada: `TransactionForm.tsx` tinha seu próprio `<Dialog>`, e
`NewContributionDialog.tsx` trocava de retornar seu próprio `<Dialog>` (busca) para retornar
`<TransactionForm>` (com um segundo `<Dialog>` inteiramente novo) assim que um ticker era
escolhido — isso desmontava e remontava o modal.

### Correção aplicada

1. **`src/components/ceiling/watchlist/TransactionFormFields.tsx`** (novo) — extrai os campos
   Type/Date/Quantity/Price per share/Fees + botão Save/Cancel de dentro do antigo
   `TransactionForm.tsx`, sem `Dialog` próprio. Recebe `item`, `onSave`, `existingTransactions`,
   `initialData` e um `onCancel` opcional (usado pelo botão Cancel quando há wrapper de dialog).

2. **`src/components/ceiling/watchlist/TransactionForm.tsx`** — agora só provê
   `<Dialog>/<DialogContent>/<DialogHeader>` e renderiza `<TransactionFormFields>` dentro.
   Comportamento idêntico ao anterior para quem já usa esse componente
   (`TransactionsPanel.tsx`) — mesmas props, mesmo texto de título, mesmo fechar ao salvar/cancelar.

3. **`src/components/horizonte/NewContributionDialog.tsx`** — reescrito para ter um único
   `<Dialog>` persistente que nunca desmonta entre os passos:
   - Passo 1 (sem ticker): `<TickerSearchField onPick={setPickedHit} autoFocus />`.
   - Passo 2 (ticker escolhido): `<TickerSearchField>` é substituído por um campo travado
     mostrando o ticker escolhido + botão "Trocar" (reseta `pickedHit`/`workingItem` para voltar
     ao passo 1 sem fechar o `Dialog`), e abaixo `<TransactionFormFields>` aparece com
     `animate-in fade-in slide-in-from-top-2 duration-200` (convenção de transição já usada em
     outros componentes do projeto, ex. `select.tsx`, `dialog.tsx`, `popover.tsx`).
   - O `<Dialog>` em si (abertura/fechamento, overlay, `sm:max-w-[425px]`) é o mesmo elemento do
     início ao fim — só o conteúdo interno muda condicionalmente em `workingItem`.

## Testes obrigatórios — resultado

1. **Fluxo completo "Registrar aporte"**: verificado — abrir modal → escolher ticker → formulário
   aparece na mesma tela sem fechar/reabrir → salvar → modal fecha. Ver seção "Verificação visual"
   abaixo para a evidência de que é o mesmo nó DOM do início ao fim.
2. **Trocar ticker no meio do fluxo**: verificado — clique em "Trocar" volta ao passo de busca sem
   fechar o `Dialog` (mesmo `id`/`data-state="open"` antes e depois).
3. **`TransactionsPanel.tsx` (edição de transação existente)**: `TransactionForm.tsx` mantém a
   mesma assinatura de props e o mesmo comportamento visual (título, campos, Save/Cancel fecham o
   dialog) — nenhuma mudança de comportamento nesse consumidor.

## Verificação — evidência real

### 1. `npx tsc --noEmit`, `npm run test`, `npm run build`

- `npx tsc --noEmit`: limpo em relação às mudanças. Únicos erros reportados são pré-existentes e
  não relacionados (`src/components/horizonte/__tests__/HorizonteHero.test.tsx` —
  `toBeInTheDocument` não tipado; arquivo não tocado nesta tarefa).
- `npm run test`: 228 passed, 1 pré-existente falhando (`design-tokens.test.ts` — comentários em
  `HorizonteHero.tsx` contendo a string `oklch(` dentro de texto explicativo, não código; arquivo
  não tocado nesta tarefa), 4 skipped.
- `npm run build`: build limpo, sem erros. `TransactionFormFields.tsx` aparece como chunk próprio
  no output (`TransactionFormFields-*.js`), confirmando que o componente foi corretamente
  extraído e é compartilhado pelos dois consumidores.

### 2. Confirmação visual — só 1 botão "Registrar aporte" na home

Via `npm run dev` (porta 5176) + navegador: `get_page_text` e `read_page` (interactive) da rota
`/app` mostraram um único botão "Registrar aporte" na página inteira (dentro do
`HorizonteHero`). A seção "Sua carteira" ficou só com "Ver tudo".

### 3. Verificação visual real da transição contínua (mesmo `<Dialog>`)

Ambiente: dev server real (`npm run dev`) conectado ao Firebase de produção
(`fuente-price-pro`), mas sem usuário autenticado (`Sign In` visível) — nesse estado
`useWatchlist`/`useTransactions` operam em modo "guest" com persistência em `localStorage`
(`src/lib/transactions.ts`, seção "Local storage helpers (guest mode)"), então nenhuma escrita
caiu no Firestore de produção.

A API real de busca de ticker (`searchAssetsFn`) retornou `net::ERR_CONNECTION_REFUSED` de forma
consistente neste sandbox (falha de rede do ambiente de execução do navegador, não do código —
outras server functions do mesmo módulo, como `fetchAssetFn`/`fetchQuoteFn`, responderam 200
normalmente). Para conseguir avançar ao passo 2 e inspecionar o DOM real, foi adicionado
temporariamente um hook de QA (`window.addEventListener("__qa_pick_ticker", ...)` chamando
`setPickedHit` diretamente) em `NewContributionDialog.tsx`, usado só para o teste manual e
**removido antes do commit** (não faz parte do código entregue).

Sequência observada via JS injetado no navegador (marcando o nó do dialog com
`data-qa-id="contribution-dialog-instance"` assim que abre):

1. Clique em "Registrar aporte" → `<div role="dialog" id="radix-_R_12plba_" data-state="open">`
   aparece com conteúdo "Register new contribution / TICKER" (passo 1, campo de busca).
2. Ticker escolhido (via evento simulando o `onPick` do `TickerSearchField`) → o **mesmo nó**
   (`id="radix-_R_12plba_"`, `data-qa-id` ainda presente, `data-state` continua `"open"`) passou a
   conter "Register new contribution — AAPL / TICKER / AAPL / Trocar / Type / Buy... / Save" —
   ou seja, campo de ticker travado + `TransactionFormFields` no mesmo elemento de dialog, sem
   fechar/reabrir.
3. Clique em "Trocar" → mesmo nó (`id="radix-_R_12plba_"`, `data-state="open"`) volta ao conteúdo
   do passo 1 ("TICKER" sem os campos de transação) — confirma que trocar de ticker não fecha o
   `Dialog`.
4. Reescolhido o ticker, preenchidos Quantity=5 e Price per share=200 (via clique real +
   digitação nos inputs, não via JS), clique em "Save" → `data-state` do dialog passou para
   `"closed"` e a posição AAPL na tabela foi atualizada de 10 para 15 cotas (persistida no
   `localStorage` de guest), confirmando que o Save realmente grava a transação e fecha o modal.
5. Estado de teste revertido: removida a transação de teste (`+5 AAPL @ US$200`) do
   `localStorage` e a posição voltou a 10 cotas — nenhum dado real de produção foi alterado (guest
   mode, sem sessão autenticada).

## Arquivos alterados

- `src/routes/app/index.tsx` — removido botão duplicado, estado e instância redundante do dialog.
- `src/components/ceiling/watchlist/TransactionForm.tsx` — agora só provê o `Dialog` em torno de
  `TransactionFormFields`.
- `src/components/ceiling/watchlist/TransactionFormFields.tsx` (novo) — campos do formulário
  extraídos, sem `Dialog` próprio.
- `src/components/horizonte/NewContributionDialog.tsx` — reescrito para um único `Dialog`
  persistente com transição de passo 1 (busca) para passo 2 (formulário) internamente.
