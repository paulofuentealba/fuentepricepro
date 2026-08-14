# PROMPT 99 (🔴 CRÍTICO) — Escrita Prematura no Firestore ao Selecionar Ticker
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## Contexto — Causa Raiz Já Confirmada

`src/components/horizonte/NewContributionDialog.tsx:50-68`. O `useEffect`
que reage a `pickedHit`/`assetResult.data` chama
`upsertWatchlistItem(draft)` (linha 66) **assim que o usuário escolhe um
ticker na busca** — antes de preencher Quantidade/Preço/Data, antes de
clicar "Save". Se o usuário fechar o modal sem salvar,
`handleDialogOpenChange` → `reset()` (linhas 74-77) só limpa estado
local (`pickedHit`, `workingItem`) — **não deleta o documento já
gravado no Firestore.** Resultado: o ativo aparece na carteira mesmo
sem nunca ter sido confirmado.

**Adicionalmente, essa escrita parece redundante mesmo no caminho
feliz**: `handleSaveTransaction` (linhas 84-95) já chama
`upsertWatchlistItem({ ...workingItem, quantity, averagePrice })`
depois de calcular a posição real via `recalculateHoldingFromTransactions`.
Ou seja, o item é gravado 2 vezes no fluxo de sucesso (uma vazia ao
selecionar o ticker, outra com o dado real ao salvar) — a primeira
escrita não parece ter propósito que a segunda não cubra.

## Tarefa

1. **Investigar antes de decidir a abordagem** (não presumir): confirmar
   se `workingItem`/`draft` sendo persistido cedo é usado por algum
   outro lugar do fluxo (ex: `TransactionFormFields` lendo do Firestore
   em vez do estado local `workingItem`, ou algum efeito colateral em
   `existingItem` que dependa do doc já existir). Se não houver
   dependência real, a correção é remover o `upsertWatchlistItem(draft)`
   da linha 66 — manter `draft` só em estado local (`setWorkingItem(draft)`),
   sem gravar nada até `handleSaveTransaction` rodar de verdade.
2. Se a investigação encontrar uma dependência real que exige o
   documento existir cedo (ex: outra tela consultando por ID antes do
   Save), a alternativa é: manter a escrita, mas adicionar um
   **rollback explícito** em `reset()`/`handleDialogOpenChange` —
   deletar o documento recém-criado se `workingItem.quantity === 0` e o
   modal for fechado sem `handleSaveTransaction` ter rodado. Só usar
   esta alternativa se a Opção 1 (não escrever cedo) for comprovadamente
   inviável — reportar por que antes de implementar.
3. Aplicar o mesmo raciocínio ao componente irmão citado no comentário
   do código (`AddToWatchlistDialog.tsx`, mencionado como "mesma lógica
   de criação de ativo reusada") — verificar se ele tem o mesmo padrão
   de escrita prematura e, se tiver, corrigir com a mesma abordagem
   escolhida aqui, não deixar uma segunda instância do bug sobrevivendo
   em componente irmão.
4. Auditar se existem watchlist items órfãos já gravados em produção por
   causa deste bug (usuários reais que abriram o modal, escolheram um
   ticker, e fecharam sem salvar) — script de leitura (não escrita)
   que lista `quantity === 0 && averagePrice === null` nos últimos N
   dias, para Paulo avaliar se vale limpar manualmente. Não deletar
   nada automaticamente.

## Gate de Saída

- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Teste manual **obrigatório e específico**: abrir o modal, buscar um
  ticker, selecioná-lo, **fechar o modal sem preencher nada** (X ou
  clique fora). Recarregar a página / navegar para Minha Carteira.
  Confirmar que o ativo **NÃO aparece**. Repetir o teste no fluxo
  irmão (`AddToWatchlistDialog.tsx`) se ele também foi tocado.
- Teste manual do caminho feliz: escolher ticker, preencher tudo,
  salvar — confirmar que a posição aparece corretamente (sem
  duplicação de escrita, se a redundância da tarefa 1 for eliminada).
- Reportar quantos itens órfãos foram encontrados na auditoria de
  produção (tarefa 4), sem apagar nenhum.

## Proibido

- Não deletar nenhum documento em produção automaticamente — só listar.
- Não introduzir uma segunda forma de "rascunho local" que duplique
  `workingItem` — a correção deve ter uma única fonte de verdade para
  o estado do modal antes do Save.
