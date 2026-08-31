Prompt 139 — Calculo de ganho de capital realizado por venda [Item 2.1b — fundacao]

CONTEXTO
Primeiro item genuinamente greenfield da Fase 2 — nenhum SSOT existe hoje
para adaptar (diferente do Prompt 138, que consumiu netAfterTax/
dividendTaxRate já prontos). Confirmado agora, direto no código:

1. getAssetPnL (src/lib/selectors/assetPnL.ts) calcula ganho/perda NÃO
   REALIZADO — preço atual vs. custo médio da posição ABERTA. Não serve
   para ganho de capital tributável, que é sobre o EVENTO de venda.
2. recalculateHoldingFromTransactions (transactionsLogic.ts) só decrementa
   quantidade numa venda — não guarda o custo médio NO MOMENTO daquela
   venda específica, nem calcula o ganho da operação.
3. Transaction (transactionsLogic.ts) tem ticker mas NÃO tem
   type: AssetType — o tipo do ativo (ação vs. FII) precisa vir de fora
   (cruzado com WatchlistItem), porque é a transação sozinha nunca vai
   saber se é ação ou FII.

Por isso este prompt tem escopo DELIBERADAMENTE LIMITADO: constrói só o
cálculo puro de ganho realizado por venda, sem ainda aplicar isenção de
R$ 20 mil nem compensação de prejuízo (isso é o próximo prompt, 2.1c) e
sem ainda tratar a regra de FII (que é diferente — FII não tem isenção
de R$ 20 mil, é tributado a 20% flat sobre qualquer valor de venda,
regra própria, prompt futuro separado). Empilhar as três coisas num só
prompt tornaria impossível isolar erro de cálculo de erro de regra —
mesma disciplina já aplicada no AskEngine.

TAREFA

1. src/lib/tax/br/capitalGains.ts

   Função pura calculateRealizedGains(transactions: Transaction[],
   assetType: AssetType): RealizedGainEvent[]

   Para CADA transação type:'sell', calcula:
   - o custo médio ponderado da posição IMEDIATAMENTE ANTES daquela venda
     (replay cronológico das transações anteriores, mesmo padrão de
     recalculateHoldingFromTransactions, mas capturando o averagePrice a
     cada passo, não só o valor final)
   - proceeds = tx.pricePerShare * tx.quantity - (tx.fees || 0)
   - costBasis = averagePriceAtSaleTime * tx.quantity
   - gain = proceeds - costBasis (pode ser negativo = prejuízo)

   Retornar um array de RealizedGainEvent (tipo novo, ver item 2), um por
   venda, na ordem cronológica das transações.

2. src/lib/tax/types.ts — adicionar
   export interface RealizedGainEvent {
     ticker: string;
     saleDate: number; // timestamp, mesmo formato de Transaction.date
     quantity: number;
     salePrice: number;
     proceeds: number;
     costBasis: number;
     gain: number; // proceeds - costBasis; negativo = prejuízo
   }
   (ajustar nomes se o plano encontrar convenção melhor, mas não duplicar
   campos que já existem em outro tipo do módulo fiscal sem necessidade)

REQUISITOS INEGOCIÁVEIS
1. Função PURA. Recebe transactions + assetType, devolve array. Sem I/O,
   sem Firestore, sem depender de estado externo.
2. O replay cronológico do custo médio segue EXATAMENTE a mesma lógica de
   ponderação de recalculateHoldingFromTransactions (compra soma
   quantidade e pondera preço com fees incluídos; corporate_action ajusta
   proporcionalmente) — não inventar uma segunda fórmula de custo médio
   ponderado. Se possível, refatorar para reusar um passo intermediário
   comum em vez de duplicar o loop — reportar no plano se for viável sem
   quebrar a função existente.
3. Transações fora de ordem cronológica no array de entrada são ordenadas
   internamente por date antes do replay — não assumir que a entrada já
   vem ordenada.
4. corporate_action (split/agrupamento) É considerado no replay do custo
   médio (ajusta quantidade e preço proporcionalmente, mesma regra já
   documentada em recalculateHoldingFromTransactions) — não ignorar essas
   transações, elas afetam o custo médio de vendas posteriores.
5. Este prompt NÃO aplica isenção de R$ 20 mil, NÃO agrupa por mês, NÃO
   compensa prejuízo entre operações, NÃO decide se o ganho gera DARF.
   Só calcula o ganho/prejuízo bruto de cada venda. A trilha de decisão
   fiscal vem depois, prompt separado, sobre esta fundação.
6. FII não é tratado neste prompt — a função aceita assetType como
   parâmetro, mas a regra de isenção específica de ações (item 2.1c) só
   se aplica quando assetType indica ação; FII fica para prompt futuro
   dedicado à sua regra própria (20% flat, sem isenção). Não implementar
   nenhuma das duas regras aqui — só o cálculo de gain bruto, que é
   idêntico na fórmula para os dois tipos (a diferença está em como o
   gain é tributado depois, não em como é calculado).

INVESTIGAR ANTES (Regra 7)
1. Confirmar se dá para refatorar recalculateHoldingFromTransactions para
   expor um passo intermediário reusável (ex.: uma função que processa
   uma transação e retorna o novo {quantity, averagePrice} dado o estado
   anterior), sem alterar o comportamento nem a assinatura pública da
   função existente — ela é usada em vários lugares (NewContributionDialog,
   TransactionsPanel, useValuedPortfolio) e não pode quebrar.
2. Se a refatoração do item 1 não for segura sem risco de regressão,
   reportar e propor: replicar o MESMO algoritmo em calculateRealizedGains
   com comentário explícito apontando a duplicação intencional e por que
   (ex.: "mesma lógica de recalculateHoldingFromTransactions linha X,
   duplicada aqui porque aquela função não expõe estado intermediário
   sem risco de regressão — revisitar se popular").
3. Confirmar o formato exato de Transaction.date (timestamp em ms? outro
   formato?) para garantir que RealizedGainEvent.saleDate seja consistente.
Apresentar plano com essas respostas ANTES de codar (Regra 8).

TESTES OBRIGATÓRIOS
- Compra única seguida de venda parcial: gain calculado corretamente
  contra o custo médio da compra
- Múltiplas compras a preços diferentes seguidas de venda: custo médio
  ponderado correto no momento da venda (não a média simples, a
  ponderada por quantidade)
- Venda com prejuízo: gain negativo, sem tratamento especial (só o
  número correto — a compensação é do próximo prompt)
- corporate_action (split) entre compra e venda: custo médio ajustado
  proporcionalmente antes do cálculo do gain
- Transações fora de ordem na entrada: resultado idêntico ao array já
  ordenado
- Múltiplas vendas do mesmo ticker: cada RealizedGainEvent usa o custo
  médio correto NO MOMENTO daquela venda específica, não um valor fixo
  repetido
- Nenhuma venda no histórico: array vazio, sem erro
- Pureza: mesma entrada, mesma saída em 2 execuções

PROIBIDO
- Aplicar isenção de R$ 20 mil ou qualquer lógica de compensação de
  prejuízo neste prompt
- Implementar a regra de FII (20% flat)
- Duplicar a fórmula de custo médio ponderado sem investigar reuso
  primeiro (item 1 da investigação)
- Assumir que o array de transações de entrada já vem ordenado
- I/O dentro de calculateRealizedGains

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-solution-architect | SIM | decide reuso vs. duplicação do algoritmo de custo médio |
| fuente-architecture-review | SIM | gate contra regressão em recalculateHoldingFromTransactions |
| fuente-investidor-profissional | SIM | precisão do cálculo de custo médio no tempo é o cerne do item |
| fuente-advogado-lgpd-gdpr | SIM | fundação de cálculo que alimentará simulação tributária real |
| fuente-product-manager | SIM | escopo estritamente limitado ao cálculo bruto, sem regra de isenção |
| fuente-ux-designer | NÃO | sem UI nesta etapa |
| fuente-investidor-iniciante | NÃO | sem superfície visível |
| fuente-business-architect | NÃO | capacidade já modelada na Fase 2 |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(tax): calculo puro de ganho de capital realizado por venda [Item 2.1b]

---

Envie o plano com as 3 respostas do "Investigar Antes" antes de codar. Em
especial quero ver a decisão sobre reusar ou duplicar a lógica de custo
médio ponderado — se duplicar, quero o comentário explícito apontando
para onde está o original, não uma duplicação silenciosa que pode
divergir com o tempo.
