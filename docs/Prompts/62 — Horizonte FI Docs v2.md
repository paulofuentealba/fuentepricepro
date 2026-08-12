# 62 — Horizonte FI: `/app-v2/docs`

## Contexto

Parte da leva 55-64. Ver regra de **verificação visual obrigatória** no
prompt 55. Esta é a tela mais simples da leva — sem hooks de dado, é
conteúdo estático com busca client-side.

## Referência de código (v1)

`src/routes/app/docs.tsx`: página de ajuda/glossário autocontida, busca
client-side (`normalize`/`filterCard`), âncoras de hash-scroll, ~16 seções
em `Card`. Só `useI18n`, sem outro hook de dado.

## Objetivo

Criar `src/routes/app-v2/docs.tsx`, mesma estrutura de conteúdo e busca,
restilizada com Fraunces nos títulos de seção e Inter no corpo — esta é a
tela onde a tipografia editorial da v2 tem mais espaço para respirar
(texto corrido, não densidade de dado).

## O que fazer

1. Ler `src/routes/app/docs.tsx` por completo.
2. Recriar a página preservando 100% do conteúdo/glossário (não reescrever
   texto, é conteúdo de produto real) e a lógica de busca/âncora.
3. Atualizar `SidebarHorizonte.tsx` — item "Wiki"/"Docs" → `/app-v2/docs`.
4. `npm run test`, `npm run build`.
5. **Verificação visual obrigatória**: buscar um termo, confirmar filtro
   funciona; clicar uma âncora, confirmar scroll; nos dois temas.

## Fora de escopo

- Não reescrever nenhum texto de glossário/ajuda.
