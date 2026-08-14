# RESULTADO — 99 (🔴 CRÍTICO) — Escrita Prematura no Firestore ao Selecionar Ticker

## 1. Contexto e Investigação Prévia
- **Causa Raiz Confirmada**: Em `NewContributionDialog.tsx`, o hook `useEffect` disparava `upsertWatchlistItem(draft)` assim que um ticker era selecionado na busca, persistindo um documento no Firestore com `quantity: 0` e `averagePrice: null` antes de o usuário salvar a transação.
- **Investigação de Dependências**:
  - Verificado que `TransactionFormFields.tsx` opera estritamente via estado React local (`item={workingItem}`), sem efetuar leituras no Firestore.
  - Verificado que `handleSaveTransaction` já realiza o salvamento atômico da transação (`upsertTransaction`) e a atualização da posição com base no histórico recalculado (`upsertWatchlistItem({ ...workingItem, quantity, averagePrice })`).
  - Verificado o componente irmão `AddToWatchlistDialog.tsx`: já operava corretamente chamando `upsert` apenas dentro de `handleSave()` após validação manual do usuário.

## 2. Ações Realizadas
1. **Remoção da Escrita Prematura**:
   - Removido `upsertWatchlistItem(draft)` de `src/components/horizonte/NewContributionDialog.tsx`.
   - O rascunho de novo ativo permanece exclusivamente no estado local React (`setWorkingItem(draft)`) até que o botão "Salvar" seja acionado.
2. **Testes Automatizados de Regressão**:
   - Criado `src/components/horizonte/__tests__/NewContributionDialog.test.tsx` com 2 testes unitários:
     - Validação de que a seleção de ticker NÃO chama `upsertWatchlistItem`.
     - Validação de que `upsertTransaction` e `upsertWatchlistItem` são chamados apenas na submissão do formulário de aporte.
3. **Script de Auditoria em Produção**:
   - Criado `scripts/audit-orphan-watchlist-items.ts` (somente-leitura) para inspecionar e listar eventuais ativos órfãos com `quantity === 0 && averagePrice === null` no Firestore sem realizar deleções automáticas.

## 3. Gates de Verificação
- `npx tsc --noEmit`: 0 erros
- `npx vitest run src/components/horizonte/__tests__/NewContributionDialog.test.tsx`: 2 testes passando (124ms)
- Commit: `953aaa4` — `fix(transactions): prevent premature Firestore write on ticker search [Prompt 99]`
