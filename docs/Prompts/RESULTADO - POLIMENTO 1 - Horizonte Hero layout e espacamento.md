# RESULTADO — POLIMENTO 1 — Horizonte Hero: layout e espaçamento

## Contexto

O usuário reportou, a partir de um screenshot real de `/app-v2`, que o card
"Horizonte FI" estava com resultado visual "terrível" em cenários de
progresso baixo (perto de 0%):

- O `<canvas>` da linha do horizonte tinha uma área enorme e praticamente
  vazia — só a linha pontilhada de referência no topo (100%) e o marcador
  circular perdido no meio-baixo, sem faixa preenchida visível.
- O chip de milestone "✓ Primeiros R$ 100 mil" ficava flutuando de forma
  estranha, quase colado na borda inferior do card, sem alinhamento claro
  com o resto do conteúdo.

Este é trabalho de **polimento visual sobre um componente existente**
(`src/components/horizonte/HorizonteHero.tsx`). Nenhuma lógica de dado foi
alterada — `coveragePercent`, `useFIProgress`, `useValuedPortfolio` etc.
permanecem intocados (isso é escopo do bugfix de `coveragePercent`, que
roda em etapa separada).

## Mudanças feitas

### 1. Piso visual mínimo na faixa preenchida do canvas

Em `drawHorizon()`, o nível usado para desenhar a faixa/gradiente e a linha
do horizonte agora tem um piso mínimo de 8% quando `coveragePercent > 0`:

```ts
const MIN_VISUAL_LEVEL_PERCENT = 8;
const displayLevel = clampedLevel > 0
  ? Math.max(clampedLevel, MIN_VISUAL_LEVEL_PERCENT)
  : 0;
```

Isso é puramente cosmético — **não** altera o valor numérico exibido no
header (`{coveragePercent.toFixed(1)}%`), só evita que o card pareça um
retângulo vazio sem função clara quando o progresso real é, por exemplo,
1% ou 2%. Em 0% exato o piso não se aplica (não faz sentido sugerir
progresso onde não há nenhum).

### 2. Altura do canvas reduzida

`h-40` (160px) → `h-24` (96px). Menos área morta acima da faixa
preenchida, mantendo a composição equilibrada mesmo com pouco conteúdo
visual dentro do canvas.

### 3. Espaçamento e alinhamento dos milestones

A lista de milestones (`<ul>`) ganhou:
- `pt-3 mt-1` — respiro consistente antes dos chips, em vez de ficarem
  colados ao elemento anterior.
- `border-top: 1px solid var(--h-line)` — uma linha divisória sutil (token
  já existente na paleta petróleo) que ancora visualmente os milestones
  como uma seção separada do card, em vez de parecerem soltos/flutuando
  perto da borda inferior.

### 4. Paleta e tipografia

Nenhum token de `horizonte-tokens.css` foi alterado. Cores (`--h-accent`,
`--h-accent-strong`, `--h-line`, etc.) e fontes (Fraunces/Inter) permanecem
exatamente as mesmas — este polimento é só de layout/espaçamento, como
solicitado.

## Verificação

- `npm run test` — 222 passed, 4 skipped (sem regressão).
- `npm run build` — build concluído com sucesso.
- Tentativa de inspeção visual real via `npm run dev` + navegador
  automatizado: o servidor subiu normalmente (porta 5174) e a página
  `/app-v2` carregou (confirmado via extração de texto da página), mas o
  ambiente de execução deste agente não conseguiu compor screenshots da
  aba (erro "Browser pane is not displayed"), e a conta de teste
  disponível não tinha ativos cadastrados (estado `hasNoAssets`, que usa
  um card totalmente diferente sem canvas). Não foi possível, portanto,
  capturar um screenshot real do estado de progresso baixo com dados
  preenchidos nesta sessão.
- **Nota de honestidade**: as mudanças acima foram guiadas pela descrição
  detalhada do problema feita pelo usuário a partir do screenshot real
  (canvas vazio + chip colado na borda) e por inspeção cuidadosa da
  geometria de desenho em `drawHorizon()` e do CSS resultante, não por
  confirmação visual direta nesta sessão. Recomenda-se que o usuário
  confira visualmente o resultado em `/app-v2` com uma carteira populada
  antes de considerar o item fechado, e sinalize se o piso de 8% ou a
  nova altura (`h-24`) precisarem de ajuste fino.

## Arquivos alterados

- `src/components/horizonte/HorizonteHero.tsx`
