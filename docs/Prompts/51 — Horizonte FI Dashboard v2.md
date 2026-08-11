# 51 — Horizonte FI: Dashboard v2 (Horizonte + cards de resumo)

## Contexto

Primeira tela real da v2. Monta o `HorizonteHero` (prompt 50) mais os três
cards de resumo (patrimônio total, proventos do ano, maior posição), todos
com dado real.

## O que fazer

1. Substituir o placeholder de `src/routes/app-v2/index.tsx` (prompt 49) por
   um dashboard real:
   - `HorizonteHero` no topo.
   - Grid de 3 cards abaixo, usando os novos tokens visuais (`--h-*`), com:
     - **Patrimônio total**: `totals.consolidatedNetWorth` de
       `useValuedPortfolio()`.
     - **Proventos recebidos (ano)**: `computeRealizedIncomeSummary()`
       (`src/lib/realizedIncome.ts`) campo `currentYear`.
     - **Maior posição**: derivar do `valuedItems` de `useValuedPortfolio()`
       ordenando por valor de mercado — criar selector puro
       `getLargestPosition(valuedItems)` em
       `src/lib/selectors/largestPosition.ts` se não existir equivalente.
   - Delta/variação em cada card: usar dado já disponível (ex. variação do
     dia do ativo de maior posição vem de `quotes`/`meta` retornado por
     `useValuedPortfolio()` — **checar o hook antes de assumir campo
     inexistente**; se o dado de variação percentual não estiver disponível
     hoje, omitir o badge de delta em vez de calcular algo não verificado).
2. Skeleton states: reaproveitar o padrão de `Skeleton` já usado na v1
   (`src/components/ui/skeleton.tsx`) enquanto `isAppLoading` de
   `useValuedPortfolio()` é `true` — não inventar um novo componente de
   loading.
3. Empty state: se o usuário não tiver nenhum ativo na carteira, o
   `HorizonteHero` deve mostrar um convite claro ("registre seu primeiro
   aporte para começar sua jornada"), não 0% travado sem contexto.

## Critérios de aceite

- Zero dado mockado — tudo vem dos hooks/selectors já existentes ou criados
  nos prompts 47/48.
- Testar com usuário real de dados (ou o emulador Firebase com fixture
  existente do projeto, se houver) e conferir que os números batem com os
  mesmos números exibidos hoje na v1 (`/app`).
- `npm run test` e `npm run build` passam.

## Fora de escopo

- Tabela de carteira (prompt 52). Cash flow, radar, comparador, screener
  continuam apontando para v1 nesta fase (ver prompt 49).

## Ao terminar

- Gerar documento (resultado ou plano de impelementação), salvar na pasta e realizar o commit desta atividade usando nome da atividade como comentário.
- Gerar o commit desta execução e adicionar ao documento final salvo no diretório