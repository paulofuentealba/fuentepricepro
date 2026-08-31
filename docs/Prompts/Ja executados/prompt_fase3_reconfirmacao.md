# PROMPT — Fase 3: Reconfirmação de Escopo (Rotas, Governança LGPD & Infraestrutura) Antes de Fatiar em Lotes
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Este prompt é **só de investigação/diagnóstico** — não codar nada ainda, não alterar
`firestore.rules`, não tocar em Server Functions, não modificar nenhuma rota. Objetivo: validar
contra o código atual em `dev` (já sincronizada com o fechamento total da Fase 2, commit `77cefdd`,
mais a concessão de admin claim ao Gutierre) o escopo original da Fase 3 descrito em
`super_prompt_v2_sweep_multi_skill.md`, Seção 3, e reportar o estado real de cada item antes de eu
montar os lotes de execução.

Para cada item abaixo, reporte um dos três status:
- **CONFIRMADO** — achado/lacuna ainda presente exatamente como descrito.
- **ALTERADO** — situação existe mas mudou de forma (arquivo diferente, já parcialmente resolvido).
- **JÁ RESOLVIDO / NÃO SE APLICA** — não há mais nada a fazer aqui; explique por quê.

**Contexto importante para todo o diagnóstico:** nesta investigação descobrimos que `dev` e `main`
(produção) compartilham o **mesmo projeto Firebase** (`fuente-price-pro`) e a mesma
`firebase-admin-key.json`/`FIREBASE_SERVICE_ACCOUNT_KEY` — não há separação física de ambientes.
Isso é especialmente relevante para os itens desta fase (regras de segurança, scripts
administrativos, LGPD) — qualquer mudança testada "em dev" já afeta produção diretamente. Leve
isso em conta ao avaliar risco de cada achado abaixo.

---

## BLOCO A — Varredura Completa de Rotas (`src/routes/**`)

### A.1 — Auditoria de Rotas Públicas e Administrativas
Liste todas as rotas atualmente existentes em `src/routes/` (incluindo `app.*.tsx` e subpastas) e
classifique cada uma como: pública (sem auth), autenticada (usuário logado), ou administrativa
(claim `isAdmin`). Para cada rota administrativa ou que exponha dado sensível, confirme se a guarda
de acesso (`beforeLoad` ou equivalente) está de fato implementada e testada — não presuma que existe
só porque a rota está sob `/admin` ou `/settings` por convenção de nome.

### A.2 — Rotas Órfãs ou Sem Guarda
Identifique qualquer rota que pareça deveria ter proteção de autenticação (ex.: dados de carteira,
transações, configurações pessoais) mas que não tenha `beforeLoad` checando `auth.currentUser` ou
equivalente — reporte com arquivo e linha exata.

---

## BLOCO B — Governança de Dados Pessoais & LGPD/GDPR

### B.1 — Fluxo de Exclusão Total de Conta (`accountDeletion.ts` ou equivalente)
Localize o arquivo/função responsável pela exclusão de conta (mencionado no dicionário i18n como
`settings.deleteWizard.*`). Liste **todas** as subcoleções Firestore que o fluxo de exclusão
realmente apaga hoje, e compare contra a lista completa de subcoleções que existem no projeto
atualmente (ex.: `watchlist`, `transactions`, `settings`, `feedback`, e qualquer outra criada desde
o início desta investigação — `feedback` em particular foi adicionada durante o Tier 0 da Fase 2,
Item 0.5, confirme se o fluxo de exclusão já cobre essa coleção nova).

### B.2 — Cookie Consent (`CookieConsentBanner.tsx`)
Confirme a política de retenção/expiração do consentimento de cookies — quanto tempo o
consentimento fica salvo antes de precisar ser solicitado de novo, e se o mecanismo de opt-out
(rejeitar cookies não-essenciais) realmente impede o carregamento de scripts de analytics, ou só
esconde o banner sem bloquear o carregamento de fato.

### B.3 — Auditoria de Novas Coleções (Gap desde a Varredura Original)
Liste todas as coleções/subcoleções Firestore criadas ou modificadas durante os sweeps da Fase 1 e
Fase 2 desta investigação (ex.: `feedback`, ajustes em `watchlist`/`transactions`) e confirme se
cada uma tem: (a) regra de segurança explícita em `firestore.rules` restringindo leitura/escrita ao
dono do dado, e (b) cobertura no fluxo de exclusão de conta do item B.1.

---

## BLOCO C — Segurança e Performance Server-Side

### C.1 — Sanitização em Server Functions Restantes
Liste todas as Server Functions (`*.server.ts`, `*.functions.ts` sob `src/lib/api/`) que ainda não
foram auditadas contra injeção/sanitização nesta investigação. Para referência: `dadosDeMercadoScraper.ts`
e `secEdgar.ts` já tiveram sanitização contra Regex Injection e limpeza de credenciais em logs
corrigidas na Fase 1 desta investigação — não precisa reconfirmar esses dois, foque nos restantes
(ex.: `portfolioBff.functions.ts`, `requireAdmin.server.ts`, `admin.ts`, `fred.server.ts`, e
qualquer outro endpoint que aceite input do cliente).

### C.2 — Validação de `firestore.rules` Contra Coleções Novas
Confirme se `firestore.rules` cobre explicitamente todas as coleções/subcoleções listadas no item
B.3, com regras de posse (`request.auth.uid == resource.data.uid` ou equivalente) — não apenas as
coleções administrativas (`ingestionLog`, `config/featureGates`) já confirmadas nesta investigação.

---

## Formato do Relatório de Reconfirmação

Para cada subitem (A.1, A.2, B.1, B.2, B.3, C.1, C.2): status + achados com arquivo/linha exata.
Ao final, uma seção "Achados Adicionais" para qualquer problema de segurança ou governança
encontrado durante a varredura que não conste explicitamente na lista acima — não corrija nada,
só catalogue.

Não proponha correções neste prompt — isso vem depois, em prompts de execução por lote, já com o
diagnóstico validado e fatiado por risco (mesmo padrão usado no Tier 1 e Tier 2 da Fase 2).
