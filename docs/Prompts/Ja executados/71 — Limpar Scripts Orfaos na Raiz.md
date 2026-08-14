# 71 — Limpar Scripts Órfãos na Raiz (Débito Técnico P3)

## Contexto

`clean.cjs`, `merge.cjs` e outros scripts soltos na raiz do projeto,
nunca referenciados em `package.json` (`scripts`) nem em nenhum workflow
de CI. Débito técnico de baixo risco — limpar antes que acumule mais.

## Escopo técnico

1. Listar todos os arquivos `.cjs`/`.js`/`.sh` na raiz do projeto (não
   dentro de `src/`, `scripts/` oficial, ou `node_modules`).
2. Para cada um, buscar referências reais em `package.json`
   (`scripts`), `cloudbuild.yaml`, ou qualquer workflow — se não houver
   nenhuma referência ativa, é candidato a remoção.
3. Antes de remover, checar o conteúdo de cada um rapidamente — se
   algum tiver lógica que parece útil mas simplesmente não está
   referenciada (ex: um script de manutenção manual ocasional), reportar
   em vez de apagar sem perguntar.
4. Remover os confirmados como mortos. Mover os que tiverem dúvida
   genuína para `scripts/_unused/` em vez de apagar, e listar pra
   Paulo decidir.

## Regras obrigatórias

- Não remover nada dentro de `scripts/` (a pasta oficial, com
  `check.py` e outros scripts em uso ativo).
- Não remover nada referenciado em `package.json` mesmo que pareça
  não usado — confirmar de verdade antes.

## Verificação obrigatória

1. `npm run build`, `npm run test` continuam passando após a remoção
   (garantia de que nada dependia desses arquivos)
2. Lista do que foi removido vs. o que foi movido pra `_unused/`
   aguardando decisão

## Ao terminar

Atualizar `docs/SSOT.md`, item 10 da tabela de pendências. Trabalhar em
`dev`.
