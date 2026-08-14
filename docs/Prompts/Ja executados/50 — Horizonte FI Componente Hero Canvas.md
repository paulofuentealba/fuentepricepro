# 50 — Horizonte FI: Componente hero "Horizonte FI" (elemento de assinatura)

## Contexto

Este é o elemento central da nova identidade — a linha do horizonte animada
em canvas, que sobe conforme `coveragePercent` (do `useFIProgress()` criado no
prompt 47). Referência visual: protótipo aprovado por Paulo em Claude
Artifact (link salvo por ele — pedir se necessário; a lógica de desenho pode
ser reconstruída a partir da descrição abaixo sem precisar do arquivo-fonte).

## Objetivo

Criar `src/components/horizonte/HorizonteHero.tsx`, consumindo dado real
(não mock) via `useFIProgress()`.

## O que fazer

1. Componente com:
   - Cabeçalho: label "Horizonte FI", valor grande (`coveragePercent`) em
     Fraunces, texto de apoio com `totalCapitalBRL` e `monthsToFI` (formatar
     "X anos e Y meses" — criar helper `formatMonthsAsYearsMonths` se não
     existir um equivalente em `src/lib/`).
   - `<canvas>` desenhando uma linha de horizonte cuja altura é proporcional
     a `coveragePercent` (0-100%), com gradiente do tom `--h-accent` do chão
     até transparente, marcador circular na posição "você está aqui", e um
     traço pontilhado de referência no topo (linha das 100%).
   - Animação de entrada (ease-out, ~1.2-1.5s) do nível subindo de 0 até o
     valor real, respeitando `prefers-reduced-motion` (pular direto pro
     valor final se o usuário tiver essa preferência ativada).
   - Ler as cores do canvas via `getComputedStyle` nos tokens `--h-accent`/
     `--h-accent-strong`/`--h-line` (não hardcodar hex no JS — se o tema
     mudar entre light/dark, o canvas tem que reagir, ver padrão de
     `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)`
     redesenhando).
2. Marcos (milestones) abaixo do canvas: usar os campos já existentes em
   `useUserSettings()`/`useFIProgress()` para determinar se marcos como
   "primeiros R$100k" e "renda cobre X% dos gastos" foram batidos — **não
   inventar marcos que não são deriváveis do dado real**; se não houver dado
   suficiente para um marco específico, omitir esse marco em vez de mostrar
   valor fixo/mock.
3. Acessibilidade: `role="img"` no canvas com `aria-label` textual descrevendo
   o progresso atual (ex.: "Linha do horizonte em 62% de progresso").

## Critérios de aceite

- Nenhum número no componente é mockado — tudo vem de `useFIProgress()`.
- Funciona com `prefers-reduced-motion: reduce` (sem animação, valor final
  direto).
- Responde a mudança de tema claro/escuro sem precisar de reload.
- Testado manualmente com pelo menos 3 cenários de dado real: usuário no
  início da jornada (~5%), no meio (~50%), e com meta batida (`isReached:
  true` — o componente deve comunicar isso como conquista, não como "62%"
  travado).

## Fora de escopo

- Não integrar ainda na rota `/app-v2` (isso é o prompt 51).

## Ao terminar

- Gerar documento (resultado ou plano de impelementação), salvar na pasta e realizar o commit desta atividade usando nome da atividade como comentário.
- Gerar o commit desta execução e adicionar ao documento final salvo no diretório