# RESULTADO — Corrigir Hero Canvas em Branco e Métricas

Data: 2026-08-11

## Nota sobre o arquivo de log

`docs/PROMPTS_LOG.md` não existe mais neste repositório (foi consolidado no SSOT em
execução anterior). Este arquivo de resultado é o único registro desta execução.

## Escopo executado

Comparação visual entre o print de referência aprovado e o resultado real em `/app`
encontrou 3 problemas. Os 3 foram corrigidos. Um 4º ponto (coluna P&L extra na
tabela) foi confirmado como aceito e não foi tocado.

### 1. Canvas do horizonte em branco quando `coveragePercent === 0`

Arquivo: `src/components/horizonte/HorizonteHero.tsx`.

- `drawHorizon` passou a receber um segundo parâmetro, `alwaysShowFloor: boolean`,
  em vez de inferir o piso visual só a partir do valor numérico de `levelPercent`.
  O componente passa `needsGoalSetup` (já calculado antes do primeiro uso, movido
  para o topo do componente) nas três chamadas de `drawHorizon` (animação inicial,
  troca de tema, resize).
- `displayLevel` agora aplica `MIN_VISUAL_LEVEL_PERCENT` quando
  `clampedLevel > 0 || alwaysShowFloor` — ou seja, tanto no caso de progresso real
  quanto no caso "com patrimônio, mas sem meta configurada".

**Bug adicional encontrado durante a correção (não estava na spec original):** o
gradiente de preenchimento usava o hack `` `${accent}00` `` para simular alpha
(sufixo hex de transparência). Os tokens de cor (`--primary` em
`src/styles.css`) são definidos em `oklch(...)`, não em hex — então a string
resultante (`"oklch(0.73 0.062 182.6)00"`) não é uma cor CSS válida, e
`gradient.addColorStop(1, ...)` lançava exceção sempre, independente do valor de
`coveragePercent`. Isso significa que o canvas nunca renderizava o preenchimento
corretamente em nenhum estado, mesmo antes da correção do piso visual — o
`MIN_VISUAL_LEVEL_PERCENT` sozinho não teria resolvido o "canvas em branco".
Corrigido trocando `` `${accent}00` `` por `"transparent"`, que funciona
independente do formato do token de cor.

Verificação real: subi `npm run dev`, abri `/app` no navegador (browser pane), e
como o snapshot de dev tinha uma conta sem `monthlyLivingCostGoal` configurado
(cenário exato do bug: patrimônio de R$ 15.742,20, sem meta), inspecionei os
pixels do canvas via `getImageData` — antes da correção do `addColorStop` o
canvas ficava com 0 pixels não-transparentes (confirmado reproduzindo a lógica
antiga isoladamente, que lança `SyntaxError` em `addColorStop`); depois da
correção, o canvas real da página passou a ter 9.679 de 92.256 pixels
não-transparentes (~10,5%, compatível com o piso de 8% + linha do horizonte +
marcador). Também validei a lógica pura para o caso de progresso normal
(`coveragePercent = 45`, sem `alwaysShowFloor`): preenchimento proporcional
correto (~44,8% da área), e para "0% real com meta configurada" (sem floor):
corretamente 0 pixels, ou seja, o piso não aparece indevidamente quando não é o
caso do bug.

### 2. Métrica "Renda Passiva Atual"

Adicionada em `HorizonteHero.tsx`, usando `monthlyIncomeBRL` já calculado por
`useFIProgress()` (não recalculado). Formatada como moeda com sufixo "/mês" em
`text-xs`, empilhada com "Aporte deste mês" no canto superior direito do hero.

Confirmado visualmente (via árvore de acessibilidade da página real): "Renda
passiva atual" / "R$ 4,26" / "/mês" presentes no cabeçalho do hero.

### 3. "Aporte deste mês" movido para dentro do hero

- Removido o card "Aporte deste mês" do grid em `src/routes/app/index.tsx`. O
  grid voltou a `lg:grid-cols-3` com 3 cards: Patrimônio Total, Proventos
  Recebidos, Maior Posição (confirmado via árvore de acessibilidade da página
  real rodando).
- `HorizonteHero.tsx` agora importa `useTransactions()` e
  `getMonthlyNetContribution` (de `@/lib/selectors/monthlyContribution`,
  reaproveitado sem alteração) e `useQuery(exchangeRateQueryOptions())`
  diretamente — a mesma lógica que antes vivia em `app/index.tsx` foi movida
  para dentro do componente do hero, não extraída para um hook compartilhado
  separado (decisão: o cálculo é usado em um único lugar agora, então mover
  para dentro do componente evita um hook de uma linha só sem outros
  consumidores).
- O aviso de aproximação ("baseado nas transações registradas este mês")
  deixou de ser um texto sempre visível (não cabia no espaço mais apertado do
  cabeçalho do hero) e virou um tooltip via o componente `InfoTooltip`
  já existente (`@/components/ui/InfoTooltip`), ao lado do rótulo "Aporte
  deste mês". `InfoTooltip` já é usado em outros pontos do app (Watchlist,
  DividendRadar, etc.) e encapsula seu próprio `TooltipProvider`.

## Regras obrigatórias — conferidas

- Coluna P&L da tabela: não tocada.
- `useFIProgress.ts`: não alterado.
- `getMonthlyNetContribution`: não alterado, só reaproveitado.
- Testados os 2 estados (com/sem meta): a conta de dev usada tinha
  `needsGoalSetup = true` (sem meta), confirmando visualmente o piso do canvas;
  o caso "com meta" (`coveragePercent` real) foi validado via a mesma lógica de
  desenho executada isoladamente no console do navegador (não havia forma
  rápida de configurar uma meta na conta de dev sem tocar em dados de produção),
  confirmando preenchimento proporcional correto.

## Verificação

1. `npx tsc --noEmit`: limpo em relação às minhas alterações. Restam 3 erros
   pré-existentes, não relacionados a este trabalho, em
   `src/components/horizonte/__tests__/HorizonteHero.test.tsx` (`toBeInTheDocument`
   não reconhecido pelo compilador — problema de tipos do jest-dom/vitest,
   confirmado presente também no branch `dev` sem minhas mudanças via
   `git stash`).
2. `npm run test -- --run`: **229 passed | 4 skipped** (35 arquivos de teste
   passaram, 1 skipped) — inclui os testes existentes de `HorizonteHero`.
3. `npm run build`: build de produção concluído com sucesso (SSR + client).
4. Verificação visual real: `npm run dev` (porta real 5176, já que 5173-5175
   estavam ocupadas), navegado `/app` no browser pane. Confirmado via
   `getImageData` no canvas real da página que o preenchimento não fica mais
   em branco no cenário exato do bug (sem meta configurada). Confirmado via
   árvore de acessibilidade da página real que "Aporte deste mês" e "Renda
   passiva atual" aparecem juntos no canto superior direito do hero, e que o
   grid abaixo tem 3 cards (não 4).

## Arquivos alterados

- `src/components/horizonte/HorizonteHero.tsx`
- `src/routes/app/index.tsx`
