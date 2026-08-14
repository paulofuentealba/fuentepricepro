# RESULTADO - 71 — Limpar Scripts Órfãos na Raiz

## O que foi feito

1. Listados todos os arquivos `.cjs`/`.js`/`.sh`/`.mjs` na raiz do
   projeto (fora de `src/`, `scripts/` oficial e `node_modules`).
   Resultado: apenas dois arquivos `.js` existem na raiz hoje —
   `eslint.config.js` e `server.production.js`. Os arquivos citados no
   prompt original como exemplo (`clean.cjs`, `merge.cjs`) **não
   existem mais no repositório** — já haviam sido removidos em alguma
   limpeza anterior, antes desta auditoria rodar.
2. Verificadas referências reais de cada um dos dois arquivos
   encontrados:
   - `eslint.config.js`: não aparece em `package.json` `scripts`, mas
     é o arquivo de configuração padrão que o ESLint carrega
     automaticamente ao rodar `eslint .` (usado em `npm run lint`).
     **Em uso ativo, não é órfão.**
   - `server.production.js`: referenciado explicitamente em
     `Dockerfile` (linhas 52 e 60) — copiado para a imagem de produção
     e executado via `CMD [ "node", "server.production.js" ]`.
     **Em uso ativo, não é órfão.**
3. Nenhum arquivo `.sh` encontrado na raiz.

## Removidos

Nenhum. Não havia scripts órfãos confirmados na raiz no momento da
auditoria.

## Movidos para `scripts/_unused/` (aguardando decisão)

Nenhum. Não foi criada a pasta `scripts/_unused/` por não haver
candidatos com dúvida genuína.

## Verificação

- `npm run build` → passou (`✓ built in 1.18s`).
- `npm run test` → passou (`248 passed | 4 skipped (252)`, 38 arquivos
  de teste passaram, 1 skipped).

## Ação tomada

Apenas atualização de documentação (`docs/SSOT.md`, item 10 da tabela
de pendências) marcando o item como resolvido, com a nota de que os
scripts órfãos citados já não existem e os dois `.js` remanescentes na
raiz são legítimos e ativamente usados.
