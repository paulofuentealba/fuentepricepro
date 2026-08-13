# RESULTADO — 82 — Migrar Editar e Evento Corporativo para My Position

## Resumo

As telas completas "Update Holdings" e "Apply Corporate Event" foram migradas dos modais
(`EditItemDialog.tsx`, `CorporateEventModal.tsx`) para dentro da aba "My Position" do
`AssetDetailSheet.tsx`, como 2 seções recolhíveis (`Collapsible`) logo após `AssetHoldings`.
Toda a lógica de cálculo, patch e criação de transação sintética foi preservada 1:1.

## Arquivos criados

- `src/components/ceiling/watchlist/EditPositionFields.tsx` — conteúdo de "Update Holdings"
  extraído de `EditItemDialog.tsx`, sem `Dialog`. Self-contained: chama `useWatchlist()` (update)
  e `useTransactions()` diretamente, em vez de depender de um `onSave` do componente pai — a
  reconciliação patch↔transação sintética (antes em `Watchlist.tsx: handleDialogSave`) foi
  movida para dentro deste componente, mesmo padrão de auto-suficiência já usado por
  `CorporateEventModal`.
- `src/components/portfolio/CorporateEventFields.tsx` — conteúdo de "Apply Corporate Event"
  extraído de `CorporateEventModal.tsx`, sem `Dialog`. Mantém 100% do cálculo de `factor`
  (split/grouping) e a criação idempotente da transação `corporate_action` (`id: corp-<eventId>`).
- `src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx` (3 testes)
- `src/components/portfolio/__tests__/CorporateEventFields.test.tsx` (3 testes)
- `src/components/ceiling/watchlist/assetCard/__tests__/AssetCardHeader.test.tsx` (3 testes)

## Arquivos removidos

- `src/components/ceiling/watchlist/EditItemDialog.tsx`
- `src/components/portfolio/CorporateEventModal.tsx`

(Único caller de cada um era, respectivamente, `WatchlistDialogs.tsx` e `AssetCard.tsx` — não
havia outro ponto de entrada, confirmado via grep antes da remoção.)

## Arquivos alterados

- `src/components/ceiling/watchlist/AssetDetailSheet.tsx` — importa `EditPositionFields` e
  `CorporateEventFields`; adiciona `MyPositionSection` (wrapper `Collapsible`) e renderiza as
  2 seções na `TabsContent value="myPosition"`, logo após `AssetHoldings`. Nova prop
  `initialTab?: "myPosition"` força a aba a abrir em "My Position" (via `key` no `Tabs` para
  reset de `defaultValue`). Passa a chamar `usePendingEvents(item)` internamente.
- `src/components/ceiling/watchlist/WatchlistDialogs.tsx` — removida a renderização de
  `EditItemDialog` e as props `editing`/`onSave`/`onCloseDialog`; adicionada `detailInitialTab`
  repassada ao `AssetDetailSheet`.
- `src/components/ceiling/Watchlist.tsx` — removido todo o estado/lógica de `editing` e o bloco
  `handleDialogSave` (a lógica migrou para `EditPositionFields.tsx`); `handleOpenDetail` agora
  aceita um segundo argumento opcional `initialTab`.
- `src/components/ceiling/watchlist/WatchlistAssetGrid.tsx` e `WatchlistActionsContext.tsx` —
  removida a prop/valor `onEdit` (órfã); `onOpenDetail` agora aceita `initialTab?`.
- `src/components/shared/AssetCard.tsx` — removida a prop `onEdit`, o estado `isCorpEventOpen` e
  a renderização de `CorporateEventModal`; `onCorporateEvent` (usado só pelo badge) agora chama
  `onOpenDetail(item, "myPosition")`.
- `src/components/ceiling/watchlist/assetCard/AssetCardHeader.tsx` — removidos os itens de menu
  "Editar" (`Pencil`) e "Evento Corporativo" (`Scissors`); prop `onEdit` removida da interface.
  O badge "pending event" (linha ~158) continua existindo e chamando `onCorporateEvent()`.
- `docs/SSOT.md` — nova entrada na Seção 9 (Aprendizados-chave) documentando a nova arquitetura.

## Decisão: seção inicial do badge "pending event"

Implementado o caminho intermediário, mais simples que threading de um parâmetro dedicado por
4 camadas de props/contexto, mas sem abrir mão da UX: `onOpenDetail` ganhou um segundo argumento
opcional `initialTab?: "myPosition"`. O clique no badge chama `onOpenDetail(item, "myPosition")`,
que abre o sheet direto na aba certa. Dentro do sheet, como `AssetDetailSheet` já calcula
`pendingEvent` via `usePendingEvents(item)` para exibir a seção, a seção "Evento Corporativo"
usa `defaultOpen={initialTab === "myPosition" && !!pendingEvent}` — ou seja, quando a origem é o
badge **e** existe de fato um evento pendente, a seção já abre expandida, sem precisar de um
prop adicional `initialMyPositionSection` nem de mudanças no `WatchlistActionsContext`. Um clique
"Editar" comum (agora inexistente — ver abaixo) ou o clique normal no card continuam abrindo a
seção "Editar Posição" (default aberta) e "Evento Corporativo" fechada.
**Justificativa**: o dado que decide se a seção deve abrir expandida (existe evento pendente?) já
é recalculado dentro do próprio `AssetDetailSheet`; não havia necessidade de duplicá-lo como um
terceiro parâmetro de prop drilling.

## `onEdit` removido por completo

Como a única função do "Editar" do menu ⋯ era abrir o modal `EditItemDialog`, e essa tela agora
vive sempre dentro do sheet (seção "Editar Posição", aberta por padrão), a prop `onEdit` deixou
de ter qualquer consumidor e foi removida de `AssetCardHeader`, `AssetCard`, `WatchlistAssetGrid`,
`WatchlistActionsContext` e `Watchlist.tsx` (junto com o estado `editing` e `handleEdit`).

## Nota — protótipo HTML ausente

O prompt original menciona um protótipo HTML anexo (`prototipo_my_position_v2.html`) para
orientar o layout das seções. Esse arquivo não estava disponível neste ambiente (apenas o texto
do prompt). O layout das 2 seções seguiu o padrão visual já existente no `AssetDetailSheet`
(cards com `border-border/60`, `bg-muted/20`, etc.) e o `Collapsible` do shadcn/radix já presente
em `src/components/ui/collapsible.tsx`.

## Nota — screenshots

Ambiente não-interativo, sem browser real disponível para captura de tela da aba "My Position"
nem do menu ⋯ pós-migração. Cobertura garantida via testes automatizados (ver abaixo) em vez de
evidência visual.

## Testes

9 testes novos, cobrindo os 4 cenários pedidos:
- **(a)** `EditPositionFields.test.tsx`: gera patch + transação `buy` sintética corretamente ao
  editar posição sem transações prévias; trava campos quando já há transações; rejeita
  quantidade inválida sem persistir.
- **(b)** `CorporateEventFields.test.tsx`: calcula `factor` correto para split e grouping; cria
  transação `corporate_action` idempotente (`id: corp-<eventId>`) quando há ledger; não cria
  transação quando não há ledger.
- **(c)** `AssetCardHeader.test.tsx`: confirma que o menu ⋯ não tem mais "Editar"/"Evento
  Corporativo" (só Compartilhar/Compartilhar Imagem/Remover).
- **(d)** `AssetCardHeader.test.tsx`: confirma que o badge "pending event" continua aparecendo
  quando há evento detectado e chama `onCorporateEvent` ao ser clicado, e que não aparece quando
  não há evento.

O teste de regressão pré-existente em `src/lib/__tests__/transactions.test.ts`
(`processManualEdit`) é uma reimplementação local da lógica pura de reconciliação e não importa
`EditItemDialog` — não precisou de alteração.

## Verificação

- `npx tsc --noEmit` — **0 erros**.
- `npm run test` — **316 passed | 4 skipped** (45 arquivos passaram, 1 skip pré-existente, sem
  novas falhas).
- `npm run build` — **build limpo** (client + server), sem erros. Avisos de chunk size
  pré-existentes (>500kB) não relacionados a esta mudança.
