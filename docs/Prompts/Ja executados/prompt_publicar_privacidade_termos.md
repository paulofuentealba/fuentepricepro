# Prompt para Claude Code — Publicar Política de Privacidade e Termos de Uso

## Contexto

Landing page (`src/routes/index.tsx`) tem 3 links no rodapé
("Legais"/"Links externos"/"Termos de subscrição") todos `href="#"` —
não vão pra lugar nenhum. Não existe nenhuma rota de Política de
Privacidade nem Termos de Uso no app. Conteúdo já redigido e aprovado por
Paulo, anexo a este prompt (`politica_privacidade_rascunho.md` e
`termos_de_uso_rascunho.md`).

## Escopo técnico

### 1. Novas rotas

- `src/routes/privacy.tsx` — renderiza a Política de Privacidade.
- `src/routes/terms.tsx` — renderiza os Termos de Uso.

Layout: seguir o padrão visual já usado em `src/routes/settings.tsx` ou
`src/routes/docs.tsx` (o que fizer mais sentido de reaproveitar — ambos
são páginas de texto longo dentro do app) — tokens reais já em produção
(paleta Horizonte), `font-serif` pro título principal, corpo em
`font-sans`. Não precisa de autenticação (rota pública, alguém pode
querer ler antes de criar conta).

### 2. Conteúdo em i18n (3 idiomas)

O conteúdo anexo está em português. Traduzir pra EN e ES mantendo o
mesmo teor jurídico (não é tradução literal palavra-por-palavra
obrigatória, mas o sentido de cada cláusula tem que ser preservado —
principalmente a seção 3 dos Termos, "Isto NÃO é aconselhamento de
investimento", que é a cláusula mais sensível). Adicionar sob uma nova
seção `t.legal.privacy.*` / `t.legal.terms.*` nos 3 dicionários, ou
estruturar como Claude Code achar mais organizado dado o tamanho do
texto — reportar a decisão.

### 3. Conectar o rodapé

`src/routes/index.tsx`, seção `<footer>`: trocar os `href="#"` por links
reais:
- `footerLegal1` ("Legais") → `/privacy` (ou criar uma rota intermediária
  se fizer mais sentido ter Privacidade e Termos como 2 links
  separados em vez de 1 — atualmente só há 3 slots de link no footer pra
  2 documentos nomeados de forma um pouco confusa: "Legais", "Links
  externos", "Termos de subscrição". Reavaliar se o rótulo "Legais"
  deveria virar 2 links distintos "Privacidade" e "Termos de Uso" —
  decidir e reportar, já que isso é ajuste de copy/IA de navegação, não
  só link morto).
- Confirmar se "Termos de subscrição" (`footerLegal3`) já deveria
  apontar pra `/terms` ou se é um documento distinto (termos específicos
  de assinatura Pro, que não foram redigidos ainda) — se for distinto,
  não inventar conteúdo novo, só reportar o gap.
- "Links externos" (`footerLegal2`) — fora de escopo deste prompt, não
  mexer (não sabemos o que deveria ser sem contexto adicional).

### 4. Link cruzado entre os dois documentos

A Política de Privacidade referencia os Termos e vice-versa (já presente
no texto anexo, ex: "e com a nossa Política de Privacidade") — usar
`<Link>` do TanStack Router entre `/privacy` e `/terms`, não `<a href>`
solto.

## Regras obrigatórias

- Não alterar o conteúdo jurídico de fundo além de traduzir — é conteúdo
  já revisado por Paulo, mudanças de substância precisam voltar pra
  aprovação dele, não decidir sozinho.
- Não remover os placeholders that legitimately still need Paulo's
  input (não há nenhum neste momento — os 3 campos já foram preenchidos
  — mas confirmar que nenhum `[preencher]` residual ficou no texto final
  publicado).
- Manter `design-tokens.test.ts` passando.

## Verificação obrigatória (evidência real)

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Confirmar que nenhum `[preencher]` ou placeholder sobrou no texto
   renderizado
3. Screenshot das duas páginas nos 3 idiomas
4. Confirmar que os links do rodapé da landing levam pros lugares certos

## Ao terminar

Atualizar `docs/SSOT.md`. Trabalhar em `dev`.

---

## Anexo — conteúdo aprovado (colar os dois arquivos completos aqui antes
de enviar ao Claude Code, ou referenciar os arquivos se ele tiver acesso
direto ao diretório onde foram salvos)
