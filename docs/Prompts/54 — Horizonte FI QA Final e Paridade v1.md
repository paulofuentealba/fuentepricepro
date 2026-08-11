# 54 — Horizonte FI: QA final e paridade v1

## Contexto

Última etapa antes de considerar o Épico 5 (SSOT) pronto para revisão de
Paulo/Claude. Este prompt não escreve feature nova — audita o que os prompts
46-52 produziram.

## O que verificar (checklist, reportar cada item com evidência, não só "ok")

1. **Zero regressão em v1**: `/app`, `/app/myportfolio`, e todas as outras
   rotas v1 renderizam exatamente como antes desta série de prompts. Rodar
   `git diff` sobre qualquer arquivo fora de `src/routes/app-v2/`,
   `src/components/horizonte/`, `src/components/layout-v2/`,
   `src/lib/useFIProgress.ts`, `src/lib/selectors/`,
   `src/styles/horizonte-tokens.css` — se algo fora dessa lista mudou,
   investigar por quê antes de aprovar.
2. **Paridade numérica**: para um mesmo usuário de teste, `HorizonteHero`
   (coveragePercent, capital, meses até FI) e a tabela de carteira v2 (P&L,
   preço médio, yield) batem exatamente com os números da v1 equivalente.
3. **Acessibilidade**: navegação 100% por teclado em `/app-v2` (foco visível
   em todos os elementos interativos), `prefers-reduced-motion` respeitado no
   canvas do `HorizonteHero`, contraste de texto/fundo em ambos os temas
   (claro/escuro) passa AA (usar ferramenta de contraste, não estimar).
4. **Responsividade**: `/app-v2` funciona em viewport mobile (375px) — grid de
   cards empilha, tabela tem scroll horizontal próprio (não a página
   inteira).
5. **Tema**: alternar claro/escuro em `/app-v2` sem reload — tokens do prompt
   46 respondem corretamente, canvas do horizonte redesenha com as cores do
   tema atual.
6. **Fontes**: confirmar via DevTools Network que Fraunces/Inter carregam de
   `public/fonts/` local, zero requisição externa.
7. **Performance**: `/app-v2` não deve carregar `horizonte-tokens.css` nem as
   fontes Fraunces/Inter quando o usuário está em `/app` (v1) — checar que o
   code-splitting/CSS scoping do prompt 46/49 está isolando corretamente
   (Network tab, comparar payload de `/app` antes e depois desta série).

## Formato do relatório final

Para cada um dos 7 itens acima: **Passou / Falhou / Não aplicável**, com a
evidência (screenshot, trecho de output de teste, ou diff) — sem essa
evidência, o item não pode ser marcado como concluído (regra geral do
projeto: nunca aceitar relato de sucesso sem prova, ver SSOT Seção 8,
Golden Rules do `AGENTS.md`).

Ao final, atualizar a Seção 3 (Épico 5) e Seção 6 (item 12) do
`docs/SSOT.md` com o resultado real — não deixar o SSOT desatualizado.
