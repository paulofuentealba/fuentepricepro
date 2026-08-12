# RESULTADO — 73 — Banner de Consentimento LGPD Cookies

## O que foi implementado

Um único banner de consentimento de cookies (LGPD), unificando os itens 3
("Banner de consentimento LGPD") e 9 ("Banner de Cookies") do SSOT — na
prática são o mesmo banner e não havia justificativa legal para dois
banners separados.

1. **`src/components/shared/CookieConsentBanner.tsx`** — componente que
   aparece na primeira visita (quando ainda não há decisão persistida),
   como banner fixo no rodapé da tela (`fixed inset-x-0 bottom-0`), não
   modal e não bloqueante: não há overlay, o produto continua utilizável
   com o banner visível. Duas opções com o mesmo peso visual — ambas
   `variant="outline"` do componente `Button` já existente, mesmo
   tamanho, lado a lado — "Rejeitar" e "Aceitar", sem destaque de uma
   sobre a outra (nenhuma é `variant="default"`/preenchida). Inclui o
   link para `/privacy` reaproveitando o `<Link>` do TanStack Router já
   usado no resto do app (mesmo padrão de `src/routes/privacy.tsx`).

2. **`src/lib/cookieConsent.ts`** — módulo central com:
   - `hasAnalyticsConsent(): boolean` — retorna `false` por padrão
     (antes de qualquer decisão, se o valor persistido estiver ausente
     ou corrompido, ou se o usuário rejeitou) e `true` somente depois de
     aceite explícito.
   - `setCookieConsent(analytics: boolean)` — persiste a escolha.
   - `getCookieConsent()` / `hasConsentDecision()` — helpers auxiliares.
   - Chave versionada `cookieConsent.v1` em `localStorage`, valor
     `{ analytics: boolean, timestamp: string }`.
   - Nenhuma lib de analytics/PostHog foi instalada ou inicializada —
     o módulo é só o gate para quando isso acontecer (item 75, separado).

3. **i18n** — chaves novas `t.cookieBanner.*` (`message`,
   `privacyLinkLabel`, `accept`, `reject`) adicionadas nos 3 dicionários
   (`src/lib/i18n/dict.en.ts`, `dict.ptBR.ts`, `dict.es.ts`), seguindo o
   padrão de seção já usado (ao lado de `legal`). O texto foi adaptado do
   prompt 73 para o formato de chaves i18n do projeto.

4. **Integração no layout raiz** — `src/routes/__root.tsx` importa e
   renderiza `<CookieConsentBanner />` dentro do `RootComponent`, ao lado
   do `<Toaster />`, garantindo que apareça em todas as rotas (públicas e
   autenticadas).

## Decisões de posicionamento/design

- Banner fixo no rodapé (`bottom-0`), com fundo semi-transparente e
  `backdrop-blur`, consistente com o header sticky já usado em
  `/privacy` e `/terms` — visualmente familiar, mas sem bloquear a
  interação com o restante da página.
- Os dois botões usam o mesmo `variant="outline"` e `size="sm"` do
  design system existente (`src/components/ui/button.tsx`) — nenhum é
  destacado como CTA primário, para não configurar dark pattern (LGPD
  exige que recusar seja tão fácil quanto aceitar).
- Layout responsivo: em telas estreitas o texto e os botões empilham
  (`flex-col sm:flex-row`); os botões ocupam a largura total em mobile
  (`flex-1 sm:flex-none`) para manter alvo de toque confortável.

## Arquivos criados/alterados

- Criado: `src/lib/cookieConsent.ts`
- Criado: `src/components/shared/CookieConsentBanner.tsx`
- Criado: `src/lib/__tests__/cookieConsent.test.ts`
- Alterado: `src/lib/i18n/dict.en.ts` (chave `cookieBanner`)
- Alterado: `src/lib/i18n/dict.ptBR.ts` (chave `cookieBanner`)
- Alterado: `src/lib/i18n/dict.es.ts` (chave `cookieBanner`)
- Alterado: `src/routes/__root.tsx` (import + render do banner)
- Alterado: `docs/SSOT.md` (itens 3 e 9 marcados como resolvidos e
  unificados)
- Criado: este relatório
  (`docs/Prompts/RESULTADO - 73 — Banner de Consentimento LGPD Cookies.md`)

## Verificações

- `npx tsc --noEmit` — limpo, sem erros.
- `npm run test` — 252 passados, 4 skipped (pré-existentes, não
  relacionados), 0 falhas. Inclui o novo
  `src/lib/__tests__/cookieConsent.test.ts` cobrindo:
  - `hasAnalyticsConsent()` retorna `false` por padrão
    (`localStorage` vazio).
  - Retorna `true` depois de `setCookieConsent(true)` (aceite).
  - Retorna `false` depois de `setCookieConsent(false)` (rejeição).
  - Retorna `false` quando o valor persistido está corrompido/inválido.
- `npm run build` — build de produção concluído com sucesso
  (`✓ built in 1.89s`), sem erros.

## Limitação desta execução — pendente para o Paulo

Esta execução foi automatizada, sem acesso a browser interativo. Não foi
possível gerar o screenshot do banner nos 3 idiomas pedido na seção de
verificação do prompt 73. **A verificação visual do banner (aparência,
alinhamento dos botões, leitura do texto nos 3 idiomas em runtime) fica
pendente para confirmação manual do Paulo** rodando o app localmente
(`npm run dev`) e trocando o idioma pelo seletor existente.
