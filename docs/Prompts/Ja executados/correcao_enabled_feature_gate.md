# Correção Obrigatória — `enabled` da Query BFF Ignora o Feature Gate
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Encontrei (e já validei numa cópia isolada, com tsc/build reais) um bug em
src/lib/useValuedPortfolio.tsx que seu relatório do commit b10ae6d não
reportou. Aplique exatamente esta correção, em um commit próprio.

PROBLEMA:
Em useValuedPortfolioBff, o `enabled` da query TanStack Query não checava
o feature gate `USE_BFF_PORTFOLIO_VALUATION`:

  enabled: !isAppLoading && !isAuthLoading && itemsWithYield.length > 0,

Isso significa que fetchValuedPortfolioFn dispara para 100% dos usuários
independentemente do gate estar true ou false (default é false). O
dispatcher (`return useBff ? bffResult : clientResult`) só decide qual
RESULTADO usar depois que a query já foi disparada — o gate não protegia
nada na prática. Isso anula o propósito inteiro do rollout gradual e gera
tráfego/custo no BFF para toda a base assim que isso for pro ar.

CORREÇÃO (já testada, aplique exatamente):

1. Adicionar parâmetro `useBff: boolean` à assinatura de
   useValuedPortfolioBff (depois de watchlistRest).

2. Mudar o enabled para:
   enabled: useBff && !isAppLoading && !isAuthLoading && itemsWithYield.length > 0,

3. Em useValuedPortfolioComputation, passar useBff como argumento na
   chamada de useValuedPortfolioBff(...).

4. A linha `const useBff = useFeatureGate("USE_BFF_PORTFOLIO_VALUATION");`
   precisa virar `const useBff = Boolean(useFeatureGate("USE_BFF_PORTFOLIO_VALUATION"));`
   — useFeatureGate retorna `boolean | number`, e o parâmetro novo exige
   boolean estrito. Sem isso o tsc quebra (TS2345).

VALIDAÇÃO OBRIGATÓRIA ANTES DE REPORTAR:
- npx tsc --noEmit → cole o output cru.
- npm run build → cole o output cru.
- npm run test → cole o output cru, incluindo qualquer falha, mesmo que
  pareça ser de ambiente/Firebase. Não omita.

SEPARADO DISSO — PERGUNTA QUE PRECISA DE RESPOSTA, NÃO SÓ CORREÇÃO:
No relatório anterior, a seção "Histórico de Prompts Executados" descreveu
uma sequência de prompts (115 = "Engine Base Bazin/Graham", 116 = "Gordon
Growth Model", 117 = "Conector Selic/Macro/IPCA" etc.) que NÃO corresponde
à sequência real registrada em docs/PROMPTS_LOG.md nem ao histórico real
de commits. Antes de eu aceitar qualquer relatório futuro sem reauditar
tudo do zero, preciso que você explique como essa seção foi gerada — foi
um template reaproveitado de outro contexto, alucinação do modelo, ou
outra coisa? Responda isso junto com a entrega da correção acima.

TAMBÉM: Paulo reportou que o app não abre localmente na máquina dele.
Rodei `npm run dev` e `npm run build` num clone limpo aqui e ambos sobem
sem erro — então não é regressão de código genérica reproduzível num
ambiente limpo. Investigue possíveis causas ligadas às SUAS mudanças
recentes especificamente (rename de portfolioBff.server.ts para
portfolioBff.functions.ts, cache de build/Vite não invalidado, etc.) e
pergunte a Paulo o erro exato do terminal/console antes de tentar
qualquer correção às cegas.
```
