Prompt 134 — Estrategias de reinvestimento [Item 1.2] — REVISADO pos-133

CONTEXTO
Três estratégias puras para a pergunta "reinvisto onde?", plugadas na
arquitetura do AskEngine que já existe e está no ar desde o commit 7fd89fc.
Referência visual: protótipo v6, tela Reinvestir (3 abas de estratégia:
"Acelerar bola de neve", "Corrigir desvio", "Reforçar quem pagou").

IMPORTANTE — a arquitetura mudou desde o desenho original deste prompt.
Antes de codar, revise estes 4 fatos já CONFIRMADOS no código real:

1. O contrato de Strategy MUDOU (correção feita no Prompt 133). Cada
   estratégia agora implementa:
     run: (ctx: AskStrategyContext) => StrategyCandidate[]
   recebendo eligiblePositions JÁ FILTRADAS pelo applyExclusions.ts
   centralizado — a estratégia NÃO filtra exclusão, NÃO calcula amountBRL,
   NÃO calcula leftover, NÃO calcula percentOfTotal. Isso é feito uma vez
   só, no engine.ts, para as 4 estratégias (a de referência do 133 + as
   3 deste prompt). Só devolve StrategyCandidate[] com suggestedQuantity
   OU allocatedAmount + reasonKey.

2. correctDrift NÃO é uma estratégia nova — é o MESMO algoritmo de
   balanceTargets.ts do Prompt 133, já implementado e testado. Não
   reimplementar. A tarefa aqui é expor a MESMA função (runBalanceTargets)
   sob um novo objeto Strategy com id/labelKey próprios do contexto
   "Reinvestir" (ex.: id: "correctDrift", labelKey:
   "askEngine.strategies.correctDrift"), sem duplicar a lógica de deficit
   de classe. Se o texto do label precisar ser diferente entre a tela de
   Reinvestir e uma futura tela de Aporte, isso é resolvido no labelKey,
   não copiando código.

3. pos.valuation.dividendYield JÁ EXISTE, calculado dentro de
   getAssetValuation (calculations.ts linha ~554), usando o dividendo
   LÍQUIDO de imposto (netAvgDividend). accelerateSnowball deve usar ESSE
   campo para rankear por yield — NUNCA recalcular
   annualDividend/livePrice manualmente. Recalcular na mão ignora o
   desconto de imposto que o SSOT já aplica e pode gerar ranking errado
   (ex.: um ativo US com yield bruto maior mas líquido menor apareceria
   like melhor por engano).

4. reinforcePayer precisa saber QUAL ticker pagou o provento que está
   sendo reinvestido — essa informação não existe em AskContext hoje
   (positions, availableAmount, settings, asOf). É necessário estender
   AskStrategyContext (e AskContext) com um campo OPCIONAL
   sourceTicker?: string, usado só por esta estratégia — as outras
   ignoram. Não é informação genérica de todas as perguntas (Plano de
   Aporte não tem "quem pagou"), então tem que ser opcional, não
   obrigatório no contrato geral.

INVESTIGAR ANTES (Regra 7)
1. Confirmar a assinatura exata de runBalanceTargets exportada em
   strategies/balanceTargets.ts (é exportada separada do objeto
   balanceTargetsStrategy? Confirmar antes de reusar).
2. Confirmar o shape completo de ValuationResult.dividendYield — já
   vem líquido de todos os impostos aplicáveis (BR e US) ou só de
   alguns? Reportar antes de usar como critério de ranking, para não
   comparar ativos em bases diferentes sem perceber.
3. Propor onde adicionar sourceTicker?: string em types.ts (AskContext
   e AskStrategyContext) sem quebrar as chamadas existentes de
   runAsk/balanceTargets do Prompt 133 (campo opcional, default
   undefined, backward-compatible).
Apresentar plano com essas respostas ANTES de codar (Regra 8).

TAREFA (após aprovação do plano)

1. strategies/accelerateSnowball.ts — "Acelerar bola de neve"
   Pura. Recebe eligiblePositions (já sem acima-do-teto/yield-trap, se o
   usuário tiver esses critérios ligados). Ordena por
   pos.valuation.dividendYield decrescente. Aloca cotas inteiras
   priorizando os de maior yield até esgotar availableAmount, mesma
   lógica de orçamento por prioridade que balanceTargets já usa (loop
   sequencial gastando o remaining budget). reasonKey:
   "askEngine.reasons.highestNetYield" com reasonParams incluindo o
   yield formatado.

2. strategies/correctDrift.ts
   NÃO reimplementa. Reexporta runBalanceTargets sob um novo objeto:
     export const correctDriftStrategy: Strategy = {
       id: "correctDrift",
       labelKey: "askEngine.strategies.correctDrift",
       requiresTargets: true,
       run: runBalanceTargets,
     };
   (ajustar o nome exato de import conforme a resposta da investigação 1)

3. strategies/reinforcePayer.ts — "Reforçar quem pagou"
   Pura. Usa ctx.sourceTicker (novo campo opcional). Se sourceTicker não
   vier no contexto, retorna [] (candidato vazio, sem crashar — é erro de
   integração da tela, não da estratégia). Se vier: localiza a posição
   correspondente em eligiblePositions.
   - Se a posição NÃO estiver em eligiblePositions (foi excluída por
     estar acima do teto ou por yield-trap — applyExclusions já rodou
     antes), retorna [] com um Consequence adicional (não um Allocation)
     explicando por que não reforçou — usar reasonKey:
     "askEngine.reasons.payerExcluded", SEM fallback silencioso para
     outro ativo (exigência já estabelecida na primeira versão deste
     prompt, mantida).
   - Se estiver elegível: aloca o máximo de cotas inteiras dela dentro de
     availableAmount. reasonKey: "askEngine.reasons.reinforcePayer".

REQUISITOS INEGOCIÁVEIS (herdados do 133, reafirmados aqui)
1. Funções puras, sem I/O.
2. Nenhuma das três chama getAssetValuation, resolveTargetYield, nem
   filtra exclusão por conta própria — isso já aconteceu antes de
   strategy.run ser chamada.
3. reasonKey + reasonParams estruturados, tom de cálculo (compatível com
   disclaimer 'calculation'), nunca linguagem de recomendação.
4. Quantidade inteira; o engine.ts já limita ao orçamento disponível como
   rede de segurança — mas a estratégia deve tentar ficar dentro do
   orçamento por conta própria também (não depender só do cap do engine).
5. Determinismo: empate resolvido por ticker alfabético, mesmo padrão do
   balanceTargets.

TESTES OBRIGATÓRIOS
- accelerateSnowball: ranking usa dividendYield (não recalcula na mão) —
  teste com dois ativos onde o yield líquido inverteria o ranking do
  yield bruto, provando que o campo certo foi usado.
- accelerateSnowball: respeita exclusões (não seleciona ativo que não
  está em eligiblePositions).
- correctDrift: produz exatamente o mesmo resultado que chamar
  runBalanceTargets diretamente com o mesmo input (prova de não-duplicação
  — mesmo objeto de função, não uma cópia).
- reinforcePayer: sourceTicker ausente -> [] sem erro.
- reinforcePayer: sourceTicker de ativo excluído -> [] + explicação, sem
  fallback para outro ativo.
- reinforcePayer: sourceTicker elegível -> aloca corretamente dentro do
  orçamento.
- as três: nenhuma quantidade fracionária, determinismo em empate.

PROIBIDO
- I/O dentro das estratégias
- Recalcular yield, valuation ou exclusão dentro de qualquer das 3
  estratégias
- Duplicar a lógica de balanceTargets em correctDrift
- Fallback silencioso em reinforcePayer quando o pagador está excluído
- Tornar sourceTicker obrigatório no contrato geral do AskContext
  (quebraria as perguntas que não têm essa noção)
- Texto hardcoded

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-investidor-profissional | SIM | valida se dividendYield líquido é a base certa de ranking |
| fuente-solution-architect | SIM | extensão do contrato (sourceTicker) sem quebrar o existente |
| fuente-architecture-review | SIM | gate contra duplicação (correctDrift) e contra recálculo fora do SSOT |
| fuente-advogado-lgpd-gdpr | SIM | confirma que reasonKeys não viram recomendação |
| fuente-product-manager | SIM | escopo das três estratégias e da UX de "pagador excluído" |
| fuente-investidor-iniciante | NÃO | sem UI nesta etapa |
| fuente-ux-designer | NÃO | sem UI nesta etapa |
| fuente-business-architect | NÃO | capacidade já modelada no 133 |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(ask-engine): tres estrategias de reinvestimento reusando arquitetura do nucleo [Item 1.2]

---

Envie o plano com as 3 respostas do "Investigar Antes" antes de codar. Em
especial quero ver a confirmação de que dividendYield é mesmo líquido de
imposto nos dois mercados (BR e US) — se for líquido só de um lado, isso
precisa virar um requisito explícito de normalização antes do ranking, não
uma surpresa depois.
