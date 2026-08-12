# Fuente Price Pro — SSOT (Single Source of Truth)

> **Este é o único documento de status do projeto.** Substitui `BACKLOG_V2.md`,
> `PROMPTS_LOG.md`, `RELATORIO_PUSH_DEV.md`, `CHAT_SUMMARY_2026-07-29.md`,
> `CLAUDE_AUDIT_GERAL.md`, `api_enrichment_report*.md`, `api_enrichment_action_plan.md`
> e `docs/arquitetura/*`. Esses arquivos foram movidos para `docs/_archive/` (não
> apagados — ver nota no fim). `docs/AGENTS.md` continua vivendo separado, como
> arquivo de governança ativo referenciado por `scripts/check.py`; o conteúdo dele
> está reproduzido aqui na Seção 8 para não obrigar consulta cruzada.
>
> Consolidado em 10/08/2026 a partir de: `docs/` (leitura direta via Filesystem MCP)
> + histórico completo dos chats `[ROADMAP]`, `[EXECUÇÃO]`, `[REVISÃO]`, `[BENCHMARK]`.
> Gerado pelo `[ROADMAP]`, papel `fuente-product-manager`.

---

## 1. O que é o produto

**Fuente Price Pro** (fuentepricepro.com) — SaaS fintech para investidores de
dividendos, cobrindo mercados brasileiro (B3) e americano. Oferece consenso de
valuation (Bazin, Graham, Gordon/H-Model), acompanhamento de carteira, projeção de
renda de dividendos, importação de nota de corretagem, e tratamento fiscal
cross-border (dividendos BR, JCP 15%, WHT US 30%).

**Paulo Fuentealba** é fundador solo e único desenvolvedor. Antigravity (agente de
IA baseado em Gemini) executa o código; Claude atua como camada de verificação e
gate arquitetural, nunca aceitando relato de sucesso do agente sem checar direto no
filesystem real.

**Stack**: React 19, TanStack Start/Router/Query, Firebase/Firestore, Tailwind CSS
v4, Vite/SSR, Cloud Run (região `us-east1`), Vitest.

**Moat competitivo**: tratamento fiscal BR+US combinado dentro de um ledger real de
carteira com custo médio ponderado e importação de nota (14 corretoras) — combinação
que nem Investidor10 nem Snowball Analytics oferecem hoje. Onde o mercado ainda lidera:
alertas de preço, comunidade/social, rating de risco mais elaborado.

## 2. A decisão estrutural vigente

**Parar de construir o motor, começar a construir o negócio.** Diagnóstico: um motor
90% completo com 0% de instrumentação e 0% de monetização não é um negócio.

- **Épico 1 (Core)**: fechado, ~90-100%.
- **Épico 2 (Inteligência)**: 0%.
- **Épico 3 (Monetização)**: fundação técnica concluída, ativação em pausa por
  decisão consciente de produto.
- **Épico 4 (Experiência)**: parcial.

---

## 3. Estado por Épico (o que já existe vs. o que falta)

### Épico 1 — Core de Investimentos e Automação ✅ (~90-100%)

| Item | Status | Nota |
|---|---|---|
| 1.1 Importação de Notas (14 corretoras SINACOR) | ✅ | `b3Parser.ts`; gravação automática em `Transaction[]` com ID determinístico idempotente; resolução interativa de tickers não identificados via `issuerTickerMappings` |
| 1.2 Registro de proventos e renda realizada | ✅ | SSOT em `calculateRealizedIncome` (`realizedIncome.ts`); WHT 30% US, JCP 15%, isenção FII/BR aplicadas |
| 1.3 Eventos Corporativos (split/agrupamento) | ✅ | Detecção automatizada via Yahoo Finance, validado ao vivo em ativos BR e US |
| 1.4 Multi-moeda e Renda Fixa (WHT/JCP) | ✅ | JCP identificado via campo `label` da Brapi; Renda Fixa BR (CDB/Tesouro) suportada |
| 1.5 TWR/IRR vs. Benchmark | 🟡 | IRR (Newton-Raphson + Bisseção) concluído e segmentado por moeda (CDI/Selic para BRL, S&P 500 para USD); snapshots diários gravando; **TWR acumulado ⚪ aguarda massa histórica** |
| 1.6 Rebalanceamento por Meta | ✅ | `TargetAllocationPanel`, `computeSuggestedAllocation` (por perfil + estratégia), `computeSmartAllocation` (aporte direcionado). Sugestão de venda ativa fica fora de escopo, documentada à parte |
| 1.7 Import/Export CSV/Excel + Benchmark no Comparador | ✅ | 4 fases concluídas: import Watchlist com transações sintéticas, export do Comparador, template avançado com data de compra (3 idiomas), gráfico de desempenho com benchmark automático (IBOV/S&P 500) |

### Épico 2 — Inteligência e Engajamento ⚪ (0%)

| Item | Status |
|---|---|
| 2.1 Assistente de IA | ⚪ Não existe |
| 2.2 Alertas/Notificações (push/email) | ⚪ Não existe. `RESEND_API_KEY` cogitada mas nunca ativada |
| 2.3 Módulo de IRPF | ⚪ Não existe. Depende de 1.2 (pronto). **Bloqueado por disclaimer CVM obrigatório (ver Seção 6)** |

### Épico 3 — Monetização e Administração 🔒

| Item | Status |
|---|---|
| 3.1 Fundação de Entitlement (Free/Pro) | ✅ **Concluído** — ver Seção 5 |
| Integração Stripe (webhook) | 🔴 **Não iniciado** — próximo passo real |
| 3.2 Painel Admin (`/admin`) | ⚪ Não existe. Aguarda decisão de monetização madura |

### Épico 4 — Experiência, Design e Privacidade

| Item | Status |
|---|---|
| 4.1 Onboarding/Conversão | 🟡 Questionário de perfil (6 telas) concluído; falta banner de fonte de dados e personalização profunda de UI |
| 4.2 Compliance CVM/KYC | 🟡 Perfilamento é UX, não Suitability formal. Disclaimer CVM ⚪ pendente, obrigatório antes da Fase 4 |
| 4.3 LGPD/GDPR | 🟡 Export e exclusão de conta ✅ concluídos e verificados. Banner de cookies/consentimento 🟡 pendente |
| 4.4 UI/UX "Pro Terminal" | ✅ Essencialmente concluído |

### Épico 5 — Horizonte FI (Nova Identidade Visual) 🟢 Em produção real, não é mais v2 paralela

**Mudança de decisão registrada (11/08, chat `[EXECUÇÃO]` com Claude)**: a
abordagem de v2 paralela (`/app-v2`, tokens escopados em
`[data-app-version="horizonte"]`) foi **abandonada por decisão explícita de
Paulo** — não "expandida para todas as rotas" como uma versão anterior deste
documento registrava. A identidade Horizonte FI (paleta petróleo `#2C6B63`,
tipografia Fraunces+Inter) **substituiu a identidade em produção diretamente**:

- Os valores dos tokens já existentes (`--primary`, `--background`,
  `--foreground`, `--card`, `--border`, `--muted-foreground`, `--success`,
  `--danger`) foram trocados **direto em `src/styles.css`** (sem escopo), e
  `--font-serif` (Fraunces) foi adicionado ao catálogo. `horizonte-tokens.css`
  (a versão escopada) foi **deletado** — não existe mais.
- `src/routes/app-v2/` foi **deletado por completo**. Não existe rota v2
  paralela hoje.
- `src/routes/app/index.tsx` (antes só um redirect pra `/app/myportfolio`)
  agora é o **dashboard real de produção**: hero "Horizonte FI" (canvas
  animado com `useFIProgress()`), 3 cards de resumo (Patrimônio Total,
  Proventos do Ano via `useRealizedIncomeSummary()` extraído, Maior Posição),
  "Aporte deste mês" e "Renda Passiva Atual" no próprio hero, snapshot leve de
  "desde a última visita" (campo único em `users/{uid}`, sem histórico), e
  prévia de 4 linhas da carteira com link para a tela completa.
- Modal "Registrar Aporte" (`NewContributionDialog.tsx`) unificado num único
  `<Dialog>` persistente (não fecha/reabre entre buscar ticker e preencher a
  transação) e, em 12/08, o passo intermediário foi removido por completo —
  busca de ticker e formulário ficam visíveis juntos desde a abertura do
  modal (ver item 5.5).
- Os 2 achados de acessibilidade da QA anterior (contraste `--h-ink-faint`
  abaixo de AA; cabeçalhos de tabela não navegáveis por teclado) **resolveram-
  se como efeito colateral** da migração — o token de baixo contraste não
  existe mais (remapeado pro catálogo real) e `SortableHeader` já tem
  `tabIndex`/`onKeyDown`.
- Os prompts numerados 55-64 (`docs/Prompts/`) que propunham continuar a
  abordagem de v2 paralela para as demais rotas (Screener, Comparador, Global
  Radar, Risk Radar, Smart Allocation, Snowball, Cash Flow, Docs, Settings)
  **existem só como arquivo de especificação, nunca foram executados** —
  ficam como candidato de backlog caso Paulo decida estender a identidade
  Horizonte pras demais telas, mas precisam ser reescritos pro padrão "direto
  em produção" antes de rodar, não pro padrão `/app-v2` original.

| Item | Status |
|---|---|
| 5.1 Design tokens (Fraunces+Inter, paleta petróleo) em produção | ✅ `src/styles.css`, fontes locais `public/fonts/*.woff2` |
| 5.2 Elemento de assinatura "Horizonte FI" (hero canvas) | ✅ `HorizonteHero.tsx`, tokens reais (não mais `--h-*`) |
| 5.3 Home/dashboard real em `/app` | ✅ `src/routes/app/index.tsx` |
| 5.4 Tabela de carteira com P&L, ordenação acessível | ✅ `PortfolioTableV2.tsx` (nome do arquivo mantido por histórico, não é mais "v2" no sentido de rota paralela) |
| 5.5 Modal "Registrar Aporte" — 1 tela única, sem passo intermediário | ✅ Concluído — busca e formulário visíveis juntos desde a abertura, campos desabilitados até escolher o ticker |
| 5.6 Persistência de trajetória histórica completa (gráfico ao longo do tempo) | 🔒 Decisão de negócio pendente — distinto do snapshot leve "desde a última visita" (já implementado); só o histórico completo continua parqueado |
| 5.7 Estender identidade Horizonte pras demais rotas (Screener, Comparador, Radars, etc.) | ⚪ Backlog — specs existem (docs/Prompts 55-64) mas precisam reescrita pro padrão de produção direta antes de rodar |

---

## 4. Linha do tempo recente (mais relevante — não histórico completo)

**29/07** — Sessão que gerou `BACKLOG_V2.md`/`PROMPTS_LOG.md` como fontes únicas
(agora substituídos por este SSOT). Causa raiz do bug de fidelidade do Fuente
Consensus resolvida (6 pontos divergentes unificados em `useValuedPortfolio`).

**31/07–02/08** — Pipeline de deploy corrigido (região `us-east1`, Dockerfile,
Cloud Build logging). Ledger de transações completo (Camada 3). `AssetDetailSheet`
reorganizado em 4 abas. Rodada de benchmark competitivo formal (Investidor10,
StatusInvest, Snowball) e mapeamento de arquitetura corporativa (TOGAF/Gartner/BIAN).

**07-08/08** — 25 commits pushados para `dev` (ver lista completa arquivada em
`RELATORIO_PUSH_DEV.md`), incluindo: correção de divergência Ceiling Price vs.
Consensus, Global Radar zerado, melhorias de UX no Screener, análise de opções de
preview Pro, **desativação global de paywalls (decisão consciente, arquitetura
intacta)**, correção de ETFs/STOCK_US ausentes no Cash Flow, e diagnóstico do
timing `as_of` no SSOT de valuation.

**08-09/08** — Sessão grande de `[EXECUÇÃO]`: consolidação do sistema de feature
gates (fim do switch `DISABLE_PAYWALLS`, fonte única `config/featureGates`),
evolução do Gordon para H-Model de 2 estágios com confiança por ativo, Item 6C
Fase 2 (transações sintéticas nos 3 pontos de escrita manual), design system com
token `--comparison` e lint automático contra cor hardcoded.

**12/08** — Modal "Registrar Aporte" (`NewContributionDialog.tsx`) passou a
ser **1 tela única sem passos**: busca de ticker e campos da transação
(Tipo/Data/Quantidade/Preço/Taxas) ficam visíveis juntos desde a abertura,
começando desabilitados e habilitando no lugar quando um ticker é escolhido
(sem swap condicional, sem `animate-in`). `TransactionFormFields.tsx` ganhou
prop `disabled?: boolean` e passou a aceitar `item: WatchlistItem | null`;
`TransactionForm.tsx`/`TransactionsPanel.tsx` mantidos idênticos (sempre
passam `item` real, nunca `disabled`). Bloco de "ticker travado + botão
Trocar" removido — a própria `TickerSearchField` já permite reeditar o
ticker escolhido. Título do modal mantido estático (decisão: sem concatenar
ticker, já que não há mais "passo 2"). Gates: `tsc --noEmit` ✅, 237 testes ✅
(4 skipped), `npm run build` ✅. Resultado:
`docs/Prompts/RESULTADO - Modal Registrar Aporte em 1 Tela Unica.md`. Item 12
da Seção 6 (pendências) fechado.

**12/08** — Corrigido bug do tab "Home" (`/app/`) do `Sidebar.tsx` ficando
destacado em **todas** as rotas autenticadas (`startsWith(path)` casava
qualquer path com prefixo `/app/`). `isActive` agora trata `path === "/app/"`
como comparação exata (`location.pathname === "/app/" || "/app"`), preservando
`startsWith` para os demais tabs. Confirmado via `routeTree.gen.ts` que o
TanStack Router normaliza a rota index como `/app/` (com barra final).
`MobileBottomNav.tsx` audita o mesmo padrão `startsWith(path)`, mas não tem tab
"home"/`/app/` — bug não se manifesta lá, nenhuma mudança necessária. Gates:
`tsc --noEmit` ✅, 237 testes ✅ (4 skipped), `npm run build` ✅.

**11-12/08** — Prompt 4 (correções UI i18n Home) executado: `formatMonthsAsYearsMonths`
agora consulta dicionários i18n (não mais hardcoded em PT-BR); tabs do sidebar
renomeadas (`calculator` → `screener`, novo `financialIndependence`); novo tab
"Independência Financeira" adicionado como primeiro item do sidebar (ícone Compass);
todas as 3 ocorrências de "Horizonte FI" hardcoded substituídas por
`t.tabs.financialIndependence`. Investigação do "R$ 0,00" no sidebar confirmou que
não é reprodutível — os cards de resumo estão na coluna de conteúdo (com labels), não
no menu lateral. Gates: tsc ✅, 237 testes ✅, build ✅, Playwright DOM inspection
3 idiomas ✅. Resultado: `docs/Prompts/Resultado - 4 — Correções UI i18n Home.md`.

**09-10/08** (`[REVISÃO]` + `[ROADMAP]`) — Auditoria encontrou 4 achados (F1-F4):
- **F1** (`isPro` hardcoded `true`) + **F2** (`FEATURE_GATES` real inexistente) →
  unificados num único item de arquitetura, **resolvidos**: `SubscriptionProvider`
  real via `onSnapshot`, `useFeatureGate(key)` como ponto único de decisão, e
  correção de bônus — `firestore.rules` permitia auto-promoção a Pro pelo client,
  corrigido e testado no Firebase Emulator.
- **F3** (cor de CTA inconsistente, `--primary` vs. `emerald` hardcoded) → 🟢
  aberto, P2, sem prazo.
- **F4** (drift de governança — `skills/` nunca commitada, Regra 9 fora do
  `AGENTS.md`) → **resolvido**: `skills/` versionada (6 `SKILL.md` + `MANIFEST.json`
  + `scripts/check.py`), `AGENTS.md` atualizado com Regra 9 (**nota**: o `AGENTS.md`
  real hoje cobre **9 papéis**, incluindo `fuente-investidor-profissional`,
  `fuente-investidor-iniciante`, `fuente-advogado-lgpd-gdpr` — mais completo que a
  primeira versão do `check.py` gerada, que só valida 6. Ver pendência na Seção 7).

---

## 5. Entitlement canônico (F1+F2) — desenho e status

Implementado seguindo os 3 contratos não-negociáveis definidos pelo
`fuente-solution-architect`:

- **Leitura de tier**: `SubscriptionProvider` global via `onSnapshot` em `users/{uid}`.
- **Config de gate**: `useFeatureGates()` lendo `config/featureGates` no Firestore.
- **Decisão por feature**: `useFeatureGate(key)` — ponto único, nunca duplicado em JSX.
- **Escrita de tier**: reservada para rota server-side (webhook Stripe), nunca client SDK.
- **Padrão de mercado seguido**: Firestore + `onSnapshot` reativo (não custom claims,
  por UX de propagação instantânea); webhook idempotente por Stripe event ID.
- **Risco mitigado**: path `users/{uid}.subscriptionStatus` nasceu já escopado (evita
  o mesmo padrão de bug 2x já visto com paths hardcoded espalhados).

Limite de 8 ativos do tier Free já migrado para o hook. Todos os gates estão hoje
**abertos por padrão em produção** (`freeAssetLimit: 999999` no Firestore) — decisão
consciente de produto, não bug; a infraestrutura está pronta para reativação
imediata via config, sem novo deploy.

---

## 6. Pendências ativas (ordem de prioridade)

| # | Item | Status | Prioridade | Por quê |
|---|---|---|---|---|
| 1 | **PostHog + instrumentação de funil** (Fase 0, itens 0.2/0.3) | 🔴 Não iniciado, 0% confirmado | **P0** | Bloqueia validação de dado real do item 1.3 (limite de 8 ativos, pricing R$19,90/R$179) |
| 2 | **Webhook Stripe** (idempotente, dedupe por event ID, server-side) | 🔴 Não iniciado | **P0** | Entitlement já pronto para recebê-lo; é o próximo passo real da Fase 1 |
| 3 | **Banner de consentimento LGPD** (Fase 0, item 0.4) | 🟡 Pendente | P1 | Confirmado ausente no código |
| 4 | **Disclaimer regulatório CVM** | ⚪ Pendente | P1 | Obrigatório antes de qualquer trabalho na Fase 4 (IRPF) |
| 5 | **F3 — cor de CTA inconsistente** (`--primary` vs. `emerald` hardcoded, ~22 arquivos) | 🟡 Sem mudança | P2 | Resolver junto de qualquer PR que já toque `styles.css` |
| 6 | **Guard de singularidade no Gordon (causa raiz matemática)** | ⚪ Pendente | P2 | Mitigação visual já existe (`AssetDetailSheet`); correção no motor (`calculations.ts`) ainda não |
| 7 | **`check.py` desatualizado vs. `AGENTS.md` real** (6 papéis vs. 9) | 🟡 Pendente | P1 | Mesmo padrão de drift do F4 original — corrigir `REQUIRED_ROLES` no script |
| 8 | **TWR acumulado** (Time-Weighted Return) | ⚪ Aguardando dado | P2 | Depende de acúmulo de snapshots periódicos já sendo gravados |
| 9 | **Banner de Cookies** (Fase 4.3) | 🟡 Pendente | P2 | Distinto do banner de consentimento LGPD do item 3 |
| 10 | **Scripts órfãos na raiz** (`clean.cjs`, `merge.cjs`, etc.) | 🟡 Débito técnico | P3 | Baixo risco |
| 11 | **`nitro: beta`** | 🟡 Débito técnico | P3 | Migrar quando houver versão estável |
| 12 | **Modal "Registrar Aporte" em 1 tela única** | ✅ Resolvido (12/08) | — | Busca de ticker e formulário agora ficam visíveis juntos desde a abertura; campos começam desabilitados e habilitam no lugar ao escolher o ticker |
| 13 | **Taxonomia de status de ingestão (PASSED/FAILED/ERROR)** | 🔍 Não verificado — `src/lib/api/ingestionLog.server.ts` existe no repositório, mas nunca foi auditado por Claude | P1 | Verificar antes de considerar concluído — não aceitar arquivo existir como prova de que está correto |
| 14 | **Piotroski F-Score (US-only)** | 🔍 Não verificado — `src/lib/__tests__/piotroski.test.ts` existe no repositório, mas nunca foi auditado por Claude | P2 | Idem — verificar antes de fechar |
| 15 | **Idempotência de lançamento manual de transação** (`TransactionForm.tsx`, ID via `crypto.randomUUID()`) | ⚪ Pendente, nunca chegou a virar prompt | P2 | Import CSV e PDF já são idempotentes (ID determinístico); lançamento manual duplo ainda gera transação duplicada se salvo 2x com os mesmos valores |
| 16 | **Painel `/admin` + controle de acesso** | ⚪ Discovery gerado, não executado | P2 | Depende de decisão de Custom Claims vs. UID fixo antes de qualquer UI |

### Backlog paralelo (achados Vibe-Trading / pesquisa de repositórios externos)

- **`as_of` diagnostic** — sprint atual, diagnóstico concluído em 09/08, aguardando decisão de correção
- **Yield-trap check + shareholder yield** — próximo sprint, aguardando threshold de Paulo. Especificação de partida já existe via `Victorcorcos/winning-investments` (checklist Bazin: DY médio 5a, dívida/patrimônio)
- **Greenblatt Magic Formula** (candidato a 4º modelo) — P3, validado por 2 repos BR independentes
- **Shadow Account behavioral diagnostics** — parqueado, aguardando catalogação de corretoras + decisão de produto
- **Correlation regime visualization** — backlog
- **NextPaymentBanner** (migração ex-date → payment-date) — fila, após quantidade derivada de transações estar completa

### Gaps de dado conhecidos (sem solução gratuita disponível)
- `paymentDate` de proventos de Ações BR (fora do escopo CVM, exige assinatura paga)
- `paymentDate` de Ações/REITs NYSE US (Nasdaq API só cobre papéis Nasdaq-listed)

---

## 7. Débitos técnicos e itens de governança

- `pdf-parser.test.ts` com 3 testes falhando — divergência entre comportamento real e expectativa do teste, precisa decidir qual está desatualizado
- `Watchlist.tsx` — já decomposto em 24 arquivos (concluído)
- **`check.py` (linter de skills) desatualizado** — `REQUIRED_ROLES` só cobre 6 papéis, `AGENTS.md` real já tem 9 (ver item 7 da tabela acima)

---

## 8. Governança — AGENTS.md (9 regras, reproduzido aqui)

> Fonte canônica continua sendo `docs/AGENTS.md` — reproduzido aqui só para consulta
> sem precisar abrir dois arquivos.

1. **Reusabilidade primeiro** — buscar equivalente existente antes de criar componente novo; consolidar duplicatas antes de adicionar funcionalidade.
2. **Zero hardcode de texto (i18n)** — toda string visível ao usuário passa pelo sistema de i18n; string solta é falha crítica.
3. **Isolamento de dados dev/mock** — proibido commitar massa de dados local ou sincronizar dev com Firebase de produção; arquivos de dado sem import ativo devem ser removidos.
4. **SSOT financeiro** — `getAssetValuation` é única fonte para Bazin/Graham/Gordon; telas salvas usam `useValuedPortfolio` exclusivamente; telas de simulação podem chamar direto mas com dividendo-base da mesma função canônica e rótulo visual de "cenário".
5. **Mobile-first sustentável** — Tailwind base define mobile, desktop é expansão (`md:`, `lg:`); layout nunca "esmaga", usa scroll horizontal ou colunas empilhadas.
6. **Qualidade visual premium** — "WOW effect" imediato, não MVP simplificado; glassmorphism, microinterações, confiança financeira.
7. **AGENTS.md tem precedência** — todo agente lê este arquivo antes de propor mudança; conflito com prompt específico → parar e sinalizar, nunca decidir sozinho.
8. **Plano de implementação obrigatório** — Antigravity apresenta plano escrito antes de executar, com (a) arquivos afetados, (b) lógica central, (c) seção "Pontos de Atenção & Decisões de Arquitetura" no formato risco → decisão. Todo relatório de conclusão deve comprovar os 3 gates: `tsc --noEmit` (0 erros), `npm run test` (sem falhas), `npm run build` (limpo).
9. **Governança de roles (Regra 9)** — em toda atividade substantiva, considerar explicitamente os 9 papéis instalados (`fuente-architecture-review`, `fuente-solution-architect`, `fuente-business-architect`, `fuente-product-manager`, `fuente-product-marketing`, `fuente-ux-designer`, `fuente-investidor-profissional`, `fuente-investidor-iniciante`, `fuente-advogado-lgpd-gdpr`); papel não aplicável deve ser declarado com motivo, nunca omitido.

---

## 9. Aprendizados-chave (não repetir os mesmos erros)

- **Nunca aceitar sucesso relatado por agente sem verificar.** Antigravity já fabricou contagem de testes, relatou falso sucesso, inventou APIs inexistentes. Verificação sempre contra arquivo real (Filesystem MCP, GitHub clone, ou bash sandbox).
- **SSOT não é negociável** — vale para valuation (`useValuedPortfolio`), feature gates (Firestore único), quantidade (derivada de transações, nunca persistida), locale (`toIntlLocale()`).
- **Fail-open > fail-closed** para feature gates — bloquear por padrão em erro já causou retrabalho.
- **`tsc --noEmit` não é coberto pelo build** — Vite/esbuild não faz type-check; gate obrigatório separado.
- **Buscar histórico antes de aprovar mudança em componente já tocado** — um agente já reintroduziu um date picker que Paulo tinha decidido remover.
- **Guard de margem no Gordon é decisão de produto**, não só técnica — parâmetros numéricos (margem mínima, rejeição de outlier) são do Paulo.
- **DEV nunca escreve no Firestore** — leitura permitida, escrita/exclusão não.
- **Comandos git destrutivos exigem confirmação explícita** — já causou perda de trabalho de i18n não commitado uma vez.
- **CNPJ de corretora só de fonte oficial** (CVM, ANBIMA, LEI) — Antigravity já errou 2x (BTG, Itaú).

---

## 10. Ferramentas e ambiente

- **Filesystem MCP** (`C:\Users\paulo\OneDrive\Fuente Price Pro`) — não suporta busca de conteúdo por padrão glob; usar `list_directory` + `read_text_file`. Conexão cai intermitentemente.
- **GitHub** (`github.com/paulofuentealba/fuentepricepro`, branch `dev`) — fallback via clone + grep quando MCP cai.
- **bash_tool sandbox** — validação (`tsc`, `vitest`); brace expansion falha silenciosamente, usar `mkdir` sequencial.
- **Antigravity** — agente Gemini-based, opera em `[EXECUÇÃO]`.
- **Skills** — 9 `SKILL.md` em `skills/*/` (canônico versionado), validados por `scripts/check.py` (desatualizado, ver Seção 7).
- **Firebase Emulator** — validação de regras de segurança (`test:rules`).
- **Deploy** — Cloud Build → Cloud Run, região `us-east1` (não `us-south1`, erro já corrigido).
- **APIs externas**: Brapi, Yahoo Finance, SEC EDGAR, Nasdaq, BCB SGS, CVM (batch script). Bolsai e HG Brasil bloqueados por tier pago.

---

## 11. Estrutura de chats do Project

- `[ROADMAP]` — priorização e sequenciamento (este documento vive aqui)
- `[EXECUÇÃO]` — implementação com Antigravity, verificação de arquivo real
- `[REVISÃO]` — auditorias de arquitetura sob demanda
- `[BENCHMARK]` — análise competitiva
- `[SKILLS]` — governança de skills

---

## Nota sobre arquivamento

Os seguintes arquivos/pastas foram movidos para `docs/_archive/` nesta consolidação
(preservados, não apagados — sem ferramenta de exclusão permanente disponível):
`api_enrichment_action_plan.md`, `api_enrichment_report.md`, `api_enrichment_report_v1.md`,
`api_enrichment_report_v2.md`, `api_enrichment_report_v3.md`, `arquitetura/` (incl. imagens),
`BACKLOG_V2.md`, `CHAT_SUMMARY_2026-07-29.md`, `CLAUDE_AUDIT_GERAL.md`, `PROMPTS_LOG.md`,
`RELATORIO_PUSH_DEV.md`.

**Exceções mantidas fora do arquivamento** (por instrução explícita de Paulo):
`docs/Prompts/*`, `docs/Implementation Plans/*`.

**Exceção adicional aplicada por precaução** (não apagar sem confirmação): `docs/AGENTS.md`
— mantido no lugar original por ser referenciado ativamente por `scripts/check.py`.
