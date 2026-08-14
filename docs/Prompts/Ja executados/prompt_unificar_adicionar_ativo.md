# Prompt para Claude Code — Unificar "Adicionar Ativo" no Padrão de Tela Única

## Contexto e diagnóstico confirmado

O dropdown "+ Adicionar Ativo" da Watchlist tem 4 opções, cada uma com uma
interação **completamente diferente**:
1. **Adicionar Renda Variável** → hoje **navega pra `/app/screener`**
   (`onNavigateToScreener` em `AddAssetDropdown.tsx`/`Watchlist.tsx`) — nem
   abre modal, sai da tela inteira.
2. **Adicionar Renda Fixa** → abre `FixedIncomeWizardSheet.tsx`, um `Sheet`
   (painel lateral) com **3 passos sequenciais** (`step: 1 | 2 | 3`).
3. **Importar Nota de Corretagem** → `Dialog` de um passo só (já ok, não
   mexer).
4. **Trazer meu arquivo** → `Dialog` de um passo só (já ok, não mexer).

Objetivo: 1 e 2 passam a seguir o mesmo padrão que já construímos e
validamos pro "Registrar Aporte" (`NewContributionDialog.tsx`) — `Dialog`
único, tudo visível numa tela só, sem navegação nem passos sequenciais.

## Parte 1 — "Adicionar Renda Variável" reaproveita `NewContributionDialog`

Essa opção e "Registrar Aporte" fazem, na prática, exatamente a mesma
coisa: escolher/buscar um ticker (novo ou já na carteira) e lançar uma
transação de compra/venda. **Não construir um componente novo** — reusar
`NewContributionDialog.tsx` como está.

1. Em `Watchlist.tsx`, adicionar estado próprio (`showNewContribution`, se
   ainda não compartilhado com o botão do dashboard — confirmar se faz
   sentido reaproveitar o mesmo estado/instância ou se cada ponto de
   entrada tem seu próprio `useState`; qualquer uma funciona, decidir pela
   mais simples e reportar).
2. `AddAssetDropdown.tsx`: trocar `onNavigateToScreener` por uma nova prop
   (ex: `onOpenNewContribution`) que abre `NewContributionDialog` em vez de
   navegar. Renomear a prop/handler de forma que o nome reflita a ação real
   (não é mais "navegar pro Screener").
3. Confirmar que `NewContributionDialog` já suporta bem o caso de ticker
   **novo** (nunca visto na carteira) — já suporta, conferir no código
   existente (`buildWatchlistItem` já é chamado quando o ticker não existe
   ainda) — não deveria precisar de mudança nenhuma no componente em si,
   só nos pontos que o abrem.
4. **Não remover** `AddToWatchlistDialog.tsx` nem `AssetCard.tsx` que ainda
   o referencia (fluxo do Screener/Comparador — different contexto, fora
   de escopo aqui) — só o botão do dropdown da Watchlist muda.

## Parte 2 — "Adicionar Renda Fixa" em 1 tela única

Reescrever a experiência de `FixedIncomeWizardSheet.tsx` (3 passos, painel
lateral) para um `Dialog` de 1 tela só, mesmo padrão visual/estrutural do
`NewContributionDialog.tsx` (`Dialog`/`DialogContent`/`DialogHeader`, não
`Sheet`).

- **Reaproveitar toda a lógica de cálculo já existente** —
  `projectFixedIncomeValueAtMaturity`, a query de `macroRatesQueryOptions`,
  a lógica de criação do item + transação inicial via `upsertTransaction`
  (já vista/corrigida em auditoria anterior desta sessão, com ID
  determinístico) — **não recalcular nada do zero**, só mudar a
  apresentação de 3 passos pra 1.
- Campos todos visíveis ao mesmo tempo: Indexador (CDI/IPCA/Pré),
  Nome do Ativo, Valor Investido, Taxa, Data de Início, Data de
  Vencimento — sem esconder nenhum atrás de "próximo passo".
- Pode manter uma prévia/resumo do valor projetado no vencimento
  (`projectFixedIncomeValueAtMaturity`) sempre visível e atualizando
  reativamente conforme os campos são preenchidos, em vez de só aparecer
  num "passo 3" — isso é uma melhoria natural de ter tudo numa tela só,
  não constitui lógica nova (a função de cálculo já existe).
- Renomear o arquivo pra refletir que não é mais um `Sheet` (ex:
  `AddFixedIncomeDialog.tsx`) — atualizar os imports em
  `AddAssetDropdown.tsx`/`Watchlist.tsx` de acordo. Reportar se preferiu
  manter o nome do arquivo por simplicidade de diff.
- Botão de submissão desabilitado até os campos obrigatórios estarem
  preenchidos (mesmo espírito do `disabled` já usado em
  `TransactionFormFields.tsx` — não precisa ser o mesmo prop/componente,
  só o mesmo princípio de UX).

## Regras obrigatórias

- Não alterar `TransactionFormFields.tsx`, `TickerSearchField.tsx`, nem a
  lógica interna de `NewContributionDialog.tsx` — só os pontos que o
  abrem.
- Não tocar em `BrokerNoteUploader.tsx`/`CsvImportUploader.tsx` — não
  fazem parte deste escopo.
- Não duplicar lógica de cálculo de renda fixa — reaproveitar
  `projectFixedIncomeValueAtMaturity` e o resto tal como já existe.
- Testar que o fluxo de renda fixa continua criando o ativo + transação
  inicial corretamente (mesmo resultado funcional de antes, só a
  apresentação muda).

## Testes obrigatórios

1. Clicar "Adicionar Renda Variável" → confirma que abre modal (não
   navega mais), busca funciona, transação salva corretamente.
2. Clicar "Adicionar Renda Fixa" → confirma que abre modal de 1 tela,
   todos os campos visíveis, cálculo de projeção reativo, salva
   corretamente com o mesmo resultado de antes.
3. Confirmar que "Registrar Aporte" (home) continua funcionando
   normalmente (mesma instância/componente reaproveitado, não deveria
   quebrar, mas testar).

## Verificação obrigatória (evidência real)

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot do dropdown "+ Adicionar Ativo" com as 4 opções
3. Screenshot do modal de Renda Variável aberto a partir do dropdown
4. Screenshot do modal de Renda Fixa em 1 tela única

## Ao terminar

Atualizar `docs/SSOT.md`. Trabalhar em `dev`.
