# Varredura Geral — Acesso Direto ao Repositório

## Fuente Price Pro — achados além do que já vínhamos rastreando por ZIP

---

## 🎯 Achado mais importante: existe um backlog paralelo que a gente não conhecia

`BACKLOG_V2.md`, na raiz do projeto, é um documento de Produto (não veio da nossa auditoria de UX) com 4 épicos estratégicos, e tem itens de peso real que **não estão** na nossa lista de FPPs nem no plano de sprints P3 que já montamos:

- **Monetização de verdade**: paywall Free vs. PRO com Stripe na rota `/pricing`, hoje aparentemente sem enforcement real de permissão no Firestore
- **Painel administrativo** (`/admin`) — não existe hoje, seria do zero
- **Onboarding regulatório / KYC-suitability** — perfilamento de risco do investidor, com implicação de compliance de mercado financeiro
- **LGPD/GDPR de verdade**: banner de cookies, direito ao esquecimento (excluir conta + limpar Firestore), portabilidade de dados — hoje o app não parece ter nada disso
- **Assistente de IA pra insights pessoais** — um agente lendo a carteira e sugerindo ações
- **Eventos corporativos automatizados** (splits, bonificações) — só que isso já tem um começo de código (ver seção abaixo)

Isso muda a leitura do que "falta" no produto. Nosso plano de P3 (FPP-022 a 030) cobre bem a parte de dado financeiro, mas não cobre nada de monetização, admin, ou compliance legal — que são pilares de negócio, não só produto.

---

## 🧩 Trabalho já começado que se sobrepõe ao nosso planejamento

Antes de rodar a Sprint 1 do nosso plano P3 (registro de proventos + importação), vale conferir isso:

- **`src/lib/dataIngestion/b3Parser.ts`** existe — parece ser um começo de parser pra nota de corretagem B3, exatamente o que planejamos do zero na FPP-025
- **`src/lib/corporateEvents.ts`** (3.98 KB) existe — eventos corporativos é item do `BACKLOG_V2`, listado como "não feito", mas já tem arquivo com conteúdo
- **`src/lib/csv.ts`** existe — conecta com a parte de import CSV que planejamos

Isso pode ser progresso real aproveitável, ou pode ser um começo abandonado tipo o `seedDevData.ts` que já limpamos. De qualquer forma, **vale mandar investigar e reportar o estado desses 3 arquivos antes de escrever o Prompt da Sprint 1 do P3** — economiza trabalho duplicado ou evita construir em cima de uma base inconsistente.

---

## ⚠️ `.env` sem proteção no `.gitignore`

Conferi o `.gitignore` — `.env` **não está listado**. E o `git status` de uma rodada anterior já tinha mostrado `.env` como "modified", ou seja, rastreado pelo git.

O conteúdo hoje é majoritariamente client-safe por design (chave pública do Firebase, chave "publishable" do Supabase — essas são feitas pra ir pro bundle do navegador, a segurança real está nas regras do Firestore/RLS, não em esconder essas chaves). Mas tem um `# RESEND_API_KEY=re_123456789` comentado — se um dia alguém preencher essa linha com a chave real (chave de servidor pra envio de e-mail, essa sim precisa ficar secreta) e commitar sem lembrar de proteger o arquivo antes, ela entra na história do git permanentemente, mesmo que "removida" depois.

**Ação recomendada**: adicionar `.env` ao `.gitignore` agora, antes que isso aconteça — é barato agora, caro depois.

Também notei que há credenciais do **Supabase** no `.env`, mas não achei nenhuma referência a Supabase dentro de `src/` — parece resíduo de uma migração antiga pro Firebase (bate com commits antigos do git log tipo "migrate CRUD operations from local storage to Firebase Firestore"). Se for isso mesmo, essas 3 linhas de Supabase no `.env` são lixo órfão, mesma categoria do `seedDevData.ts`.

---

## 🏗️ Onde está o maior acoplamento de verdade: `Watchlist.tsx`

Medi o tamanho dos arquivos de `src/components/ceiling/`. `Watchlist.tsx` é o maior (21,26 KB) — e não por acaso: **foi literalmente o arquivo que quebrou mais vezes ao longo de toda essa auditoria** (import do `MetricBox`, tipo de `editing`/`detail`, erro do `OppFilter`, adição do empty state). Ele concentra hoje: seção de KPIs herói, gráfico de alocação, barra de filtros, grid/lista de ativos, orquestração dos diálogos de edição/detalhe, e mais.

Isso não é coincidência — é sintoma de um arquivo com responsabilidade demais concentrada num só lugar. Toda vez que qualquer parte muda, o risco de quebrar outra parte não relacionada aumenta.

**Sugestão pra quando fizer sentido** (não urgente, mas vale registrar): quebrar `Watchlist.tsx` em componentes menores — um pra seção de KPIs, um pra barra de filtros, um pro grid, um pra orquestração dos diálogos. Reduz a área de risco de qualquer mudança futura.

`src/lib/watchlist.ts` (21,59 KB) é o maior arquivo de lógica em `src/lib/` — mesma categoria de atenção, ainda que menos crítico já que lógica pura tende a ser mais fácil de testar isoladamente que componente de UI.

---

## 📦 Dependências: versões arriscadas pra produção

- **`nitro: "3.0.260603-beta"`** — uma versão **beta** fixada como dependência do motor de servidor (TanStack Start roda em cima do Nitro). Isso é risco real pra estabilidade de produção — vale monitorar releases estáveis do Nitro e migrar assim que houver uma versão não-beta compatível
- Stack em geral está em versões bem recentes/agressivas (Vite 8, Vitest 4, React 19.2, TanStack Router 1.170) — não é errado por si só, mas aumenta a chance de bug ainda não descoberto pela comunidade em cada uma dessas libs

---

## 🧹 Arquivos soltos na raiz — mesma categoria do `seedDevData.ts`

`clean.cjs`, `merge.cjs`, `test-bbas3.ts`, `test-server.js`, `test_search.ts` — scripts avulsos na raiz do projeto, fora de `src/` e fora de `scripts/`. Pelo conteúdo, `merge.cjs` parece ser o script que gerou a estrutura atual do `AssetCard.tsx` a partir de um `ResultCard.tsx` antigo — é basicamente um "recibo histórico" de uma refatoração já feita, não código que roda mais. Candidatos a limpeza, mesma lógica do que já aplicamos ao `seedDevData.ts`.

---

## ✅ Coisas que estão bem, vale reconhecer

- **`scripts/forbid-legacy-tagline.js`**: gate de build genuinamente bem escrito — verifica que nenhum texto de marketing antigo reapareça no código antes de buildar. Contrasta bem com os scripts de patch frágeis que vimos mais cedo na sessão — esse é um exemplo de "proteção automatizada" bem feita
- **`AGENTS.md`** existe e documenta as Golden Rules 1 e 2 formalmente — só que está **desatualizado**: não reflete as revisões que fizemos nas Regras 3 e 4, nem inclui as Regras 5 e 6. Vale atualizar esse arquivo com a versão completa e revisada — é o que o Antigravity realmente lê como instrução permanente, então uma versão desatualizada ali pesa mais que qualquer coisa que eu te mande em chat

---

## Resumo de prioridade

1. **`.env` no `.gitignore`** — 1 minuto, elimina um risco crescente
2. **Investigar `b3Parser.ts`, `corporateEvents.ts`, `csv.ts`** antes de começar a Sprint 1 do P3 — pode economizar trabalho duplicado
3. **Atualizar `AGENTS.md`** com as Golden Rules completas e revisadas
4. **Decidir o que fazer com o `BACKLOG_V2.md`** — vale conversarmos sobre como esses 4 épicos se encaixam (ou não) no que já planejamos
5. Limpeza dos scripts órfãos da raiz — baixa prioridade, mas fácil
6. Migrar o Nitro pra versão estável assim que disponível — monitorar, não urgente agora
7. Refatoração do `Watchlist.tsx` — registrado, não urgente, mas é o ponto de maior fragilidade estrutural do projeto
