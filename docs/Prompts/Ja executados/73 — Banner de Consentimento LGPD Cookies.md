# 73 — Banner de Consentimento LGPD/Cookies (Unificado)

## Contexto e decisão de escopo (leia antes de tudo)

O SSOT lista dois itens que, na prática, são o mesmo banner: "Banner de
consentimento LGPD" (item 3) e "Banner de Cookies" (item 9). Tratar como
**um único banner**, não dois — construir dois banners de consentimento
separados confundiria o usuário e não tem justificativa legal pra
existirem apartados.

Fundação já pronta: `/privacy` e `/terms` publicados (12/08), conteúdo
aprovado. Hoje **não existe nenhum cookie não-essencial** rodando em
produção (PostHog ainda não foi ativado) — então o banner precisa ser
construído **pronto pra quando o PostHog entrar**, não como algo sem
função hoje.

## Escopo técnico

### 1. Componente `CookieConsentBanner.tsx`

- Aparece na primeira visita (qualquer rota pública ou autenticada),
  banner fixo no rodapé da tela, discreto (não modal bloqueante — não
  impedir o uso do produto enquanto decide).
- Duas opções: "Aceitar" e "Rejeitar" (não-essenciais) — nunca só
  "Aceitar", que não é consentimento válido sob LGPD.
- Categorias: **Essenciais** (sempre ativos, não pedem consentimento —
  autenticação, funcionamento do app) vs. **Analytics** (opt-in,
  controla se o PostHog, quando ativado, pode rodar).
- Link pra `/privacy` dentro do banner (reaproveitar `<Link>` já
  existente, não duplicar rota).
- Persistir a escolha (aceitar/rejeitar analytics) em `localStorage`
  (não precisa Firestore — é preferência de navegador, não dado de
  conta) com um valor versionado (ex: `cookieConsent.v1`), pra permitir
  reabrir o banner no futuro se a política mudar substancialmente.

### 2. Preparar o gate pro PostHog (sem ativar o PostHog nesta rodada)

- Criar um helper `hasAnalyticsConsent(): boolean` lendo o valor do
  `localStorage`, exportável de um módulo central (ex:
  `src/lib/cookieConsent.ts`).
- **Não instalar nem inicializar o PostHog aqui** — isso é o item 75
  (discovery de instrumentação), separado. Só deixar o helper pronto
  pra ser consumido quando aquele prompt rodar.

### 3. i18n

Texto do banner nos 3 idiomas, chaves novas sob `t.cookieBanner.*` ou
seção equivalente.

## Regras obrigatórias

- Não bloquear o uso do produto enquanto o banner está visível — é
  informativo/opt-in, não um paywall de acesso.
- Não ativar nenhuma biblioteca de analytics nesta rodada — só a
  infraestrutura de consentimento.
- Rejeitar deve ser tão fácil quanto aceitar (mesmo peso visual nos dois
  botões) — LGPD exige que recusar não seja artificialmente mais difícil.

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot do banner nos 3 idiomas
3. Confirmar que `hasAnalyticsConsent()` retorna `false` por padrão até
   o usuário decidir, e reflete a escolha corretamente depois

## Ao terminar

Atualizar `docs/SSOT.md`, itens 3 e 9 da tabela (marcar os dois como
resolvidos pelo mesmo banner, explicando a unificação). Trabalhar em
`dev`.
