# 52 — Horizonte FI: Tabela de carteira v2

## Contexto

Tela mais densa em dado da v2 — é onde a regra "quiet cards, sem
blur/glow em telas de trabalho" (definida no processo de design, ver
protótipo aprovado) mais importa. Esta tabela é usada tanto pelo investidor
iniciante quanto pelo profissional — a densidade de dado não pode ser
sacrificada por estética.

## O que fazer

1. Criar `src/routes/app-v2/myportfolio.tsx` + componente
   `src/components/horizonte/PortfolioTableV2.tsx`.
2. Colunas: Ativo (nome + ticker), Classe (chip com cor por `--asset-*`
   herdado do sistema de cor por classe de ativo já existente — **não
   reinventar** essa paleta, ela já existe e funciona bem, ver
   `styles.css`), Posição, Preço médio, Variação, P&L (via
   `getAssetPnL()` do prompt 48), Dividend Yield.
3. `font-variant-numeric: tabular-nums` em todas as colunas numéricas
   (requisito de design não-negociável — números que "dançam" foi um dos
   problemas identificados na v1).
4. Fonte de dado: `valuedItems` de `useValuedPortfolio()` diretamente — não
   criar novo hook de fetch, é o mesmo dado da v1.
5. Ordenação por coluna (client-side, sobre o array já carregado) e busca por
   ticker/nome — funcionalidade que a v1 já tem em alguma tela equivalente;
   verificar se existe um hook de sort/filter reaproveitável antes de
   escrever um novo.
6. Estado vazio: se `valuedItems.length === 0`, mostrar convite a registrar
   aporte, mesma linguagem do dashboard (prompt 51) para consistência de voz.

## Critérios de aceite

- Todos os valores numéricos idênticos aos exibidos na tela equivalente da
  v1 (`myportfolio.tsx`) para o mesmo usuário — comparar lado a lado.
- Cards/linha da tabela sem `backdrop-blur`/glow — só o hero (prompt 50) usa
  esse tratamento visual.
- Responsivo: tabela com `overflow-x: auto` em telas estreitas, sem quebrar
  o layout da página.

## Fora de escopo

- Não adicionar filtros/colunas que não existem na v1. Paridade de dado
  primeiro, melhoria de UX depois (backlog separado).
