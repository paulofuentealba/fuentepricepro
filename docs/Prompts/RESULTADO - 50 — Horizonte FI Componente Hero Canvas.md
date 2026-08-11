# RESULTADO — 50 — Horizonte FI: Componente hero "Horizonte FI"

## O que foi implementado

Criado `src/components/horizonte/HorizonteHero.tsx`, um componente hero que
consome dado real via `useFIProgress()` (nenhum número mockado):

- **Cabeçalho**: label "Horizonte FI", valor grande em Fraunces
  (`coveragePercent` formatado com 1 casa decimal, ou "Meta atingida" quando
  `isReached === true`), texto de apoio com `totalCapitalBRL` formatado via
  `formatCurrency` e `monthsToFI` formatado via o novo helper
  `formatMonthsAsYearsMonths`.
- **Canvas** desenhando a linha do horizonte:
  - Altura proporcional a `coveragePercent` (0-100%).
  - Gradiente do chão em `--h-accent-strong` até transparente
    (`${accent}00`), lido via `getComputedStyle` — nenhuma cor hardcodada em
    hex no JS.
  - Marcador circular ("você está aqui") no meio horizontal da linha.
  - Traço pontilhado de referência no topo (linha das 100%), usando
    `--h-line`.
  - `role="img"` com `aria-label` textual dinâmico (ex.: "Linha do horizonte
    em 62% de progresso" ou, quando `isReached`, "... meta de independência
    financeira atingida").
- **Animação de entrada**: easing ease-out-cubic customizado (~1.3s) do
  nível subindo de 0 até o valor real via `requestAnimationFrame`.
  Verifica `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
  no efeito de montagem e, se ativo, desenha direto no valor final sem
  animação (sem interpolação alguma).
- **Reatividade a tema**: listener em
  `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)`
  que força um redesenho do canvas lendo os tokens atualizados via
  `getComputedStyle` — sem precisar de reload.
- **Redimensionamento**: listener de `resize` também redesenha o canvas
  (responsividade básica, considerando que o canvas ajusta `width`/`height`
  internos ao `devicePixelRatio`).
- **Marcos (milestones)**: apenas dois, ambos deriváveis diretamente do dado
  real de `useFIProgress()`:
  - "Primeiros R$ 100 mil" — comparação direta com `totalCapitalBRL`.
    Omitido se `totalCapitalBRL <= 0` (sem dado suficiente).
  - "Renda cobre 50% dos gastos" — comparação direta com `coveragePercent`.
    Omitido se `coveragePercent <= 0` (usuário não configurou meta / sem
    renda passiva ainda).
  Nenhum marco fixo/mock foi inventado (ex.: não há "primeiro milhão" nem
  qualquer marco que dependeria de dado não exposto pelo hook).

Criado também o helper `formatMonthsAsYearsMonths` em `src/lib/formatters.ts`
(não existia equivalente antes — o único formatador de duração encontrado,
`formatDuration` em `FIProgressCard.tsx`, é local ao componente e depende do
dicionário de i18n `t`, então não era reaproveitável diretamente). O helper:
- Trata singular/plural ("1 ano" vs "2 anos", "1 mês" vs "2 meses").
- Omite a parte zerada (ex.: `24` meses -> "2 anos", sem "e 0 meses").
- Retorna `""` para input `<= 0` ou não finito (nunca imprime "Infinity
  anos" nem preenche a UI com lixo).
- Retorna "menos de 1 mês" para durações positivas menores que 1 mês
  arredondado (evita cair em string vazia enganosa quando `monthsToFI` é um
  valor pequeno como `0.4`).

## Arquivos criados/alterados

- **Criado**: `src/components/horizonte/HorizonteHero.tsx`
- **Alterado**: `src/lib/formatters.ts` (novo helper `formatMonthsAsYearsMonths`)
- **Alterado**: `src/lib/__tests__/formatters.test.ts` (testes do novo helper)

## Resultado real dos testes/build

### `npx tsc --noEmit -p .`
Sem erros (saída vazia).

### `npm run test` (suíte completa)
```
Test Files  31 passed | 1 skipped (32)
     Tests  204 passed | 4 skipped (208)
  Start at  13:25:17
  Duration  3.34s
```
Nenhuma regressão introduzida; os 8 testes de `formatters.test.ts` (incluindo
os 6 novos de `formatMonthsAsYearsMonths`) passaram.

### `npm run build`
Build client + SSR concluído com sucesso (`✓ built in 1.49s` /
`✓ built in 816ms`). Apenas o warning pré-existente de chunk size (>500kB em
`i18n-provider`), não relacionado a esta mudança.

## Validação manual dos 3 cenários pedidos

O componente não está integrado a nenhuma rota ainda (fora de escopo deste
prompt — ver seção "Fora de escopo" abaixo), então a validação visual
interativa em `/app-v2` fica para o prompt 51, quando o componente for
efetivamente montado em uma página navegável. A lógica que determina os 3
cenários foi verificada por inspeção de código contra `useFIProgress()`:

1. **Início da jornada (~5%)**: `coveragePercent` baixo, `isReached=false` ->
   header mostra "X.X%", milestones mostram apenas os que já foram batidos
   (provavelmente nenhum, se capital ainda < R$100k e renda < 50% da meta).
2. **Meio da jornada (~50%)**: `coveragePercent` ~50, `isReached=false` ->
   header mostra "50.0%" (ou próximo), milestone "Renda cobre 50% dos
   gastos" passa a aparecer marcado quando o limiar é cruzado.
3. **Meta batida (`isReached: true`)**: header troca completamente para
   "Meta atingida" (cor `--h-accent-strong`) em vez de travar em "100.0%",
   comunicando conquista como pedido no critério de aceite.

## Desvios do plano original

- **Milestones limitados a 2**: o prompt cita "primeiros R$100k" e "renda
  cobre X% dos gastos" como exemplos. Implementei exatamente esses dois,
  com o "X%" fixado em 50% por ser o único limiar intermediário
  razoavelmente universal derivável sem introduzir configuração nova. Não
  foram adicionados marcos extras para não inventar escopo.
- **Validação manual em 3 cenários reais**: como o componente ainda não está
  montado em nenhuma rota (explicitamente fora de escopo — ver prompt), a
  validação dos 3 cenários foi feita por inspeção de código/lógica contra o
  hook real, não por interação visual no navegador. A validação visual
  completa faz mais sentido no prompt 51, quando o componente for integrado
  a `/app-v2` e puder ser testado com dados de usuários reais em estágios
  diferentes da jornada.
- **Textos em pt-BR hardcoded**: seguindo o padrão já existente em
  `FIProgressCard.tsx` (que também tem strings pt-BR hardcoded como
  "Independência financeira"), não usei o sistema de i18n (`useI18n`/`t`)
  neste componente novo. Se for necessário internacionalizar futuramente,
  fica registrado aqui como pendência.

## Fora de escopo (conforme o prompt)

- Integração do componente na rota `/app-v2` — fica para o prompt 51.

## Commit desta execução

```
Horizonte FI 50 - Componente hero canvas
```
(hash e detalhes no `git log` do repositório)
