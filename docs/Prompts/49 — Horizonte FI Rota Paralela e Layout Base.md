# 49 — Horizonte FI: Rota paralela e layout base

## Contexto

A partir daqui a série monta a v2 de fato. A decisão arquitetural (já tomada
por Paulo, não reabrir): v2 vive numa **rota paralela**, nunca substitui a v1
em produção nesta fase.

## Objetivo

Criar a estrutura de rota `/app-v2` (TanStack Router, file-based, mesmo
padrão de `src/routes/app.tsx` + `src/routes/app/`) com layout base — sidebar
e topbar usando os tokens do prompt 46 — mas **sem nenhuma tela de conteúdo
ainda** (isso vem nos prompts seguintes).

## O que fazer

1. Criar `src/routes/app-v2.tsx` como layout, espelhando a estrutura de
   `src/routes/app.tsx` (mesmo guard de autenticação — reutilizar o mesmo
   hook/lógica de auth, **não duplicar** verificação de sessão).
2. Aplicar `data-app-version="horizonte"` no elemento raiz deste layout, para
   que os tokens do prompt 46 (`horizonte-tokens.css`) se ativem só dentro
   desta subárvore.
3. Criar `src/components/layout-v2/SidebarHorizonte.tsx` — mesma lista de
   navegação de `src/components/layout/Sidebar.tsx` (Dashboard, Carteira,
   Fluxo de caixa, Radar, Comparador, Simulador, Screener), mas estilizado com
   os novos tokens (Fraunces na marca, Inter nos itens, accent petróleo no
   item ativo). Reaproveitar os `href`s existentes — os links da v2 devem
   apontar para as rotas v1 correspondentes até que cada tela seja migrada
   (prompts 51-52 migram Dashboard e Carteira; o resto continua abrindo v1).
4. Criar `src/routes/app-v2/index.tsx` como página vazia/placeholder
   ("Horizonte FI v2 — em construção") só para validar que a rota monta e o
   layout renderiza corretamente com os tokens.
5. Adicionar acesso a `/app-v2` **só** via URL direta nesta fase — não
   adicionar link nenhum a partir da v1 (evita usuário real cair numa v2
   incompleta).

## Critérios de aceite

- `/app-v2` requer login (mesma proteção da v1).
- `/app` (v1) continua idêntica — nenhum arquivo de `src/routes/app.tsx` ou
  `src/components/layout/Sidebar.tsx` foi tocado.
- Fontes Fraunces/Inter carregam só dentro de `/app-v2` (inspecionar que a v1
  continua usando a stack de fontes de sistema).
- Dark/light mode funcionam em `/app-v2` (toggle existente do app deve
  continuar funcionando, tokens do prompt 46 respondem a `data-theme`).

## Fora de escopo

- Nenhuma lógica de dado nova. Nenhuma tela de conteúdo real ainda.

## Ao terminar

- Gerar documento (resultado ou plano de impelementação), salvar na pasta e realizar o commit desta atividade usando nome da atividade como comentário.
- Gerar o commit desta execução e adicionar ao documento final salvo no diretório