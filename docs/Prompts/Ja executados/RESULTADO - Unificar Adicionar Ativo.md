# Resultado — Unificar "Adicionar Ativo" no Padrão de Tela Única

Prompt de origem: `docs/Prompts/prompt_unificar_adicionar_ativo.md`

## Resumo

As opções "Adicionar Renda Variável" e "Adicionar Renda Fixa" do dropdown
"+ Adicionar Ativo" da Watchlist agora seguem o mesmo padrão de `Dialog`
único, tudo visível numa tela só, já validado no `NewContributionDialog.tsx`
("Registrar Aporte"). "Importar Nota de Corretagem" e "Trazer meu arquivo"
não foram tocadas (fora de escopo, já eram 1 passo só).

## Parte 1 — "Adicionar Renda Variável" reaproveita `NewContributionDialog`

- `Watchlist.tsx`: adicionado `const [showNewContribution, setShowNewContribution] = useState(false)`
  e renderizado `<NewContributionDialog open={showNewContribution} onOpenChange={setShowNewContribution} />`
  — **instância própria**, separada da usada no dashboard/home (ver decisão
  abaixo).
- `AddAssetDropdown.tsx`: prop `onNavigateToScreener` renomeada para
  `onOpenNewContribution` — reflete a ação real (abrir modal, não mais
  navegar).
- `WatchlistToolbar.tsx`: prop repassada `onNavigateToScreener` renomeada
  para `onOpenNewContribution`, propagada ao `AddAssetDropdown`.
- Os dois pontos em `Watchlist.tsx` que chamavam
  `navigate({ to: "/app/screener" })` (estado vazio da watchlist e toolbar)
  agora chamam `setShowNewContribution(true)`. `useNavigate` removido do
  arquivo por não ser mais usado.
- Nenhuma mudança em `NewContributionDialog.tsx` — já suporta ticker novo
  (chama `buildWatchlistItem` quando o ticker não existe na carteira),
  conferido no código antes de mexer nos pontos de entrada.
- `AddToWatchlistDialog.tsx` e `AssetCard.tsx` (fluxo do Screener/Comparador)
  **não foram tocados**, conforme pedido.

## Parte 2 — "Adicionar Renda Fixa" em 1 tela única

- Criado `src/components/ceiling/watchlist/AddFixedIncomeDialog.tsx`,
  substituindo `FixedIncomeWizardSheet.tsx` (removido). Estrutura
  `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`, igual ao
  `NewContributionDialog.tsx` — não é mais `Sheet`.
- Todos os campos visíveis ao mesmo tempo: Indexador (`Select` CDI/IPCA/PRE),
  Nome do Ativo, Valor Investido, Taxa (label muda conforme o indexador
  escolhido), Data de Início, Data de Vencimento.
- Prévia do valor projetado no vencimento sempre visível, recalculada a cada
  render via `projectFixedIncomeValueAtMaturity` (mesma função, sem
  duplicar lógica) — mostra R$ 0,00 até os campos obrigatórios estarem
  preenchidos, depois atualiza reativamente.
- Botão único "Confirmar & Adicionar ao Portfólio":
  `disabled={!isComplete}`, onde `isComplete` exige nome, valor investido,
  taxa, data de início e data de vencimento preenchidos — mesmo princípio
  de UX do `disabled` em `TransactionFormFields.tsx`, sem reaproveitar o
  componente em si (campos são diferentes).
- Lógica de criação do item (`upsert` no watchlist) e da transação inicial
  (`upsertTransaction`, com o mesmo `id` determinístico `tx-{ticker}-{startTimestamp}`
  já corrigido em auditoria anterior) **copiada sem alteração** de
  `FixedIncomeWizardSheet.tsx` — nenhum recálculo do zero.
- `macroRatesQueryOptions` reaproveitada como estava.
- `WatchlistDialogs.tsx`: import trocado de `FixedIncomeWizardSheet` para
  `AddFixedIncomeDialog`; props `showFIWizard`/`onFIWizardOpenChange`
  mantidas com o mesmo nome (não fazem parte do escopo pedido de rename).

## Decisões tomadas (conforme pedido no prompt para "decidir e reportar")

1. **Estado do `NewContributionDialog` no ponto de entrada da Watchlist**:
   optei por um `useState` próprio em `Watchlist.tsx`
   (`showNewContribution`), separado da instância que já existe em
   `HorizonteHero.tsx` (home). Mais simples de implementar sem introduzir
   estado compartilhado entre componentes/rotas diferentes, e o próprio
   componente já é stateless o suficiente (reseta sozinho ao fechar) para
   isso não causar duplicação de lógica.
2. **Nome do arquivo do wizard de Renda Fixa**: renomeado para
   `AddFixedIncomeDialog.tsx`, conforme sugerido no prompt — reflete que
   não é mais um `Sheet`.

## Regras obrigatórias — conferidas

- `TransactionFormFields.tsx`, `TickerSearchField.tsx` e a lógica interna de
  `NewContributionDialog.tsx` não foram alteradas — só os pontos que abrem
  o dialog.
- `BrokerNoteUploader.tsx`/`CsvImportUploader.tsx` não foram tocados.
- Lógica de cálculo de renda fixa não duplicada — `projectFixedIncomeValueAtMaturity`
  reaproveitada tal como existia.

## Verificação (código, sem testes de tela)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erros |
| `npm run test` | ✅ 237 passed, 4 skipped (237/241) |
| `npm run build` | ✅ build limpo |

## Testes na tela que precisam ser feitos manualmente

1. Abrir o dropdown "+ Adicionar Ativo" na Watchlist → confirmar que as 4
   opções continuam aparecendo normalmente (Renda Variável, Renda Fixa,
   Importar Nota, Trazer meu arquivo).
2. Clicar "Adicionar Renda Variável" → confirmar que **abre um modal** (não
   navega mais para `/app/screener`), buscar um ticker, preencher e salvar
   uma transação, e confirmar que o ativo aparece na Watchlist.
3. Clicar "Adicionar Renda Fixa" → confirmar que abre um `Dialog` (não mais
   painel lateral) com todos os campos visíveis de uma vez; preencher
   Indexador/Nome/Valor/Taxa/Datas e conferir que o valor projetado no
   vencimento atualiza em tempo real conforme os campos são preenchidos;
   salvar e confirmar que o ativo de renda fixa aparece corretamente na
   Watchlist com o mesmo resultado de antes.
4. Testar com a Watchlist vazia (estado inicial "sem ativos") → confirmar
   que o dropdown ali também abre os modais corretos (mesmo componente
   `AddAssetDropdown`, ponto de entrada duplicado no arquivo).
5. Abrir "Registrar Aporte" pela home (Horizonte FI) → confirmar que
   continua funcionando normalmente, sem nenhuma regressão (é uma instância
   separada da usada na Watchlist, mas o mesmo componente).
