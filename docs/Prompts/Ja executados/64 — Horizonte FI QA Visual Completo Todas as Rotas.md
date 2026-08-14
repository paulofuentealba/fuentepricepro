# 64 — Horizonte FI: QA visual completo de todas as rotas

## Contexto

Última etapa da leva 55-64. As etapas anteriores migraram Screener,
Comparador, Global Radar, Risk Radar, Smart Allocation, Snowball, Cash
Flow, Docs e Settings para `/app-v2`, somando-se ao Dashboard e Carteira já
migrados na leva 46-54. Esta etapa audita o conjunto **inteiro**, com a
mesma exigência de evidência real que já rege o projeto (nunca aceitar
relato de sucesso sem prova, ver `AGENTS.md`/SSOT Seção 8) — e desta vez
com ênfase em **verificação visual real**, não só leitura de código, porque
foi exatamente a falta disso que gerou a reclamação sobre a leva anterior.

## O que fazer

1. Subir `npm run dev` e navegar (com a ferramenta de browser disponível —
   carregar via `ToolSearch` se necessário) por **todas** as rotas abaixo,
   nos dois temas (claro/escuro) e em pelo menos uma largura mobile
   (375px):
   - `/app-v2` (Dashboard)
   - `/app-v2/myportfolio`
   - `/app-v2/cashflow`
   - `/app-v2/globalradar`
   - `/app-v2/riskradar`
   - `/app-v2/screener`
   - `/app-v2/smartallocation`
   - `/app-v2/snowballeffectsimulator`
   - `/app-v2/comparator`
   - `/app-v2/docs`
   - `/app-v2/settings`
2. Para cada rota, registrar: renderizou sem erro? Tokens `--h-*`
   aplicados consistentemente (nenhum resquício de cor/fonte da v1
   vazando)? Layout quebrado em algum breakpoint? Algo que pareça "espaço
   morto" ou elemento mal posicionado (o tipo de problema já relatado pelo
   usuário na primeira entrega)?
3. Confirmar que `SidebarHorizonte.tsx` tem **todos** os itens de
   navegação apontando para as rotas v2 correspondentes — nenhum link
   deve mais sair para `/app/*` (v1) neste ponto, exceto se alguma rota
   ficou de fora do escopo por decisão explícita (documentar qual e por
   quê).
4. Rodar `npm run test` e `npm run build` do estado final consolidado.
5. Checar novamente os 2 achados de acessibilidade já corrigidos numa
   rodada anterior (contraste `--h-ink-faint`, navegação por teclado em
   `SortableHeader`) para garantir que não regrediram com as novas telas.
6. Atualizar `docs/SSOT.md` (Seção 3, Épico 5) com o estado real e
   completo — todas as rotas migradas, com a mesma tabela de evidência
   já usada no prompt 54.

## Formato do relatório final

Uma tabela markdown com uma linha por rota: **Passou / Falhou / Achado**,
com descrição concreta do que foi visto (não estimado) para cada rota nos
dois temas. Anexar isso ao documento
`docs/Prompts/RESULTADO - 64 — Horizonte FI QA Visual Completo Todas as Rotas.md`.

## Critério de aceite geral desta leva

Só considerar o Épico 5 "pronto para revisão de Paulo" se **todas** as
rotas passarem na verificação visual real — se alguma rota tiver problema
visual encontrado, documentar como achado aberto (não esconder, não
minimizar) em vez de marcar como concluído.
