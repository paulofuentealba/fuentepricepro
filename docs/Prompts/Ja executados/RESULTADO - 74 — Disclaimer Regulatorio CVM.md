# RESULTADO - 74 — Disclaimer Regulatório CVM (Banner Persistente)

## O que foi feito

1. **Componente novo**: `src/components/shared/RegulatoryDisclaimerBanner.tsx`.
   Rodapé discreto (não é alerta de erro), `role="note"`, texto centralizado
   em `text-[11px] text-muted-foreground`, permanente (sem botão de
   fechar/dispensar — diferente do `CookieConsentBanner`, que é opt-in).

2. **Decisão de posicionamento**: centralizado, não espalhado manualmente
   pelas 6 telas. O componente foi importado uma única vez em
   `src/routes/app.tsx` (o layout compartilhado por todas as rotas
   `/app/*`), logo após a área de conteúdo (`<Outlet />`) e antes do
   `MobileBottomNav`. O próprio componente decide se se renderiza,
   comparando `location.pathname` (via `useLocation` do
   `@tanstack/react-router`) contra uma allow-list explícita:
   - `/app/screener` (Screener)
   - `/app/myportfolio` (Watchlist)
   - `/app/comparator` (Comparador)
   - `/app/cashflow` (Cash Flow)
   - `/app/smartallocation` (Smart Allocation)
   - `/app/snowballeffectsimulator` (Snowball)

   Fora dessas rotas (Configurações, `/app` dashboard, docs, radar global/de
   risco, `/privacy`, `/terms`) o componente retorna `null`. Essa abordagem
   foi preferida a espalhar o banner manualmente em 6 arquivos: um único
   ponto de manutenção, e adicionar/remover uma tela do escopo do
   disclaimer no futuro é uma linha na allow-list, não uma edição de
   componente.

3. **i18n**: chave nova `regulatoryDisclaimer.message` adicionada aos três
   dicionários (`src/lib/i18n/dict.en.ts`, `dict.ptBR.ts`, `dict.es.ts`),
   ao lado de `cookieBanner`, usando **exatamente** o texto aprovado no
   prompt 74 (nenhuma palavra alterada, só formatação de arquivo).

4. **Convivência com `/terms`**: a cláusula 3 completa em
   `src/lib/legal-content.ts` / `/terms` não foi tocada. Os dois convivem:
   documento jurídico completo lá, lembrete compacto e persistente aqui.

## Testes

- Teste novo: `src/components/shared/__tests__/RegulatoryDisclaimerBanner.test.tsx`
  (16 casos), com `useLocation` e `useI18n` mockados para simular cada rota
  e cada idioma sem precisar de um `RouterProvider` real:
  - Renderiza nas 6 rotas de cálculo esperadas.
  - Não renderiza em `/settings`, `/privacy`, `/terms`, `/app` (dashboard).
  - Renderiza o texto correto nos 3 idiomas (`ptBR`, `en`, `es`).
  - Trava (snapshot literal via `toBe`) o texto aprovado nos 3 idiomas,
    para pegar qualquer edição futura acidental do teor jurídico.

- `npx tsc --noEmit` — limpo.
- `npm run test` (suíte completa) — 268 passed, 4 skipped, 0 failed.
- `npm run build` — build de produção concluído sem erros.

## Verificação visual

Este ambiente de execução é não interativo e não tem acesso a um browser
real, então não foi possível tirar um screenshot do app rodando mostrando
o banner nas 3 telas/3 idiomas, como pedido no item 2 da seção
"Verificação obrigatória" do prompt. Em vez disso, a cobertura foi feita
via teste automatizado (acima), que confirma texto e condição de
exibição por rota e idioma. **A confirmação visual final (rodar
`npm run dev`, abrir `/app/screener` nos 3 idiomas e visualmente conferir
o rodapé) fica pendente para o Paulo confirmar manualmente.**

## Impacto

Resolve o item 4 da tabela de pendências do `docs/SSOT.md` (Seção 6) e
desbloqueia o início de qualquer trabalho futuro na Fase 4 (Módulo de
IRPF), conforme a regra de bloqueio já registrada nas Seções 2.3 e 4.2 do
SSOT.
