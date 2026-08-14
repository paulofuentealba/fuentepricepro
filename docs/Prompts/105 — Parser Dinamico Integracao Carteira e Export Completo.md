# PROMPT 105 — Parser Dinâmico: Integração com Carteira + Export Completo Unificado
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Fase 3 de 3. PRÉ-REQUISITO: Prompts 103 e 104 aprovados e mergeados.
> Este prompt também resolve o Item 3 pendente do Prompt 98 (Export CSV),
> conforme decisão tomada em conversa com Paulo — export e import
> compartilham o mesmo dicionário de cabeçalhos canônicos.

---

## Contexto e Decisão de Produto (já tomada, não reabrir)

Paulo definiu explicitamente: **"o que nós vamos exportar, nós
controlamos, o que vamos receber não. Nosso template pode e deve
seguir o formato que facilita a nossa ingestão. Mas para quem envia, o
sistema tem que ser inteligente para identificar e não colocar na mão
do usuário este trabalho."**

Tradução em arquitetura:
- **Export** (Opção B do Prompt 98, item 3) = gerar CSV com os
  cabeçalhos **canônicos** definidos em `COLUMN_SEMANTIC_ALIASES`
  (Prompt 103) — o primeiro alias de cada categoria, que é por
  definição o formato que bate na camada de correspondência EXATA do
  parser, sem precisar de heurística nenhuma.
- **Import** = o motor dinâmico completo (Prompts 103/104) já
  reconhece esse export de volta como caso trivial, e QUALQUER outro
  arquivo de terceiro via heurística.
- Não são dois formatos concorrentes — um pipeline único.

## Tarefas

### 1. Integração real do import com a carteira
- Conectar `DynamicImportModal.tsx` (Prompt 104) com
  `useTransactions`/`useWatchlist`: ao final do processamento bem
  sucedido, persistir de fato as transações reconhecidas.
- **Atenção direta ao bug do Prompt 99** (escrita prematura no
  Firestore): este fluxo de import processa múltiplas linhas em
  sequência — garantir que a gravação só acontece depois que o usuário
  confirma o resumo final (ex: botão "Confirmar Importação" no Estado
  4 do modal), não automaticamente assim que o Worker termina de
  processar. O parse pode terminar sem que o usuário necessariamente
  queira aplicar o resultado (pode ter percebido um mapeamento errado
  no preview e querer cancelar).
- Para cada transação confirmada, reaproveitar exatamente a mesma
  lógica de persistência já usada em `NewContributionDialog.tsx`
  (`upsertTransaction` + `recalculateHoldingFromTransactions` +
  `upsertWatchlistItem` com o resultado recalculado) — não duplicar
  essa lógica (Regra 1), extrair para uma função compartilhada se
  ainda não for uma (`src/lib/transactionPersistence.ts` ou
  equivalente) já que agora tem 2 pontos de chamada.
- Ativos novos (que ainda não existem na watchlist) devem ser criados
  seguindo o mesmo padrão de `buildWatchlistItem` já usado no resto do
  projeto.
- Tratar falha parcial: se a gravação de uma transação específica
  falhar no meio do lote (ex: erro de rede), reportar claramente quais
  linhas foram persistidas com sucesso e quais não, sem deixar o
  usuário sem saber o estado real da carteira depois de um import
  parcialmente falho.

### 2. Export Completo (`buildWatchlistFullCsv`) — resolve Item 3 do Prompt 98
- Criar `buildWatchlistFullCsv(items: WatchlistItem[]): string` em
  `src/lib/csv.ts`, usando os cabeçalhos canônicos de
  `COLUMN_SEMANTIC_ALIASES` (Ticker, Tipo, Quantidade, Preço, Taxas,
  Data — mais os campos adicionais que não fazem parte do parser de
  transação, ex: Setor, Meta Mensal, Data Início, listados no Prompt
  98 original).
- **Não alterar `buildWatchlistCsv`** (as 4 colunas originais) — ele
  continua existindo como está, é o formato "rápido" que
  `useWatchlistCsvImport.ts` já sabe ler (par simétrico antigo,
  preservado). O novo export completo é uma função adicional, não uma
  substituição.
- Adicionar botão/opção na UI de Minha Carteira para o novo export
  completo, distinto visualmente do export rápido existente (ex: menu
  dropdown com "Exportar rápido" vs. "Exportar tudo", ou dois botões
  claramente rotulados — não deixar ambíguo qual gera o quê).
- Exportar TODAS as transações (não só a posição consolidada) — o
  discovery original do Prompt 97 apontava isso como falha ("nenhuma
  transação é exportada"); decidir se isso vai num único CSV
  (posições + histórico de transações misturados, com uma coluna
  indicando o tipo de linha) ou em 2 arquivos separados — propor a
  abordagem e justificar antes de implementar, não presumir.

### 3. Teste de round-trip completo
- Teste de integração: gerar `buildWatchlistFullCsv()` de uma carteira
  de teste, alimentar esse CSV de volta no `dynamicCsvParser.ts`
  (Prompt 103), confirmar que os dados batem exatamente (nenhuma
  perda de precisão numérica, nenhuma data mal interpretada, nenhum
  ticker não reconhecido) — esta é a prova de que "export e import são
  um pipeline único", não teoria solta.

## Gate de Saída
- `npx tsc --noEmit`, `npx vitest run` (incluindo o teste de
  round-trip da tarefa 3 e o teste de falha parcial da tarefa 1),
  `npm run build`.
- Teste manual completo: importar um arquivo de terceiro (fixture do
  Prompt 103) do início ao fim, confirmar que as posições aparecem
  corretas em Minha Carteira. Exportar via "Exportar tudo", reimportar
  esse mesmo arquivo, confirmar que o resultado é idêntico ao original
  (round-trip visual, não só em teste automatizado).
- Confirmar que `buildWatchlistCsv` (formato antigo de 4 colunas) e
  `useWatchlistCsvImport.ts` continuam funcionando sem alteração —
  não pode haver regressão no fluxo existente.

## Proibido
- Não remover ou alterar o comportamento de `buildWatchlistCsv`/
  `useWatchlistCsvImport.ts` — ambos continuam existindo em paralelo
  ao novo fluxo completo, não são substituídos nesta rodada.
- Não persistir nada automaticamente ao final do parsing sem
  confirmação explícita do usuário no resumo (ver tarefa 1 — risco
  direto de reintroduzir o espírito do bug do Prompt 99 num fluxo
  novo).
- Não decidir sozinho entre "1 arquivo misto" vs "2 arquivos
  separados" para o export completo com histórico de transações —
  propor e aguardar confirmação.
