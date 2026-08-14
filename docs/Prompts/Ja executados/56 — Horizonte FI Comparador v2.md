# 56 — Horizonte FI: `/app-v2/comparator`

## Contexto

Parte da leva 55-64 que estende a v2 pra todas as rotas. Ver regra de
**verificação visual obrigatória** no prompt 55 — vale igualmente aqui, com
ênfase redobrada: esta é uma tela **densa em tabela** (comparação de
ativos), exatamente o tipo de tela onde a regra "quiet cards, densidade
primeiro" definida no design original importa mais.

## Referência de código (v1)

`src/routes/app.comparator.tsx` (não lazy) renderiza `AssetComparator`
(`src/components/ceiling/AssetComparator.tsx`) diretamente — componente de
comparação/tabela de múltiplos ativos lado a lado, com gráfico de
desempenho e benchmark (IBOV/S&P 500, ver SSOT item 1.7).

## Objetivo

Criar `src/routes/app-v2/comparator.tsx` reaproveitando `AssetComparator`
sem alterar sua lógica interna — só a casca visual/contêiner da página.

## O que fazer

1. Ler `src/components/ceiling/AssetComparator.tsx` por completo — é
   provavelmente o componente mais denso desta leva de rotas (tabela +
   gráfico + benchmark). Identificar onde cores/tipografia estão
   hardcoded vs. herdadas de tokens Tailwind, para saber o que precisa de
   ajuste visual e o que já herda automaticamente via `data-app-version`.
2. Criar a rota v2, aplicando `font-variant-numeric: tabular-nums` em
   qualquer coluna numérica que ainda não tenha (checar se `AssetComparator`
   já usa, se não, adicionar via wrapper/classe).
3. Atualizar `SidebarHorizonte.tsx` — item "Comparador" aponta para
   `/app-v2/comparator`.
4. `npm run test`, `npm run build`.
5. **Verificação visual obrigatória**: comparar pelo menos 2 ativos reais,
   nos dois temas, e confirmar que a tabela/gráfico não quebram com os
   novos tokens (contraste de linhas, legibilidade do gráfico contra o
   fundo `--h-paper`).

## Critérios de aceite

- Mesma funcionalidade de comparação da v1, apenas restilizada.
- Gráfico de benchmark legível nos dois temas (não é raro gráfico com cor
  fixa sumir contra fundo escuro — checar isso especificamente).

## Fora de escopo

- Não alterar a lógica de cálculo de benchmark/IBOV/S&P 500.
