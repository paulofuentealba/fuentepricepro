### 31 — Cash Flow: investidor com histórico parcial (começou no meio do ano) ✅ CONCLUÍDO E CONFIRMADO (gating por addedAt aplicado nos 3 pontos certos, mapeamento calendarMonth/.find() verificado, desacoplamento dos cards de resumo confirmado, i18n completo, teste de regressão do dividendo fantasma conferido)

Problema levantado pelo usuário após a 29.1/29.6: o Cash Flow sempre
mostra Jan-Dez do ano corrente, mesmo que o investidor só tenha começado
a investir em junho, por exemplo. Discovery de mercado completo feito
(Snowball Analytics, StatusInvest, Investidor10) antes de propor solução.

**Bug real encontrado durante o discovery** (não é só questão de UX):
`paidAmount` real (da 29.1) soma eventos de dividendo da API multiplicados
pela quantidade ATUAL do ativo, sem checar se o usuário já tinha aquele
ativo na data do evento. `WatchlistItem.addedAt` existe mas não é usado
nesse cálculo hoje — resultado: dividendo "fantasma" pode aparecer como
recebido em meses anteriores ao usuário sequer ter comprado o ativo.

**Benchmark de mercado (30/07/2026):**
- **Snowball Analytics**: tem um modo nomeado "Assets History" que faz
  exatamente o backtesting de quantidade atual constante (mesmo
  princípio do `quantityNote` já usado na 29.1) — confirma que essa
  aproximação é padrão reconhecido de mercado, não gambiarra.
- **StatusInvest**: fórmula de rentabilidade escala a janela pela data
  real de entrada do ativo ("se o ativo tem menos de 2 anos na carteira,
  será com base na data que ele iniciou") — valida o gating por data de
  início como abordagem correta, não só trava calendário fixo.
- **Investidor10**: quando não sabe a data real de compra (limite do
  histórico da B3, pré-nov/2019), assume uma data de corte padrão
  (01/11/2019) de forma explícita e documentável pro usuário — mesmo
  princípio do `addedAt` como fronteira honesta quando não há dado
  exato.
- **Síntese**: nenhuma das 3 ferramentas (nem a paga internacional, nem
  as 2 líderes do mercado BR) consegue precisão total sem histórico de
  transação completo. Todas usam a melhor data disponível como
  fronteira e são honestas sobre a limitação — valida a estrutura de 3
  camadas abaixo como alinhada ao que os líderes de mercado fazem, não
  uma solução de segunda linha.

**Proposta em 3 camadas:**

**Camada 1 (implementável agora, sem dado novo) — Gating por `addedAt`:**
- Corrigir o bug: eventos de dividendo usados no cálculo de `paidAmount`
  não podem ter `paymentDate` anterior ao `addedAt` daquele ativo
  específico.
- Dois modos de visualização: "Ano Calendário" (o que já existe, útil
  pro futuro módulo de IRPF) e "Minha Jornada" (novo, modo padrão pra
  carteira nova — gráfico começa no menor `addedAt` da carteira, sem
  meses "mortos" no início).
- Marco visual de início no gráfico (🌱 ou linha vertical sutil)
  marcando onde a jornada começa, em vez de só esconder meses.

**Camada 2 (próximo passo natural, usa infra que já existe) — Data de
transação via nota importada:**
O `b3Parser.ts` (Tarefa 17.2) já importa nota de corretagem em PDF — a
data de negociação de cada operação está no documento, só não é
capturada pra esse propósito hoje. Capturar isso trocaria `addedAt`
("quando cliquei em adicionar no app") por uma data real de compra, sem
precisar esperar o módulo de transações completo.

**Camada 3 (futuro, é o próprio 29.3/IRPF) — Histórico de transação
completo:**
Precisão total (compras/vendas parciais ao longo do tempo), equivalente
ao que Sharesight/Snowball pago oferecem. Já mapeado como sensível no
`BACKLOG_V2` (módulo de IRPF), não precisa resolver agora.

**Discovery de mercado (30/07/2026)** — achado que simplifica o design:
Sharesight (padrão internacional) rastreia "parcelas" de compra 
separadas, com métodos de alocação de venda configuráveis (FIFO, etc). 
No Brasil isso NÃO se aplica — a Receita Federal exige preço médio 
ponderado sobre um "estoque único", sem escolha de qual lote vender. 
Venda NÃO muda o preço médio, só reduz quantidade; compra recalcula o 
médio: `novoPM = ((PM_atual × qtd_atual) + (preço × qtd_nova)) / 
(qtd_atual + qtd_nova)`. Isso torna o modelo de dado bem mais simples que 
o padrão internacional — só um livro-razão de eventos, sem rastreamento 
de lote/estado individual.

Dividido em 3 prompts sequenciais, cada um testável isoladamente:

---

**PROMPT PRONTO — 34 (Camada 3, parte 1/3: schema + persistência)** ✅ CONCLUÍDO E CONFIRMADO (firestore.rules aninhado corretamente, recalculateHoldingFromTransactions com fórmula de fees verificada manualmente, 5 testes cobrindo os 4 cenários pedidos, cashflow.test.ts corrigido pra investingSince)

```
34 — Camada 3 (1/3): Schema de transações + persistência + cálculo de 
preço médio

Contexto: hoje averagePrice e quantity em WatchlistItem são digitados 
manualmente pelo usuário, sem histórico de como chegaram nesses números. 
Isso causa duas distõrcões já identificadas: (1) o Cash Flow assume 
quantidade constante desde sempre (Tarefas 29-33), inflando/subestimando 
proventos passados quando a posição mudou ao longo do tempo; (2) preço 
médio digitado à mao é sujeito a erro humano.

Regra brasileira (Receita Federal, confirmada via pesquisa): preço médio 
ponderado sobre estoque único. Venda NÃO muda o preço médio, só reduz 
quantidade. Compra recalcula: novoPM = ((PM_atual × qtd_atual) + 
(preço × qtd_nova)) / (qtd_atual + qtd_nova).

TAREFA (só fundação de dado nesta parte — SEM UI ainda, isso é o 
prompt 35):

1. Novo tipo Transaction (sugestão de local: src/lib/transactions.ts, 
   arquivo novo, espelhando a estrutura de src/lib/watchlist.ts):
   
   interface Transaction {
     id: string;
     ticker: string;
     type: "buy" | "sell";
     date: number; // timestamp
     quantity: number;
     pricePerShare: number;
     fees?: number | null; // corretagem/taxas, a Receita manda incluir no custo
   }

2. Função pura recalculateHoldingFromTransactions(transactions: 
   Transaction[]): { quantity: number; averagePrice: number } — processa 
   em ordem cronológica (ordenar por date antes de processar, não 
   assumir que já vem ordenado), aplicando a regra brasileira acima. 
   Função pura, sem side-effect, fácil de testar isoladamente — escrever 
   também um teste unitário cobrindo: só compras, compra+venda 
   (confirmar que venda não muda o PM), venda de tudo (quantity=0), 
   compra após zerar a posição.

3. Função auxiliar getQuantityAtDate(transactions: Transaction[], date: 
   number): number — retorna a quantidade que o usuário tinha numa data 
   específica do passado (soma compras, subtrai vendas, até aquela 
   data). Vai ser usada no prompt 36 pro Cash Flow, mas a função em si 
   entra aqui junto do resto da lógica de transação.

4. Persistência, espelhando exatamente o padrão já usado em 
   src/lib/watchlist.ts (readLocal/writeLocal pro modo local, 
   rowToItem/itemToRow pro Firestore, hook useTransactions com 
   upsert/remove/list):
   - Firestore: nova subcoleção users/{userId}/transactions/{id} (não 
     aninhar dentro de assets/{assetId} — mantém simples de consultar 
     "todas as transações do usuário" e "todas de um ticker" via campo 
     ticker)
   - localStorage: nova chave, ex: "ceilingPricePro.transactions.v1", 
     mesmo padrão de guest mode do watchlist.ts
   - Respeitar USE_LOCAL_ONLY (mesma flag já usada em watchlist.ts)
   - Adicionar regra no firestore.rules pra 
     users/{userId}/transactions/{transactionId}, mesmo padrão de posse 
     por auth.uid já usado pra users/{userId}/assets

NÃO TOCAR:
- WatchlistItem.quantity e averagePrice NÃO mudam de comportamento 
  ainda — continuam editáveis manualmente como hoje. A ligação entre 
  transações e esses campos é escopo do prompt 36, não deste.
- Nenhuma UI nova — só tipo, funções puras, persistência e o hook. 
  Ninguém consegue ainda lançar uma transação pela interface depois 
  desta tarefa, e está correto que seja assim.
- Não mexer no Cash Flow (cashflow.ts) nesta parte.

CRITÉRIO DE SUCESSO: recalculateHoldingFromTransactions com testes 
unitários passando pros 4 cenários listados; useTransactions funcionando 
em modo local (CRUD via console/teste manual, já que não há UI ainda); 
firestore.rules cobrindo a nova subcoleção; tsc limpo, testes passando.
```

---

**PROMPT PRONTO — 35 (Camada 3, parte 2/3: UI de lançamento)** ✅ CONCLUÍDO E CONFIRMADO (após 2 rodadas de correção: dict.es.ts recebeu o bloco transactions que faltava, textos hardcoded "quotas"/"/ share" viraram chaves i18n, mensagem de confirmação de exclusão corrigida e comentário de rascunho removido)

```
35 — Camada 3 (2/3): UI pra lançar e ver histórico de transações

Contexto: a Tarefa 34 já criou o tipo Transaction, a persistência 
(useTransactions) e a função recalculateHoldingFromTransactions — mas 
nada disso é acessível pela interface ainda. Esta tarefa constrói a UI.

TAREFA:

1. Local natural: dentro do AssetDetailSheet (o painel que já abre ao 
   clicar num ativo da Watchlist), adicionar uma nova seção "Histórico 
   de Transações" (ou aba, se o sheet já tiver abas — confirmar a 
   estrutura atual do componente antes de decidir).
2. Lista das transações daquele ticker (useTransactions filtrado por 
   ticker), ordenada por data decrescente, com editar/excluir por linha.
3. Botão "+ Lançar transação" abrindo um form pequeno: tipo (Compra/
   Venda), data (usar o padrão Calendar+Popover já estabelecido na 
   Tarefa 32 — confirmar se o FixedIncomeWizardSheet ou o form da 32 já 
   tem esse componente pronto pra reaproveitar), quantidade, preço por 
   ação/cota, taxas (opcional).
4. Mostrar, ao lado da lista, o preço médio e quantidade JÁ CALCULADOS 
   (usando recalculateHoldingFromTransactions em tempo real conforme o 
   usuário adiciona/edita/remove transações) — só exibir por enquanto, 
   ainda NÃO sincronizar com o WatchlistItem.averagePrice/quantity de 
   verdade (isso é o prompt 36).
5. Validação: não deixar registrar uma venda de quantidade maior do que 
   a posição disponível naquele momento (calcular via 
   getQuantityAtDate na data da venda sendo lançada).
6. i18n nos 3 dicionários pra todos os textos novos.

NÃO TOCAR:
- Ainda não sincronizar quantity/averagePrice do WatchlistItem com o 
  resultado das transações — os dois continuam independentes por 
  enquanto (o usuário vê os dois números, mas só um é "oficial" ainda: 
  o editado manualmente). Ligar isso de vez é o prompt 36.
- Não mexer no Cash Flow.

CRITÉRIO DE SUCESSO: consigo abrir o detalhe de um ativo, lançar 
compras e vendas, ver a lista com editar/excluir, e ver o preço 
médio/quantidade calculados em tempo real batendo com 
recalculateHoldingFromTransactions. Validação de venda a descoberto 
funcionando. tsc limpo, testes passando, confirmado ao vivo no 
navegador.
```

---

**PROMPT PRONTO — 36 (Camada 3, parte 3/3: religar no Cash Flow)** ✅ CONCLUÍDO E CONFIRMADO (filtro por ticker verificado, invested intocado corretamente, received usando getQuantityAtDate, update() sincronizando Watchlist, readonly no EditItemDialog, teste de quantidade dinâmica conferido manualmente — Camada 3 completa: 34→35→36)

---