# RESULTADO — Modal "Registrar Novo Aporte" (Horizonte FI Fase 2, complemento ao Ponto 2)

## O que foi implementado

### 1. `TickerSearchField` extraído (`src/components/shared/TickerSearchField.tsx`)
Componente novo, genérico, com toda a UI/lógica de busca de ticker que antes vivia
inline em `AssetForm.tsx`: input com ícone de busca, debounce de 250ms via
`searchQueryOptions`, dropdown de sugestões, navegação por teclado (↑/↓/Enter/Escape)
e fechamento ao clicar fora. Só devolve o `SearchHit` escolhido via `onPick` — não
decide o que fazer com ele.

Para preservar o comportamento de auto-seleção que `AssetForm.tsx` já tinha (prefill
de ticker via `initialTicker`/`sessionStorage`, com auto-submit assim que as sugestões
chegam), o componente ganhou uma prop `autoPickTicker` que replica esse comportamento
de forma genérica, sem duplicar lógica de busca em dois lugares.

### 2. `AssetForm.tsx` (Screener) refatorado para consumir `TickerSearchField`
Removida a lógica de busca inline (debounce, `useQuery(searchQueryOptions(...))`,
dropdown, navegação por teclado) — tudo isso agora vem do componente compartilhado.
`AssetForm.tsx` manteve apenas: estado de `selected`/`manualType`/`editingType`, o
prefill de ticker (via `initialTicker`/`sessionStorage`) e o `onSubmit` ao escolher
um hit. Comportamento validado lado a lado (ver seção de evidência).

### 3. `buildWatchlistItem` (`src/lib/buildWatchlistItem.ts`)
Extraída a lógica de "criar `WatchlistItem` a partir de um `Asset`" (cálculo de
`ceilingPrice`/`safetyMargin` via `getAssetValuation`, dividendo anual via
`getCanonicalAnnualDividend`, etc.) que antes só existia dentro de
`AddToWatchlistDialog.tsx` (`handleSave`). Agora é uma função pura reutilizada tanto
por `AddToWatchlistDialog.tsx` quanto por `NewContributionDialog.tsx` — sem duplicar
a criação de ativo em dois lugares.

### 4. `NewContributionDialog.tsx` (`src/components/horizonte/NewContributionDialog.tsx`)

**Decisão de pasta:** ficou em `src/components/horizonte/` (não em
`src/components/ceiling/watchlist/`) porque é especificamente o modal de entrada da
home nova "Horizonte FI" — mesma convenção de `HorizonteHero.tsx` já morar ali.

**Fluxo:**
- Estado inicial: só `TickerSearchField` visível, título "Registrar novo aporte"
  (chave i18n `t.transactions.newContributionTitle`, nova nos 3 idiomas).
- Ao escolher um ticker: busca o `Asset` via `assetQueryOptions`. Se o ticker **já
  existe** na watchlist, entrega o controle inteiro para `TransactionForm.tsx`
  (mesmo componente usado para editar transação de ativo existente — reaproveitado
  sem alterações, sem recriar campos de Type/Date/Quantity/Price/Fees). Se o ticker
  **não existe**, cria o `WatchlistItem` primeiro (quantidade 0, via
  `buildWatchlistItem` — reaproveitando a mesma lógica de `AddToWatchlistDialog.tsx`)
  e então entrega o controle a `TransactionForm.tsx` do mesmo jeito.
- Ao salvar a transação, recalcula quantidade/preço médio a partir do histórico de
  transações (`recalculateHoldingFromTransactions`) e atualiza o item na watchlist —
  mesmo padrão já usado em `TransactionsPanel.tsx`.

**Decisão de título dinâmico:** o título muda para
`"Registrar novo aporte — {TICKER}"` assim que um ticker é escolhido e o asset
resolve — mas nesse ponto o modal já trocou para `TransactionForm.tsx`, cujo próprio
título (`"Add Transaction — {TICKER}"` / `"Edit Transaction — {TICKER}"`) assume o
lugar. Ou seja, na prática o usuário vê: "Registrar novo aporte" (busca) →
"Add Transaction — AAPL" (formulário). Ficou mais limpo não forçar um terceiro
título intermediário — o modal de busca já é rápido o bastante para não precisar de
feedback de título no meio da transição.

### 5. Botão "Registrar aporte" no `HorizonteHero.tsx`
Adicionado tanto no estado vazio (sem nenhum ativo — CTA principal) quanto no header
normal (canto superior direito, ao lado do capital acumulado). Abre
`NewContributionDialog`.

**Bug encontrado e corrigido durante a verificação visual:** a primeira versão
renderizava `<NewContributionDialog>` dentro de cada branch condicional
(`hasNoAssets` vs. estado normal). Como criar o primeiro ativo (passo de busca do
ticker) já faz `hasNoAssets` virar `false` **enquanto o modal ainda está aberto**, o
React desmontava a árvore inteira do branch "vazio" e montava a árvore do branch
"normal" — o que desmontava e remontava `NewContributionDialog` do zero, perdendo o
estado interno (`pickedHit`/`workingItem`) e fazendo o modal voltar para o campo de
busca em vez de avançar para o formulário de transação. Corrigido movendo o diálogo
para uma posição estável na árvore (fora do `if (hasNoAssets)`, renderizado uma única
vez ao final do componente), preservando sua identidade de elemento entre as duas
transições. Confirmado corrigido na verificação de browser abaixo (fluxo de ticker
novo terminou no `AssetCard`/dashboard atualizado corretamente).

O dropdown "+ Add Asset" da Watchlist (`AddAssetDropdown.tsx`) não foi tocado —
continua exatamente como estava.

### 6. Chaves i18n novas
`transactions.newContributionTitle` adicionada em `dict.en.ts` ("Register new
contribution"), `dict.es.ts` ("Registrar nuevo aporte") e `dict.ptBR.ts`
("Registrar novo aporte").

## Evidência de verificação (real, via browser)

Testado com `npm run dev` (Vite subiu em `http://localhost:5176` — porta 3000/5173-5175
já ocupadas) e navegação real via Claude Browser MCP. Screenshots pixel não puderam
ser capturados (compositing de tela indisponível nesta sessão), então a evidência
abaixo vem da árvore de acessibilidade (`read_page`) e do texto renderizado
(`get_page_text`), que refletem o DOM real, não uma simulação.

1. **`/app-v2` (Horizonte FI, watchlist vazia):** texto renderizado confirmou
   "Registre seu primeiro aporte para começar sua jornada" com o botão **"Registrar
   aporte"** logo abaixo. Clique nele abriu um `dialog` com heading
   **"Register new contribution"** (locale EN ativo) e o `textbox` de busca com
   placeholder "Search a ticker (e.g. SCHD, AAPL, VALE3)" — confirma a chave i18n
   nova e o campo de busca reaproveitado.

2. **Fluxo de ticker novo (AAPL, não estava na watchlist):** digitar "AAPL" no
   campo populou uma lista de 4 sugestões (AAPL34, AAPL, AAPLC, AAPLX-USD, cada uma
   com nome e badge de tipo "Stock") — confirma debounce+busca funcionando. Ao
   clicar em "AAPL", apareceu um toast "Asset saved successfully" (o
   `WatchlistItem` draft foi criado via `buildWatchlistItem`) e o dashboard mudou
   de estado vazio para "0.0%" — confirma a criação do ativo antes da transação.
   (Esse foi o fluxo que expôs o bug de remontagem do diálogo, corrigido antes da
   verificação final.)

3. **Fluxo de ticker já existente (AAPL, já na watchlist após o teste anterior):**
   reabrindo o modal via botão do header e buscando "AAPL" de novo, ao escolher o
   hit o modal **pulou direto** para `TransactionForm.tsx` — heading do dialog virou
   **"Add Transaction — AAPL"**, com os campos Type (Buy/Sell), Date, Quantity,
   Price per share e Fees, exatamente os mesmos usados para editar transação de
   ativo existente. Preenchi Quantity=10, Price=200 e cliquei "Save": o dashboard
   atualizou para "Patrimônio total R$ 15.730,31" e "Maior posição AAPL · US$
   3,049.10" — confirma que a transação foi persistida e o holding recalculado
   corretamente (10 × ~US$200 convertido, mais variação de cotação).

4. **Screener (`/app-v2/screener`, `AssetForm.tsx` pós-extração):** buscar "VALE3" e
   selecionar o resultado renderizou o card de resultado completo — tipo de ativo
   (Ação), preço atual (R$ 74,40), dividendo médio 3Y, EPS, Playground de yield
   alvo, Ceiling Price (R$ 49,24), Safety Margin (-33.82%, Overvalued), indicadores
   de mercado, histórico de dividendos e Goal Planner — ou seja, comportamento
   idêntico ao pré-refatoração (nenhuma funcionalidade do Screener quebrou com a
   extração do `TickerSearchField`).

## Verificação de build/teste

- `npx tsc --noEmit`: limpo (únicos erros restantes são pré-existentes em
  `HorizonteHero.test.tsx`, relacionados a tipos do `toBeInTheDocument`/jest-dom,
  confirmados presentes antes desta mudança via `git stash`).
- `npm run test -- --run`: **229 passed | 4 skipped** (35 arquivos de teste passando,
  1 skipped) — nenhuma regressão.
- `npm run build`: build de produção concluído sem erros.

## Arquivos tocados

- `src/components/shared/TickerSearchField.tsx` (novo)
- `src/lib/buildWatchlistItem.ts` (novo)
- `src/components/horizonte/NewContributionDialog.tsx` (novo)
- `src/components/ceiling/AssetForm.tsx` (refatorado para consumir `TickerSearchField`)
- `src/components/ceiling/AddToWatchlistDialog.tsx` (refatorado para consumir `buildWatchlistItem`)
- `src/components/horizonte/HorizonteHero.tsx` (botão "Registrar aporte" + fix de remontagem do dialog)
- `src/lib/i18n/dict.en.ts`, `dict.es.ts`, `dict.ptBR.ts` (chave `transactions.newContributionTitle`)
