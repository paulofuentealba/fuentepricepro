# RESULTADO — BUGFIX 1 — Horizonte FI "0.0%" com patrimônio positivo

## Sintoma reportado

Screenshot real do usuário em `/app-v2`: o card "Horizonte FI" exibia:

- Headline: **"0.0%"**
- Subtítulo: **"R$ 300.405,55 acumulados"**
- Marco logo abaixo: **"✓ Primeiros R$100 mil"** já marcado como batido

Contradição visual: se o usuário já tem R$300k acumulados e o marco de
R$100k está batido, o progresso não pode estar em 0.0%.

## Investigação

Arquivos lidos: `src/lib/useFIProgress.ts`, `src/components/horizonte/HorizonteHero.tsx`,
`src/components/ceiling/FIProgressCard.tsx`, `src/lib/useUserSettings.ts`,
`src/lib/__tests__/useFIProgress.test.ts`.

### Hipóteses descartadas

- **(a) Bug de apresentação puro (cálculo certo, exibição errada)** — descartado.
  `HorizonteHero.tsx` exibe `coveragePercent.toFixed(1)}%` diretamente, sem
  transformação. O valor exibido é exatamente o que o hook calcula.
- **(c) Fontes de dado diferentes entre milestone e coveragePercent (padrão
  já visto no Fuente Consensus)** — descartado como causa raiz, mas achado
  relevante: o milestone de R$100 mil usa `totalCapitalBRL` (soma de
  `quantity * currentPrice` da carteira, vindo de `useValuedPortfolio`), e o
  `coveragePercent` usa `monthlyIncomeBRL / monthlyCostGoal` (renda passiva
  anualizada dividida pela meta de gastos mensais). Não são a mesma fonte
  recalculada de formas diferentes — são **duas métricas conceitualmente
  distintas** (progresso de patrimônio vs. cobertura de renda), ambas
  corretas em seus próprios termos, mas exibidas juntas sem deixar isso
  claro ao usuário.

### Causa raiz confirmada — combinação de (b) e um bug de coerência de UI

Em `src/lib/useFIProgress.ts` (linhas 108–115, código original):

```ts
const monthlyCostGoal = settings.monthlyLivingCostGoal || 0;
...
const isSetup = monthlyCostGoal > 0;

const ratio = isSetup && monthlyCostGoal > 0 ? currentMonthlyIncome / monthlyCostGoal : 0;
const coveragePercent = Math.min(100, Math.max(0, ratio * 100));
```

`useUserSettings.ts` confirma que `monthlyLivingCostGoal` é opcional e o
valor padrão após reset é `undefined` (linha 58: `monthlyLivingCostGoal: undefined`).
Ou seja, para um usuário de teste que nunca configurou sua meta de gastos
mensais, `monthlyCostGoal` é `0`, `isSetup` é `false`, e **`coveragePercent`
é forçado a `0` por definição de fórmula — não porque o progresso seja
zero, mas porque não existe meta contra a qual comparar a renda passiva.**

Enquanto isso, o milestone "Primeiros R$100 mil" em `HorizonteHero.tsx`
(linha 176–181, código original) é calculado de forma totalmente
independente da meta de gastos:

```ts
if (totalCapitalBRL > 0) {
  milestones.push({
    label: "Primeiros R$ 100 mil",
    achieved: totalCapitalBRL >= 100_000,
  });
}
```

**Causa raiz real:** o headline "0.0%" do Horizonte FI mede *cobertura de
renda passiva sobre a meta de gastos mensais* — uma métrica que exige
`monthlyLivingCostGoal` configurado. Quando essa meta não está configurada
(bug de dado do usuário de teste: campo ausente/zerado no Firestore, que é
o estado padrão e esperado para qualquer usuário que ainda não passou pelo
onboarding de FI), a fórmula retorna `0` por design. Só que o componente
`HorizonteHero` não distinguia esse "0% por falta de meta" de um genuíno
"0% de progresso patrimonial", e mostrava o mesmo texto ("0.0%") ao lado
de um milestone de patrimônio (métrica totalmente diferente, que não
depende da meta) já batido — produzindo a contradição visual reportada.

Note que `FIProgressCard.tsx` (o card legado, em `src/components/ceiling/`)
já tratava esse caso corretamente: ele calcula seu próprio `isSetup` local
e **esconde inteiramente** a seção de percentual quando `!isSetup`,
mostrando em vez disso um CTA para configurar a meta (linhas 178–190 e
217). O `HorizonteHero` (extraído depois, no prompt 47, como hook puro)
não herdou essa proteção — o hook `useFIProgress` já calculava `isSetup`
internamente, mas nunca o expunha no retorno, então o componente novo não
tinha como saber que o "0.0%" era um estado especial.

## Correção aplicada

1. **`src/lib/useFIProgress.ts`** — `isSetup` (já calculado internamente)
   agora é exposto na interface `FIProgressResult` e no retorno do hook,
   documentado com JSDoc explicando por que existe.

2. **`src/components/horizonte/HorizonteHero.tsx`** — passa a consumir
   `isSetup`. Quando `!isSetup && totalCapitalBRL > 0` (patrimônio positivo
   mas meta não configurada — exatamente o cenário do bug reportado), o
   componente:
   - Não mostra mais `"0.0%"` como headline; mostra o valor do patrimônio
     acumulado (`capitalLabel`) no lugar, que é o dado que de fato existe.
   - Troca o subtítulo por uma mensagem explícita convidando a configurar a
     meta de gastos mensais, em vez de repetir "acumulados" sem contexto.
   - Ajusta o `aria-label` do canvas para não anunciar "0% de progresso"
     nesse estado.
   - O milestone de R$100 mil continua sendo exibido normalmente (ele é
     uma métrica de patrimônio válida por si só, independente da meta).

Não foi necessário alterar a fórmula de `coveragePercent` em si — ela está
correta para quando a meta existe. A correção é sobre nunca apresentar um
"0%" de uma métrica indisponível como se fosse um "0%" de progresso real.

## Teste de regressão adicionado

- `src/lib/__tests__/useFIProgress.test.ts` — novo caso: com
  `monthlyLivingCostGoal: undefined` e carteira valendo mais de R$100k,
  confirma que `isSetup` é `false` e `coveragePercent` é `0` (documentando
  o comportamento correto do hook, que por si só não é o bug — o bug era
  a falta desse sinal chegando ao componente).
- `src/components/horizonte/__tests__/HorizonteHero.test.tsx` — novo
  arquivo. Testa diretamente o cenário do bug reportado
  (`totalCapitalBRL: 300_405.55`, `isSetup: false`, `coveragePercent: 0`)
  e assevera que a string `"0.0%"` **não** aparece na tela, além de
  confirmar que o milestone de R$100 mil continua marcado como batido.
  Um segundo caso confirma que, com `isSetup: true`, o percentual
  (`"42.5%"`) continua sendo exibido normalmente — sem regressão no
  caminho feliz.

## Resultado dos comandos solicitados

- `npm run test` → **222 passed, 4 skipped** (34 arquivos passaram, 1
  skipado), incluindo os 3 novos casos de teste.
- `npm run build` → **build concluído com sucesso** (client + server),
  sem erros de tipo ou de bundling. Apenas o aviso pré-existente de chunk
  grande (`auth-provider`, `index`, `pdf`, `ChartGlowDef` acima de 500kB),
  não relacionado a esta mudança.

## Arquivos alterados

- `src/lib/useFIProgress.ts`
- `src/components/horizonte/HorizonteHero.tsx`
- `src/lib/__tests__/useFIProgress.test.ts`
- `src/components/horizonte/__tests__/HorizonteHero.test.tsx` (novo)
