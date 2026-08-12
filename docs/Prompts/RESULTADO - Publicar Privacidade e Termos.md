# Resultado — Publicar Política de Privacidade e Termos de Uso

Prompt de origem: `docs/Prompts/prompt_publicar_privacidade_termos.md`

## Bloqueio inicial (resolvido)

O anexo referenciado no prompt (`politica_privacidade_rascunho.md` e
`termos_de_uso_rascunho.md`) não estava no repositório na primeira leitura
do prompt. Como esse conteúdo é jurídico e o prompt é explícito sobre não
inventar/decidir substância sozinho, parei e perguntei — Paulo salvou os
dois arquivos em `docs/Prompts/` e o trabalho prosseguiu a partir deles.

## Resumo

Duas novas rotas públicas (`/privacy`, `/terms`), sem autenticação, com o
conteúdo aprovado por Paulo nos 3 idiomas, rodapé da landing conectado, e
link cruzado real entre os dois documentos.

## Arquivos criados

### `src/lib/legal-content.ts` (novo)

Conteúdo estruturado da Política de Privacidade e dos Termos de Uso, nos 3
idiomas, **fora** dos dicionários `i18n/dict.*.ts` — decisão reportada
abaixo. Cada seção é `{ id, heading, blocks[] }`, onde cada bloco é um
parágrafo (`{type: "p", text}`) ou uma lista (`{type: "list", items[]}`),
espelhando 1:1 a estrutura do markdown original. Constantes exportadas:
`LEGAL_CONTACT_EMAIL` (reaproveitada nos dois documentos, nunca duplicada
como string solta) e `LEGAL_LAST_UPDATED` (data ISO única, formatada por
locale no componente da página via `Intl.DateTimeFormat`).

**A nota interna do topo de cada rascunho ("Rascunho para revisão de Paulo
e, idealmente, de um advogado...") foi propositalmente excluída do
conteúdo publicado** — é uma observação endereçada a revisores, não aos
usuários finais.

### `src/routes/privacy.tsx` / `src/routes/terms.tsx` (novos)

Layout reaproveitado de `src/routes/guides.dividend-valuation.tsx` (rota
pública standalone, header com link de volta pra Home, `<article>` de
largura de leitura confortável) em vez de `settings.tsx`/`app/docs.tsx` —
razão: ambos os candidatos sugeridos no prompt vivem sob `/app/`, exigem
sessão autenticada (guard no layout pai) e não fazem sentido pra uma
página pública. `guides.dividend-valuation.tsx` já é o único padrão
existente de página de texto **pública** no app, com tokens reais em
produção (paleta Horizonte) e sem gate de auth.
- Título principal em `font-serif`, corpo em `font-sans` (padrão default),
  conforme pedido.
- `t.legal.lastUpdated` + data formatada por locale, no topo e no rodapé
  da página.
- Link cruzado real: `terms.tsx` renderiza a seção "1. Aceitação"
  substituindo o marcador `{{privacyLink}}` (presente no texto de
  `legal-content.ts`) por um `<Link to="/privacy">` real do TanStack
  Router — não `<a href>` solto. Ambas as páginas também têm um link
  cruzado no rodapé de cada uma para a outra.

## Arquivos alterados

### `src/lib/i18n/dict.ptBR.ts` / `dict.en.ts` / `dict.es.ts`

- Nova seção `legal` (curta, só chrome de UI — não conteúdo jurídico):
  `lastUpdated`, `backToHome`.
- `footerLegal1`: rótulo trocado de "Legais"/"Legal" para
  "Privacidade"/"Privacy"/"Privacidad" (ver decisão de IA abaixo).
- Nova chave `footerLegal4`: "Termos de Uso"/"Terms of Use"/"Términos de
  Uso".

### `src/routes/index.tsx` (landing)

Rodapé: os 2 primeiros slots agora são links reais (`<Link>` do TanStack
Router) — "Privacidade" → `/privacy`, "Termos de Uso" → `/terms`.
"Links externos" e "Termos de subscrição" continuam `href="#"` (ver gaps
reportados abaixo, fora de escopo).

## Decisões tomadas (conforme pedido no prompt para "decidir e reportar")

1. **Conteúdo fora dos dicts i18n**: `legal-content.ts` em vez de
   `t.legal.privacy.*`/`t.legal.terms.*` dentro de `dict.*.ts`. Os
   dicionários já têm ~1000 linhas de strings curtas de UI; adicionar ~18
   seções jurídicas x 3 idiomas ali tornaria esses arquivos muito mais
   difíceis de navegar para o propósito deles. `legal-content.ts` é o
   único lugar a editar para mudar texto jurídico nos 3 idiomas.
2. **Rótulo "Legais" → "Privacidade" + novo link "Termos de Uso"**: em vez
   de manter "Legais" apontando pra um único documento, virou 2 links
   distintos e nomeados corretamente. Havia só 3 slots pra 2 documentos —
   adicionei um 4º slot em vez de forçar 1 rótulo a cobrir 2 documentos.
3. **"Termos de subscrição" (`footerLegal3`) — gap reportado, não
   inventado**: é um documento distinto (termos específicos de assinatura
   Pro), nunca redigido. Não apontei pra `/terms` (seria
   semanticamente incorreto — Termos de Uso geral ≠ termos de assinatura
   paga) nem inventei conteúdo novo. Continua `href="#"`, registrado como
   pendência no SSOT.
4. **"Links externos" (`footerLegal2`)**: não tocado, conforme
   instrução explícita do prompt.
5. **Placeholders residuais**: os 3 `[preencher]` do rascunho (2x "Última
   atualização", 1x e-mail de contato nos Termos) foram preenchidos
   mecanicamente — data de publicação (12/08/2026) e reaproveitamento do
   e-mail já definido na Seção 1 da Política de Privacidade
   (`gutierre.fuentealba@gmail.com`) — sem alterar substância jurídica.

## Regras obrigatórias — conferidas

- Nenhuma mudança de substância jurídica além de tradução e preenchimento
  mecânico dos 3 placeholders — conteúdo aprovado por Paulo preservado.
- Nenhum `[preencher]` residual no texto publicado (conferido por busca
  em `legal-content.ts` e nas rotas).
- `design-tokens.test.ts` continua passando (6/6 testes) — nenhuma cor
  hardcoded introduzida.

## Verificação (código, sem testes de tela)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erros (após regenerar `routeTree.gen.ts` via `npm run build`, necessário pro TanStack Router reconhecer as 2 rotas novas) |
| `npm run test` | ✅ 241 passed, 4 skipped, incluindo `design-tokens.test.ts` (6/6) |
| `npm run build` | ✅ build limpo, chunks `privacy-*.js`/`terms-*.js`/`legal-content-*.js` gerados |
| Busca por `[preencher]` | ✅ nenhuma ocorrência no conteúdo publicado |

## Testes na tela que precisam ser feitos manualmente

1. Abrir `/privacy` e `/terms` diretamente pela URL, sem estar logado —
   confirmar que carregam normalmente (rota pública, sem redirect de auth).
2. Nos 3 idiomas (trocar no seletor de idioma do app), confirmar que o
   conteúdo das duas páginas aparece traduzido corretamente, incluindo o
   título em `font-serif` e a data "Última atualização"/"Last
   updated"/"Última actualización" formatada no padrão de cada idioma.
3. Na landing (`/`), rodapé: clicar em "Privacidade" → deve ir pra
   `/privacy`; clicar em "Termos de Uso" → deve ir pra `/terms`.
   "Links externos" e "Termos de subscrição" continuam sem destino (gap
   conhecido, não é regressão).
4. Em `/terms`, seção "1. Aceitação": confirmar que o link para "Política
   de Privacidade" dentro do parágrafo funciona e navega pra `/privacy`
   sem recarregar a página inteira (client-side nav do TanStack Router).
5. No rodapé de cada uma das duas páginas, confirmar que o link cruzado
   pra a outra também funciona.
6. Testar responsividade (mobile) nas duas páginas — texto longo, listas,
   e o header sticky com botão "Voltar para a página inicial".
