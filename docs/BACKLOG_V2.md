# Fuente Price Pro — Backlog Unificado (Fonte Única da Verdade)

Este documento substitui todas as outras listas soltas (FPP-xxx da auditoria de UX, planos de sprint separados, diagnósticos avulsos). Consolida a visão estratégica original do time de Produto com o que a auditoria técnica/UX encontrou — incluindo o que **já existe parcialmente no código**, pra ninguém reconstruir algo do zero sem necessidade.

**Legenda de status:**

- ✅ Já existe e funciona — confirmar antes de mexer
- 🟡 Parcialmente construído — estender, não recriar
- ⚪ Não existe — genuinamente novo
- 🔒 Decisão de negócio pendente — construir em DEV, não ativar em produção

---

## Épico 1 — Core de Investimentos e Automação (A Máquina)

### 1.1 Importação automática e Notas de Corretagem ✅

- **Parsing de Notas SINACOR (14 Corretoras)**: ✅ **ATUALIZADO NO PROMPT 44**. `b3Parser.ts` estendido com suporte a **14 corretoras/bancos**: XP, Clear, Rico, Modal, BTG, Inter, NuInvest, Órama, Genial, Itaú, Bradesco / Ágora, Santander / Toro, Banco do Brasil (BB) e Caixa Econômica Federal / Caixa DTVM (`42.040.639/0001-40`).
- **Gravação Automática em Transactions**: ✅ **CONCLUÍDO NO PROMPT 45**. `BrokerNoteUploader.tsx` estendido para gravar cada ordem em `Transaction[]` via `useTransactions().upsert` com ID determinístico (`tx-pdf-{ticker}-{timestamp}-{qty}-{price}`) para idempotência perfeita em re-importações, desbloqueando `realizedIncome.ts` e `portfolioIrr.ts`.
- **Consolidação de Ordens Duplicadas do Mesmo Ticker**: ✅ **CONCLUÍDO NO PROMPT FIX**. `BrokerNoteUploader.tsx` reestruturado para agrupar ordens por ticker e recalcular a posição total (`quantity` e `averagePrice`) via `recalculateHoldingFromTransactions`, combinando o histórico pré-existente do ativo com as novas transações da nota.
- **Resolução Interativa de Tickers Não Identificados**: ✅ **CONCLUÍDO NO PROMPT FIX II**. `b3Parser.ts` estendido com resolução em 4 etapas (Regex padrão $\rightarrow$ Tabela `B3_SHORT_NAME_MAP` com limpeza de tags de governança $\rightarrow$ Mapeamentos salvos `issuerTickerMappings` $\rightarrow$ Lista de não resolvidos). Criado hook `useIssuerTickerMappings.ts` (Firestore + localStorage) e UI no `BrokerNoteUploader.tsx` para solicitação e salvamento automático de mapeamentos informados pelo usuário.
- **Falta**: Outros layouts não-SINACOR (se surgirem) e integração Open Finance/B3 direta.
Nota: existe também `src/lib/csv.ts` + `WatchlistIO.tsx`, mas isso é import/export da **posição atual** da carteira, não histórico de transação — não confundir com este item.

### 1.2 Registro de proventos e renda realizada ✅

- **Cálculo Automático por Cruzamento (`src/lib/realizedIncome.ts`)**: ✅ **CONCLUÍDO NO PROMPT 33**. Função pura SSOT `calculateRealizedIncome(transactions, dividendEventsMap, assetMetaMap)` cruza o histórico de transações com as datas ex de cada provento para calcular a quantidade mantida em cada `exDate` e aplicar as regras de retenção na fonte (WHT 30% US, 15% JCP, isenção FII/BR).
- **UI Integrada em Cash Flow (`CashFlowSummary.tsx` & `CashFlowChart.tsx`)**: ✅ Cards de resumo em destaque Emerald (Mês Atual, Ano Corrente, Total Histórico Realizado) e séries/barras comparativas no gráfico de Cash Flow com suporte i18n trilingue (PT, EN, ES).
- **Gráfico Mensal de Proventos por Ativo + Fix SSOT ("My Income Summary")**: ✅ **CONCLUÍDO NO PROMPT FIX SSOT & CHART**. Substituída a lógica duplicada de `DividendsHistoryPanel.tsx` pela chamada SSOT a `calculateRealizedIncome` (usando valores líquidos `amountNet` pós-tributação), e criado o componente `AssetMonthlyDividendChart.tsx` integrando um gráfico mensal compacto (máx. 12 meses mais recentes com pagamento realizado $\le$ hoje, sem barras zeradas artificiais).

### 1.3 Eventos Corporativos Automatizados ✅

Concluído e Validado End-to-End:
- **Motor de Cálculo e UI Modal (`src/lib/corporateEvents.ts` & `CorporateEventModal.tsx`)**: ✅ 100% funcional e matematicamente exato para Desdobramento (Split), Agrupamento (Grouping) e liquidação de frações a preço de mercado.
- **Detecção Automatizada via Yahoo Finance (`checkPendingSplitsFn`)**: ✅ **CORRIGIDO NO PROMPT 32**. A requisição ao endpoint `v8/finance/chart/${yhTicker}?events=split&interval=1d&range=5y` em `src/lib/apiService.functions.ts` foi atualizada com parâmetros de janela histórica (`interval=1d&range=5y`), ativando a resposta em tempo real de eventos pendentes.
- **Validação End-to-End**: Confirmado ao vivo que a consulta retorna eventos históricos com latência ultra-baixa (~60-180ms) para ativos BR e US (`NVDA`, `CMG`, `AVGO`, `BBAS3.SA`, `MGLU3.SA`, `ITUB4.SA`), disparando a badge de notificação e pré-preenchendo a modal de ajuste automaticamente.

### 1.4 Motor Multi-Moedas e Renda Fixa (WHT) ✅

Concluído e Validado:
- **Tributação de JCP (15% Retido na Fonte)**: ✅ Identificação de JCP via campo `label` da API da Brapi (`isJCP`), aplicando alíquota de 15% de IRRF no motor SSOT (`calculations.ts` & `realizedIncome.ts`), propagado automaticamente para a renda realizada líquida, IRR da carteira (`portfolioIrr.ts`) e Cash Flow.
- **UI & Relatórios por Categoria**: ✅ Coluna "Tipo" com badges ("Dividendo" vs "JCP") na tabela de histórico do ativo (`DividendsHistoryPanel.tsx`) e subtotais no card do Cash Flow (`CashFlowSummary.tsx`).
- **Renda Fixa BR (`FixedIncomePanel.tsx`)**: ✅ Suporte existente a CDB/Tesouro.

### 1.5 Rentabilidade Real vs. Benchmark (TWR/IRR) 🟡

- **Cálculo de IRR da Carteira (`src/lib/portfolioIrr.ts` & `PortfolioIrrCard.tsx`)**: ✅ **CONCLUÍDO NO PROMPT 34**. Algoritmo híbrido Newton-Raphson + Bisseção que calcula a Taxa Interna de Retorno (Money-Weighted Return) considerando aportes, resgates, proventos na `paymentDate` e valor atual de mercado, comparando com o benchmark Selic.
- **Snapshots Periódicos de Patrimônio (`portfolioSnapshot.ts` & Firestore)**: ✅ **CONCLUÍDO NO PROMPT 34**. Gravação diária client-side de snapshots em `users/{userId}/portfolioSnapshots/{YYYY-MM-DD}` (idempotente) como base de dados para o TWR futuro.
- **TWR Acumulado**: ⚪ Aguarda acúmulo histórico de snapshots periódicos para cálculo de Time-Weighted Return de múltiplos subperíodos.

### 1.6 Rebalanceamento por Meta Configurável ✅

Concluído e Validado:
- **Painel de Metas de Alocação (`TargetAllocationPanel.tsx`)**: ✅ Permite definir e salvar a alocação-alvo (%) por classe de ativo (`AssetType`) e a concentração máxima individual.
- **Sinalização Visual de Desvio (`calculateAllocationDeviation` / `isOutOfTolerance`)**: ✅ Destaque de desvios que ultrapassam a tolerância `ALLOCATION_TOLERANCE_PCT` (2 p.p.): tom `amber` para sobre-alocação (alerta de concentração) e tom `blue` para sub-alocação (oportunidade de aporte), com tooltip explicativo via `InfoTooltip`.
- **Motor de Alocação Sugerida (`computeSuggestedAllocation`)**: ✅ **CONCLUÍDO NO ITEM 1.6 PROMPT 2**. Motor de sugestão paramétrica de metas por perfil do investidor (`useInvestorProfile`) e vieses de estratégias combinadas (`StrategyKey` com multiplicadores estáticos e margem de segurança dinâmica), com botão "Alocação Sugerida", aviso legal obrigatório em destaque e fluxo reordenado da tela.
- **Motor de Aporte Inteligente (`computeSmartAllocation`)**: ✅ Direciona os novos aportes priorizando ativos das classes sub-alocadas.
- **Trabalho Futuro (Fora de Escopo)**: Sugestão de venda ativa para rebalanceamento estático sem novos aportes fica documentada como melhoria futura separada.

---

## Épico 2 — Inteligência e Engajamento (O Cérebro)

### 2.1 Assistente de IA (Insights Pessoais) ⚪

Não existe. Agente lendo a carteira e sugerindo ações (ex: alerta de desbalanceamento setorial). Nenhum código relacionado encontrado.

### 2.2 Alertas Dinâmicos e Notificações (Push/Email) ⚪

Não existe. Depende de infraestrutura de notificação (Firebase Cloud Messaging pra push; serviço de e-mail transacional — já há uma chave `RESEND_API_KEY` comentada no `.env`, sugerindo que Resend foi cogitado mas nunca ativado). Confirmar infraestrutura disponível antes de prometer canal de notificação em qualquer prompt futuro.

### 2.3 Módulo de IRPF ⚪

Não existe. Relatório de imposto sobre dividendos/JCP e cálculo de DARF em vendas com ganho de capital. Depende do item 1.2 (histórico real de transações).
**Atenção**: item sensível — erro de cálculo aqui tem implicação financeira/legal real pro usuário, não é só bug de UI. Precisa de disclaimer visível e validação numérica manual contra casos conhecidos antes de ir pra produção.

---

## Épico 3 — Monetização e Administração (O Negócio) 🔒

### 3.1 Controle Real de Planos (Free vs. PRO)

**Confirmado no código**: `isPro` está hardcoded como `true` em `src/lib/subscription.tsx`, pra todo usuário, sempre. O paywall visual (limite de 5 ativos, `PaywallDialog`) existe na interface mas nunca bloqueia ninguém de verdade.
**Decisão do Paulo (não é bug)**: essa é uma escolha deliberada por enquanto — não há diferenciação real entre free/pro além do login. Não integrado a nenhum gateway (nenhum pacote `stripe` no `package.json`, nenhuma rota `/pricing`).
**Plano pra um futuro próximo**: construir a estrutura real de permissão (lógica de tier no Firestore, checkout Stripe) mas mantê-la **desativada em produção** — testar só em DEV via flag de ambiente, seguindo o mesmo padrão já usado em `DataManagement.tsx` (`import.meta.env.DEV`). Não ativar sem decisão explícita.

### 3.2 Painel Administrativo (`/admin`)

Não existe — confirmado, nenhuma rota `/admin` no projeto. Mesmo tratamento do item 3.1: pode ser construído, mas fica sem decisão de ativação por enquanto.

---

## Épico 4 — Experiência, Design e Privacidade (O Usuário)

### 4.1 Otimização de Conversão e Onboarding 🟡

Parcial / Em evolução:
- **Fluxo de Onboarding e Perfil de Investidor (`InvestorProfileFlow.tsx`)**: ✅ Construído questionário de 6 telas pós-cadastro (e opcional em Configurações) para identificação do perfil de investidor (Conservador, Moderado, Arrojado) com salvamento incremental e retomada automática de progresso.
- **Paywall / Locked Panel**: Já existe `LockedPanel` traduzido nos 3 idiomas.
- **Pendente**: Banner transparente sobre fonte de dados (ex: avisar que cotação vem do Yahoo Finance) e aplicação profunda da personalização na UI.

### 4.2 Onboarding Regulatório e Perfilamento (KYC/Suitability) 🟡

Parcial (Personalização de UX vs. Suitability Regulatório Formal):
- **O que foi feito**: Criado o questionário de Perfil de Investidor (`InvestorProfileFlow.tsx`), que classifica a tolerância a risco e objetivo do usuário (Conservador/Moderado/Arrojado e Renda/Crescimento) para personalização interna da experiência no app.
- **Distinção importante**: Este perfilamento é estritamente voltado para a **experiência do usuário (UX)**. Não constitui uma análise formal de Suitability regulatório da CVM/ANBIMA (KYC legal), pois o Fuente Price Pro é uma ferramenta de planejamento e análise, não uma instituição financeira intermediária ou corretora.

### 4.3 Conformidade Legal (LGPD & GDPR) 🟡

- **Exportação de Dados (Portabilidade)**: ✅ **CONCLUÍDO**. `handleExport` em `src/routes/settings.tsx` realiza exportação assíncrona real de `assets`, `transactions`, `portfolioSnapshots` e perfil/configurações via função pura `buildUserDataExport` (`src/lib/dataExport.ts`).
- **Direito ao Esquecimento (Exclusão de Conta)**: ✅ **CONCLUÍDO**. `handleDelete` em `src/routes/settings.tsx` expurga as 3 subcoleções (`assets`, `transactions`, `portfolioSnapshots`) e o documento raiz `users/{userId}`, na ordem correta (subcoleções antes do doc pai), via função pura `buildAccountDeletionPaths` (`src/lib/accountDeletion.ts`).
- **Banner de Cookies / Consentimento**: 🟡 **Pendente**. Confirmado após varredura direta no código (`cookie`, `consent`, `banner`): não existe banner/modal de consentimento de cookies na interface (uso de cookies restrito ao estado visual da sidebar em `sidebar.tsx` e cookies internos de servidor para autenticação da API do Yahoo Finance em `yahoo.server.ts`).

### 4.4 Evolução UI/UX ("Pro Terminal Concept") ✅

**Este item parece já estar essencialmente concluído.** Dark mode + glassmorphism + estética de terminal financeiro foi exatamente o que construímos ao longo de várias rodadas de landing page e do dashboard (Fuente Consensus, gradiente de marca, hierarquia de KPIs, etc.). Vale uma reavaliação visual rápida pra confirmar que cobre a intenção original antes de arquivar de vez este item — mas não parece precisar de trabalho novo do zero.

---

## Débitos Técnicos e Manutenção

Itens menores, sem épico específico, encontrados ao longo da auditoria:

- **`pdf-parser.test.ts`** com 3 testes falhando por divergência entre o comportamento real (`'unknown_broker'`) e a expectativa do teste (`'Malformed file'`) — descobrir qual dos dois está desatualizado antes de mexer na lógica de parsing de corretora
- **`Watchlist.tsx`** é o maior e mais frequentemente quebrado arquivo do projeto (KPIs, filtros, grid, orquestração de diálogos tudo junto) — candidato a quebrar em componentes menores quando houver tempo
- **`nitro: "3.0.260603-beta"`** fixado como dependência de servidor — migrar pra versão estável assim que disponível
- **Scripts órfãos na raiz** (`clean.cjs`, `merge.cjs`, `test-bbas3.ts`, `test-server.js`, `test_search.ts`) — resíduo de refatorações já concluídas, candidatos a remoção
- **Inconsistência de cores de CTA/botões primários**: o token `--primary` do tema (`styles.css`, azul-violeta) não é a cor real usada nos botões de ação principal do produto — o padrão real é `emerald-600`/`emerald-500` com glow, hardcoded em vários componentes (ex: `AddAssetDropdown.tsx`). Levantamento rápido encontrou pelo menos 22 arquivos em `src/components` usando classes de cor de botão diferentes (`bg-emerald-600`, `bg-blue-600`, `bg-indigo-600`, `bg-primary`) sem um padrão único. Ação futura: decidir qual é a cor oficial da marca (parece ser emerald, pelo padrão predominante e pelo botão mais visível do produto), atualizar o token `--primary` no `styles.css` pra refletir isso, e migrar os componentes que usam classes hardcoded pra usar o token. Este item de onboarding já nasceu seguindo o padrão emerald real, não o token desatualizado.

---

## Itens já resolvidos (histórico, não é mais backlog)

Registrado aqui só pra contexto — não precisa de ação:

- Toda a causa raiz do bug de fidelidade do Fuente Consensus (dividendo-base divergente entre telas, BVPS calculado com preço de fonte errada, yield-alvo hardcoded no Comparador) — resolvido nos Prompts 1, 5 e 6
- `.env` protegido no `.gitignore`, credenciais órfãs do Supabase removidas — resolvido
- Auditoria completa de i18n, navegação mobile, acessibilidade WCAG AA, hierarquia visual do dashboard — resolvido nos Sprints 1 a 5 do P2
- Refino do fluxo "Update Holdings" e consolidação do campo "Investing Since" em componente único `InvestingSinceField.tsx` (read-only quando há transações atreladas à menor data de transação) — resolvido no Prompt 14
- `AGENTS.md` atualizado com as Regras 1-7 completas (incluindo a nova Regra 7 — governança/precedência do próprio arquivo) — item de débito técnico antigo removido por estar desatualizado
- Correção do pisca/flicker do `GuestWarningBanner` no F5/CTRL+F5 para usuários autenticados (verificando estado `loading` de `useAuth()`) — resolvido no Prompt 19
- SEC EDGAR integrado como fonte de enriquecimento de BVPS para ações/REITs US quando o Yahoo Finance não preenche a métrica, via `secEdgar.server.ts`, plugado em `fetchAssetFn` respeitando o princípio de SSOT — resolvido no Prompt 18
- Fallback de classificação em `classify.ts` refatorado para conjunto declarativo `B3_STOCK_UNIT_PREFIXES` (16 prefixos confirmados individualmente contra B3/CVM/Yahoo Finance), com documentação de fonte e testes unitários dedicados em `classify.test.ts` — resolvido no Prompt 20
- Eliminação completa de strings de texto puro em chamadas de `toast.*` e modal de Paywall, com integração nos 3 dicionários i18n (`dict.en.ts`, `dict.ptBR.ts`, `dict.es.ts`) conforme a Regra 2 do `AGENTS.md` — resolvido no Prompt 21
- **Fase 3 (CVM Dados Abertos - VPA/LPA + Vacância)**: Migração arquitetural da leitura e ingestão da CVM no Firestore de Client SDK para Firebase Admin SDK (`src/integrations/firebase/admin.ts`), remoção do check de `window` em `cvm.server.ts`, inclusão da regra em `firestore.rules` e script CLI `ingest-cvm.ts` atualizado — resolvido no Prompt 22
- **Fix Seleção de Conta DRE CVM**: Prioridade determinística estrita para conta `3.11` (Lucro Líquido Consolidado) sobre `3.09` (Operações Continuadas) em `scripts/ingest-cvm.ts`, corrigindo a divergência de LPA da BBSE3 (de 5.6358 de volta para 4.6448, alinhado com a Fase 1) e re-populando os dados no cache estático e no Firestore — resolvido no Prompt 23
- **Enriquecimento de `paymentDate` (Ativos US Nasdaq + FIIs BR)**:
  - ✅ **Ações Nasdaq-Listed US** (`AAPL`, `MSFT`): `paymentDate` resolvido via `fetchNasdaqDividends` (`src/lib/api/nasdaq.server.ts`) conectado a `fetchAssetFn`.
  - ✅ **FIIs/FIAGRO/FI-Infra BR (Estimado)**: `paymentDate` calculado via regra de dias úteis e feriados brasileiros (`src/lib/br-business-calendar.ts` + `src/lib/fiiPaymentRules.ts`), com flag `paymentDateEstimated: true` e tooltip i18n nos 3 idiomas (10 fundos mapeados: `HGLG11`, `MXRF11`, `KNRI11`, `XPLG11`, `VISC11`, `BTLG11`, `KNCR11`, `AFHI11`, `CPTS11`, `ALZR11`).
  - 🔴 **Gap Conhecido (Ações BR)**: Proventos de Ações BR permanecem sem `paymentDate` em APIs gratuitas (administrado por B3/CBLC, fora do escopo CVM; Bolsai e HG Brasil exigem assinaturas pagas).
  - 🔴 **Gap Conhecido (Ações/REITs NYSE US)**: Ações e REITs negociados na NYSE (`O`, `JNJ`, `KO`) permanecem sem `paymentDate` em APIs gratuitas sem chave (a Nasdaq API restringe o cadastro a papéis Nasdaq-listed e a Yahoo Finance só possui ex-date).
  - **Fase 0 - Item 0.1 (Exportação de Dados LGPD + Expurgo de portfolioSnapshots)**: ✅ **CONCLUÍDO E VALIDADO** (detalhado na Seção 4.3).
- *Nota*: Se novos FIIs forem mapeados no futuro, a metodologia oficial de mapeamento via regulamento primário está documentada nos Prompts 24-27 em `PROMPTS_LOG.md`.







---

_Consolidado a partir do backlog original de Produto + achados da auditoria técnica/UX (Prompts 1-13) + acesso direto ao repositório. Documento único a partir de agora — `epic3_task4.3_diagnostic.md` e `CLAUDE_AUDIT_GERAL.md` foram incorporados aqui e podem ser apagados._
