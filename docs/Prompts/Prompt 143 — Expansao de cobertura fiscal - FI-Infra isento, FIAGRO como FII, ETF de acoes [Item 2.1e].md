Prompt 143 — Expansao de cobertura fiscal: FI-Infra isento, FIAGRO como FII, ETF de acoes [Item 2.1e]

CONTEXTO
Os Prompts 140 e 141 excluíram deliberadamente FII_INFRA, FIAGRO e ETF do
cálculo de ganho de capital, marcando as três exclusões como "pendente de
revisão jurídica humana" por prudência. Pesquisa dedicada (múltiplas fontes
independentes, incluindo regulamento de fundo real registrado na CVM) elevou
a confiança sobre duas delas de "incerto" para "regra bem estabelecida" — a
terceira (ETF) tem regra clara para a subcategoria mais comum (ações), com
uma subcategoria à parte (renda fixa) que continua fora de escopo.

Este prompt NÃO é uma correção de bug — é expansão de cobertura sobre uma
fundação que já está correta e testada (Prompts 139-141). O padrão
arquitetural (função pura por categoria, trilha de carryforward isolada,
unclassifiedTickers nunca assumido por padrão) se mantém sem alteração.

BASE FACTUAL DA MUDANÇA DE CONFIANÇA — cite as fontes no comentário do
código, não apenas a conclusão

1. FII_INFRA — de "pendente" para "implementar com confiança normal"
   Fonte mais forte: regulamento de fundo real submetido à CVM (não
   conteúdo de blog), citando a Lei 12.431/2011 textualmente: "foi
   reduzida para 0% (zero por cento) a alíquota do imposto de renda
   incidente sobre os rendimentos, inclusive ganho de capital auferido na
   alienação de cotas... auferidos por pessoa física, em decorrência da
   titularidade de cotas de fundos de investimento que atendam aos
   requisitos estabelecidos na referida lei." Múltiplas fontes de mercado
   independentes confirmam de forma consistente, incluindo comparação
   explícita com FII: "diferente dos FIIs, cujo lucro realizado com a
   valorização das cotas é taxado em 20%". CONCLUSÃO: FII_INFRA é isento
   de IR tanto no rendimento (já implementado) quanto no ganho de capital
   (a implementar agora) — alíquota 0%, sem exceção conhecida.

2. FIAGRO — de "pendente" para "implementar como equiparado a FII"
   A leitura de mercado dominante (corretoras, plataformas de IR) trata
   FIAGRO sob o mesmo regime de FII para pessoa física: rendimento
   isento (já implementado), ganho de capital a 20% flat sem isenção de
   volume. Não encontrada nenhuma fonte discordando dessa equiparação
   para a estrutura de fundo padrão (FIAGRO-FII, negociado em bolsa).
   CONCLUSÃO: tratar FIAGRO com a MESMA função/trilha de FII — não como
   categoria própria.

3. ETF de ações — de "pendente" para "implementar como ação SEM isenção de
   volume"
   Múltiplas fontes convergentes e específicas: alíquota de 15% sobre
   ganho de capital em operações comuns, MESMA alíquota de ação; mas
   "diferentemente do que ocorre com a venda de ações no mercado à vista"
   NÃO existe a isenção de R$ 20.000/mês para ETF. Compensação de
   prejuízo: tratada separadamente de ações na prática de declaração
   (ficha própria na DIRPF) — CONCLUSÃO: trilha de carryforward PRÓPRIA
   de ETF, não compartilhada com STOCK_BR.
   RESSALVA que PERMANECE como limite declarado: ETF DE RENDA FIXA segue
   a Instrução Normativa 1.585/2015 (tabela regressiva de renda fixa),
   regra INTEIRAMENTE DIFERENTE. Este prompt cobre apenas ETF de renda
   variável (ações) — distinguir os dois é responsabilidade do
   assetTypeByTicker/investigação, ver abaixo.

REVISÃO MULTISSKILL OBRIGATÓRIA ANTES DO PLANO — Regra 9, todas as
9 skills do projeto devem ser explicitamente consultadas nesta ordem,
cada uma registrando concordância ou objeção por escrito no plano final:

1. fuente-investidor-profissional — validar que a leitura das 3 regras
   acima corresponde ao que um profissional de mercado (analista,
   assessor) consideraria correto e defensável, não uma simplificação
   perigosa. Validar especificamente a trilha de carryforward separada
   de ETF vs. ação.
2. fuente-advogado-lgpd-gdpr — mesmo papel que já exerceu nos Prompts
   137, 140, 141: decidir se a nova confiança (fontes de mercado +
   regulamento CVM real, mas SEM parecer jurídico formal) já é
   suficiente para remover a marcação "pendente de revisão jurídica" do
   código para FII_INFRA e FIAGRO, ou se a marcação deve ser mantida
   mas com tom mais brando ("consistente com a prática de mercado,
   parecer jurídico formal recomendado antes de uso em produção sem
   disclaimer"). Este papel decide o texto exato do comentário no
   código E do disclaimer na UI (Prompt 142, seção de Limites
   Declarados) — os 2 itens correspondentes devem ser REMOVIDOS ou
   REESCRITOS de acordo com esta decisão, não deixados desatualizados.
3. fuente-solution-architect — validar a decisão arquitetural: ETF como
   terceira função pura (calculateEtfCapitalGainsTax) com trilha própria
   de carryforward, seguindo exatamente o mesmo padrão de
   calculateFiiCapitalGainsTax; FIAGRO reusando a MESMA função de FII
   (não uma quarta função) via extensão do filtro de resolvedType.
4. fuente-architecture-review — gate final contra duplicação de lógica
   entre as 3 funções de ganho de capital (ações/FII+FIAGRO/ETF) — se
   houver mais de ~10 linhas idênticas entre elas além da estrutura de
   loop já compartilhada, propor extração de helper comum ANTES de
   prosseguir, não depois.
5. fuente-investidor-iniciante — validar que a UI (Prompt 142, seção de
   Limites Declarados) atualizada não fica mais confusa para quem não
   entende a diferença entre "ETF de ações" e "ETF de renda fixa" — a
   linguagem da ressalva precisa ser compreensível sem jargão.
6. fuente-product-manager — confirmar que esta expansão não deveria
   também disparar reabertura do Prompt 138 (módulo de RENDIMENTO, não
   ganho de capital) — investigar se FII_INFRA e FIAGRO já recebem
   rendimento isento corretamente lá, ou se há lacuna similar não
   percebida antes de fechar este prompt.
7. fuente-ux-designer — as tabelas mensais de FII (Prompt 142) hoje têm
   colunas diferentes das de ações (sem coluna "Isento" — correto, FII
   nunca é isento). Se ETF ganhar trilha própria, decidir se merece
   tabela própria na tela ou se é agregado à tabela de FII/ações por
   ora — não criar uma terceira tabela sem necessidade clara.
8. fuente-business-architect — confirmar que nenhuma destas mudanças
   afeta o posicionamento competitivo já validado (nenhum concorrente
   cobre isso) — é reforço do moat, não mudança de direção.
9. fuente-product-marketing — NÃO acionado nesta etapa (sem comunicação
   externa).

Cada skill deve produzir 1-3 frases de concordância ou objeção no plano
final — objeção de qualquer uma delas pausa a implementação daquele
ponto específico até resolução, não do prompt inteiro.

TAREFA (após o plano com as 8 validações acima)

1. src/lib/tax/br/fiiCapitalGains.ts
   - Estender o filtro de resolvedType para incluir "FIAGRO" junto de
     "FII" na MESMA trilha (mesma função, mesmo carryforward — FIAGRO e
     FII compartilham a trilha, conforme decisão de arquitetura acima).
   - Atualizar o comentário de bloqueio no topo do arquivo — remover ou
     reescrever a linha 2 (FIAGRO) conforme decisão da skill
     fuente-advogado-lgpd-gdpr.
   - NÃO alterar a alíquota (continua 20% flat) nem a ausência de
     isenção de volume — essas regras já são as corretas para FIAGRO.

2. src/lib/tax/br/fiInfraCapitalGains.ts (novo arquivo)
   - Função pura calculateFiInfraCapitalGainsTax(events, priorLossCarryforward,
     assetTypeByTicker): MonthlyFiInfraCapitalGainsResult[]
   - Filtra estritamente resolvedType === "FII_INFRA".
   - Alíquota: 0% — taxDue é SEMPRE 0, independentemente do ganho.
   - Decisão a registrar no plano: como um ativo 100% isento ainda assim
     precisa de carryforward? Resposta esperada: NÃO precisa — não há
     imposto a compensar. lossCarryforwardUsed e lossCarryforwardRemaining
     devem existir no shape por consistência com os outros dois módulos,
     mas sempre 0 (documentar por que, não deixar como campo morto sem
     explicação).
   - Reusar getEventAssetType de ../utils (mesmo padrão dos outros 2
     módulos) — não duplicar.

3. src/lib/tax/br/etfCapitalGains.ts (novo arquivo)
   - Função pura calculateEtfCapitalGainsTax(events, priorLossCarryforward,
     assetTypeByTicker): MonthlyEtfCapitalGainsResult[]
   - Filtra estritamente resolvedType === "ETF".
   - Alíquota: 15% (BR_STOCK_CAPITAL_GAINS_RATE — REUSAR a constante já
     exportada de monthlyExemption.ts, não duplicar o número 0.15).
   - SEM checagem de isenção de R$ 20 mil — todo ganho positivo em ETF é
     potencialmente tributável, independentemente do volume vendido
     (mesmo padrão estrutural de calculateFiiCapitalGainsTax, que também
     não tem isenção de volume — usar como referência de estrutura, não
     de alíquota).
   - Trilha de carryforward PRÓPRIA (nunca somada com ações nem com
     FII/FIAGRO).
   - INVESTIGAR ANTES: confirmar como distinguir ETF de ações de ETF de
     renda fixa nos dados hoje disponíveis (WatchlistItem.type distingue
     os dois, ou ambos caem em "ETF" genérico?). Se não houver distinção
     hoje, este módulo deve processar TODOS os "ETF" como se fossem de
     ações (a leitura conservadora — subestimaria isenção de ETF de
     renda fixa que porventura existisse na carteira do usuário, o que é
     o erro mais seguro dos dois lados possíveis) e a limitação deve
     ficar registrada explicitamente como próximo limite declarado.

4. src/lib/tax/types.ts — adicionar
   MonthlyFiInfraCapitalGainsResult e MonthlyEtfCapitalGainsResult,
   seguindo exatamente o shape de MonthlyFiiCapitalGainsResult (copiar
   estrutura de campos, não inventar shape novo).

5. src/lib/tax/br/index.ts e src/lib/tax/index.ts — exportar as 2 novas
   funções e os 2 novos tipos.

6. src/lib/tax/buildTaxContext.ts — estender TaxRealityContext com
   fiInfraCapitalGainsResults e etfCapitalGainsResults (arrays mensais,
   mesmo padrão de stockMonthly/fiiMonthly já usado na tela), chamando
   as 2 novas funções.

7. src/components/tax/TaxRealityScreen.tsx — conforme decisão da skill
   fuente-ux-designer (item 7 acima): adicionar os KPIs/tabelas
   correspondentes, e ATUALIZAR a seção "Limites Declarados" removendo
   ou reescrevendo os itens de FII_INFRA e FIAGRO (que deixam de ser
   limite, viram capacidade), mantendo APENAS a ressalva de ETF de
   renda fixa como novo limite declarado explícito.

8. Dicionários (ptBR, en, es) — atualizar os textos de Limites
   Declarados nos 3 idiomas de forma coerente entre si (mesmo conteúdo
   semântico, tradução real).

REQUISITOS INEGOCIÁVEIS
1. As 3 funções continuam PURAS — sem I/O, mesmo padrão de todo o
   módulo fiscal.
2. Nenhuma reimplementação: getEventAssetType e BR_STOCK_CAPITAL_GAINS_RATE
   são reusados, não duplicados.
3. Ticker sem tipo resolvível continua excluído e reportado em
   unclassifiedTickers em TODAS as 3 funções (o padrão corrigido no
   Prompt 140 se propaga aqui sem exceção).
4. As 3 trilhas de carryforward (ações, FII+FIAGRO, ETF, FII_INFRA sem
   carryforward real) NUNCA se misturam entre si.
5. Toda alteração de comentário "pendente de revisão jurídica" no código
   e na UI segue estritamente a decisão da skill
   fuente-advogado-lgpd-gdpr — não decidir isso na implementação sem a
   validação explícita no plano.

TESTES OBRIGATÓRIOS
- FII_INFRA: qualquer ganho, taxDue sempre 0 (testar com ganho grande,
  ex.: R$ 50.000, provando que NÃO é aplicada alíquota nenhuma mesmo em
  valor alto — o erro mais fácil de cometer aqui seria esquecer de
  zerar taxDue em algum branch copiado de FII).
- FIAGRO: mesmo resultado que um FII de mesmo valor processado pela
  mesma função (prova de que está na trilha certa) — teste comparando
  ambos com os mesmos números.
- ETF: 15% sobre ganho, SEM checagem de R$ 20 mil (replicar o teste que
  já existe para FII provando ausência de teto, adaptado para 15% em
  vez de 20%).
- ETF: trilha de carryforward isolada de STOCK_BR — teste cruzado
  chamando calculateMonthlyCapitalGainsTax e calculateEtfCapitalGainsTax
  com os mesmos eventos brutos, confirmando que os carryforwards não se
  contaminam (mesmo padrão de teste já usado no Prompt 141 para FII vs.
  ações).
- Ticker sem tipo resolvível em qualquer uma das 3: excluído e
  reportado, nunca assumido.
- As 3 funções: pureza (mesma entrada, mesma saída em 2 execuções).

PROIBIDO
- Aplicar isenção de R$ 20 mil a ETF ou FIAGRO/FII_INFRA
- Aplicar alíquota diferente de 0% a FII_INFRA em qualquer branch
- Misturar carryforward de ETF com o de ações ou de FII
- Duplicar BR_STOCK_CAPITAL_GAINS_RATE, BR_FII_CAPITAL_GAINS_RATE ou
  getEventAssetType
- Remover a marcação de "limite declarado" de ETF de renda fixa sem
  investigação que prove distinção de dado disponível
- Prosseguir com a implementação sem as 8 validações de skill
  registradas por escrito no plano

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

COMMIT
feat(tax): expande cobertura para FI-Infra isento, FIAGRO como FII e ETF de acoes sem isencao de volume [Item 2.1e]

---

Envie primeiro o plano com as 8 validações de skill e as 2 respostas de
investigação (distinção ETF ações/renda fixa nos dados; decisão de
carryforward morto em FII_INFRA) — sem código antes disso. A validação
da fuente-advogado-lgpd-gdpr sobre remover ou não a marcação de
"pendente de revisão jurídica" é a que mais me importa: quero ver o
texto final proposto para o comentário do código e para a UI, não só
"aprovado" ou "rejeitado".
