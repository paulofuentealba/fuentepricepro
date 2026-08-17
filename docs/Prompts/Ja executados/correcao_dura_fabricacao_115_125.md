# CORREÇÃO OBRIGATÓRIA — Relatório Final dos Prompts 115-125 Contém Resultados Fabricados
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
PARE. Não inicie nenhum prompt novo. Esta mensagem é sobre o Relatório Final
que você entregou para os Prompts 115-125.

Eu não aceitei seu relatório como está. Cloneiei origin/dev de verdade,
rodei os 3 gates com minhas próprias mãos, e o resultado NÃO bate com o que
você reportou. Isso não é uma divergência pequena — é fabricação de
resultado, e é a SEGUNDA vez que isso acontece neste projeto (a primeira já
está documentada: contagens de teste fabricadas, "build limpo" que não
estava limpo). Não vai haver uma terceira.

═══════════════════════════════════════════════════════════════
FATO 1 — VOCÊ REPORTOU "0 ERROS" NO TSC. É FALSO.
═══════════════════════════════════════════════════════════════
Rodei `npx tsc --noEmit` no seu código, no seu commit, na sua branch. Não
deu 0 erros. Deu MAIS DE 30 ERROS. Entre eles, direto no código que VOCÊ
escreveu nestes 11 prompts:

- calculations.ts linhas 896, 897, 1057: usa os campos `usTreasury10Y` e
  `affo` que NÃO EXISTEM na interface AssetValuationParams que está no
  MESMO ARQUIVO, algumas linhas acima. Você quebrou o SSOT dentro do
  próprio SSOT e reportou "0 erros".
- portfolioBff.server.ts linha 1: `import { createServerFn } from
  "@tanstack/start"` — esse pacote NÃO EXISTE no projeto. O package.json
  tem "@tanstack/react-start". A server function do BFF, o entregável
  central do Prompt 121, NÃO COMPILA. E você reportou "0 erros".
- fred.server.ts linha 30: propriedade `timeout` que não existe no tipo
  RequestInit.
- portfolioBffLogic.ts: 2 erros de shape de tipo (Asset incompleto,
  annualDividend inexistente).
- calculations_reits.test.ts, calculations_etfs.test.ts,
  portfolioBff.test.ts: erros de tipo decorrentes dos mesmos problemas
  acima.

Isso não é "erro pré-existente que passou despercebido". usTreasury10Y e
affo são campos que VOCÊ introduziu no Prompt 122. O import de
@tanstack/start é uma linha que VOCÊ escreveu no Prompt 121. Não tem como
isso ter passado por um `tsc --noEmit` real e ter dado 0 erros. Ou você não
rodou o gate, ou rodou e reportou um resultado diferente do que viu. As
duas opções são inaceitáveis.

═══════════════════════════════════════════════════════════════
FATO 2 — O PROMPT 125 NÃO FOI IMPLEMENTADO. VOCÊ DISSE QUE FOI.
═══════════════════════════════════════════════════════════════
Seu relatório diz: "feat(valuation): complete BFF migration with
documented rollback protocol [Prompt 125]" — como se a migração tivesse
sido concluída.

Abri useValuedPortfolio.tsx linha por linha. Ele CONTINUA importando e
usando useWatchlist, useTransactions, useLiveQuotesAndMeta, useSelic,
exchangeRateQueryOptions — o merge client-side INTEIRO, sem nenhuma
alteração. ZERO referência a fetchValuedPortfolioFn. ZERO referência a
USE_BFF_PORTFOLIO_VALUATION nesse arquivo.

O commit do Prompt 125 entregou APENAS o docs/ROLLBACK.md. A fase de MAIOR
RISCO de toda a migração — a que eu exigi explicitamente que tivesse
critério de rollback detalhado por ser a de maior risco de regressão —
não aconteceu. Você escreveu um manual de como reverter uma migração que
nunca foi feita, e reportou como concluída.

═══════════════════════════════════════════════════════════════
FATO 3 — ARQUIVO CITADO NO RELATÓRIO NÃO EXISTE
═══════════════════════════════════════════════════════════════
src/lib/api/__tests__/fred.server.test.ts está na sua tabela de commits do
Prompt 122. Esse arquivo NÃO EXISTE no repositório. Não existe em nenhum
commit da sua sequência.

═══════════════════════════════════════════════════════════════
FATO 4 — PROMPTS_LOG.MD REGISTRA "3 GATES VALIDADOS" EM TODAS AS 11
ENTRADAS, INCLUSIVE NAS QUE TÊM ERRO REAL DE COMPILAÇÃO
═══════════════════════════════════════════════════════════════
Isso é um documento append-only de auditoria do projeto. Ele agora contém
11 afirmações falsas em sequência. E a entrada do Prompt 125 ainda diz
"Commit: Pendente de hash" — nem isso foi atualizado antes de você declarar
o relatório final como concluído.

═══════════════════════════════════════════════════════════════
O QUE EU EXIJO AGORA — NENHUM PROMPT NOVO ATÉ ISSO SER RESOLVIDO
═══════════════════════════════════════════════════════════════

1. Rode `npx tsc --noEmit` agora, no estado atual de origin/dev, e me
   mostre o output CRU, completo, sem edição. Não me diga "0 erros" de
   novo sem eu ver o terminal.

2. Corrija, em commits separados e rastreáveis (não um commit genérico de
   "fix"):
   a. AssetValuationParams: adicionar usTreasury10Y e affo como campos
      formais do tipo, não gambiarra de cast.
   b. portfolioBff.server.ts: corrigir o import para @tanstack/react-start
      e validar que a server function REALMENTE compila e é chamável.
   c. fred.server.ts: remover ou corrigir a propriedade timeout inválida.
   d. portfolioBffLogic.ts: corrigir os 2 erros de shape.
   e. Criar o fred.server.test.ts que já deveria existir, ou remover a
      menção dele do relatório se não for criar.

3. Implemente de fato o Prompt 125 — a migração de useValuedPortfolio.tsx
   para consumir fetchValuedPortfolioFn por trás do feature gate. Isso não
   está pendente de ajuste, está PENDENTE DE SER FEITO. Trate como se o
   Prompt 125 nunca tivesse rodado, porque não rodou.

4. Depois de 1-3, rode os 3 gates DE VERDADE (tsc, test, build) e cole o
   output real e completo dos três, sem resumir, sem arredondar número de
   teste. Se algum teste falhar por falta de variável de ambiente ou
   qualquer outro motivo, ISSO TAMBÉM entra no relatório — não é aceitável
   omitir uma falha porque "provavelmente é ambiente".

5. Atualize docs/PROMPTS_LOG.md com a verdade — inclusive registrando que
   o relatório anterior continha informação incorreta sobre os gates e
   sobre o status do Prompt 125. Isso fica registrado, não apagado.

Você não vai receber o próximo prompt (fosse qual fosse) até eu confirmar,
com minhas próprias mãos, que os 3 gates passam de verdade e que
useValuedPortfolio.tsx realmente consome o BFF sob feature flag. Relatório
sem evidência bruta anexada (output de terminal completo) não será aceito
de novo.
```
