# RESULTADO — 89 Item 1 — Investigação: rota "home" apontando para `/app/myportfolio`

**Modo:** investigação pura, nenhum arquivo de código foi alterado nesta etapa.

Varredura prévia já havia confirmado corretos: `Header.tsx:149,235` (`goToTerminal`), `routes/index.tsx:121,130` (`ctaTerminal`), `Sidebar.tsx:62-63`/`MobileBottomNav.tsx` (tabs `home`/`myportfolio` distintas). Esta rodada cobriu os 6 pontos que a varredura anterior não tocou:

| # | Ponto | Achado | Veredito |
|---|---|---|---|
| 1 | Redirect pós-login/signup | `src/routes/auth.tsx:73,93,113,128` — os 4 pontos de `navigate({ to: "/" })` (efeito de auto-redirect, login por email, login Google, e `onComplete` do `InvestorProfileFlow`) mandam o usuário para **`/`** (a landing pública), não para `/app` nem `/app/myportfolio`. | **Divergente — mas de um terceiro destino, não do suspeito `/app/myportfolio`.** |
| 2 | Redirect ao fim do onboarding | `src/components/onboarding/InvestorProfileFlow.tsx` não tem `navigate()` próprio — seu `onComplete` é passado pelo chamador, que é exatamente o mesmo `navigate({ to: "/" })` do item 1 (`routes/auth.tsx:127-129`). | **Não é um ponto isolado — recai no achado do item 1.** |
| 3 | Fallback de rota protegida em `src/routes/app.tsx` | Rota-pai `/app` **não tem `beforeLoad` guard nenhum** — renderiza `AppLayout` incondicionalmente; acesso de convidado (deslogado) é permitido por design (`useAuth()` só é lido para fins de UI, ex: `GuestWarningBanner`). | **Não aplicável — guard não existe.** |
| 4 | Botão de logo/marca no Header | `src/components/ceiling/Header.tsx:72-84` — o ícone (`SuccessIconBox`) e o `<h1>{t.appTitle}</h1>` **não estão dentro de nenhum `<Link>` nem têm `onClick`**, em nenhuma variante (`app`/`landing`). | **Não aplicável — clicar no logo hoje não navega para lugar nenhum** (nota de UX à parte, fora do escopo deste item). |
| 5 | Outro `beforeLoad`/guard em `app.tsx` | Nenhum encontrado (mesma varredura do item 3). O único hit de `redirect` em `src/routes/app/index.tsx:18` é um comentário de código ("Home real de `/app` (rota sem redirect)"), não lógica real. | **Não aplicável.** |
| 6 | Deep links em emails transacionais | Grep por `myportfolio` no repo inteiro (fora de `docs/`) só retorna arquivos já confirmados corretos (`routeTree.gen.ts`, `routes/app/myportfolio.tsx`, `routes/app/index.tsx`, `RegulatoryDisclaimerBanner.tsx`, `Sidebar.tsx`, `MobileBottomNav.tsx`). Grep por infraestrutura de envio de email (`sendEmail`, `nodemailer`, `mailgun`, `sendgrid`, `resend`) não encontrou código de aplicação — só menções em docs/histórico e no `package.json`/`.env.example`. | **Não aplicável — não existe template de email/notificação no repositório.** |

## Conclusão

Nenhum dos 6 pontos investigados reproduz o comportamento suspeitado por Paulo (`/app/myportfolio` tratado como home). O único achado real é o **item 1**: os 4 redirects pós-autenticação em `src/routes/auth.tsx` (linhas 73, 93, 113, 128) mandam o usuário para `/` (landing pública) em vez de `/app` (Horizonte FI) — um destino diferente do suspeito original, mas também não é o ideal (um usuário recém-logado provavelmente deveria cair direto no terminal, não na landing). **Não corrigido nesta rodada** (fora do escopo do Item 1, que é investigação pura) — fica registrado como candidato a um prompt de correção futuro, a critério de Paulo.
