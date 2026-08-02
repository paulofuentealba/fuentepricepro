# Fuente Price Pro — Backlog Unificado (Fonte Única da Verdade)

Este documento substitui todas as outras listas soltas (FPP-xxx da auditoria de UX, planos de sprint separados, diagnósticos avulsos). Consolida a visão estratégica original do time de Produto com o que a auditoria técnica/UX encontrou — incluindo o que **já existe parcialmente no código**, pra ninguém reconstruir algo do zero sem necessidade.

**Legenda de status:**

- ✅ Já existe e funciona — confirmar antes de mexer
- 🟡 Parcialmente construído — estender, não recriar
- ⚪ Não existe — genuinamente novo
- 🔒 Decisão de negócio pendente — construir em DEV, não ativar em produção

---

## Épico 1 — Core de Investimentos e Automação (A Máquina)

### 1.1 Importação automática e Notas de Corretagem 🟡

Já existe: `src/lib/dataIngestion/b3Parser.ts` + `BrokerNoteUploader.tsx` fazem upload de PDF, detectam corretora (XP, Clear) por CNPJ, fazem parsing de layout SINACOR, e importam trades. Corrigido recentemente para usar classificação e dividendo canônicos (antes tinha bugs bypassando essas funções centrais).
Falta: mais corretoras além de XP/Clear, outros layouts além de SINACOR, parsing de **proventos** (hoje só trades de compra são importados, nada de dividendo/JCP recebido), e a parte de Open Finance/API direta com B3/Avenue (não iniciada).
Nota: existe também `src/lib/csv.ts` + `WatchlistIO.tsx`, mas isso é import/export da **posição atual** da carteira, não histórico de transação — não confundir com este item.

### 1.2 Registro de proventos e renda realizada ⚪

Não existe hoje. O app só mostra renda **projetada**, nunca a renda de fato recebida. Precisa de: modelo de dado pra registrar proventos (data, ativo, valor líquido, tipo), tela de registro manual, e gráfico de renda realizada mês a mês ao lado da projetada.
**Decisão arquitetural pendente**: esse é o item que sustenta o item 1.3 (rentabilidade real) e o item 2.3 (IRPF) — vale desenhar o schema de transações/proventos com cuidado antes de codar, já que os outros dois dependem dele.

### 1.3 Eventos Corporativos Automatizados ✅

Já existe e é sofisticado: `src/lib/corporateEvents.ts` processa splits/agrupamentos/bonificações, ajusta preço médio preservando capital investido, trata fração em agrupamento, e tem detecção automática via Yahoo Finance com cache de 24h. Aparenta estar conectado a um `CorporateEventModal` na UI.
Ação: confirmar em teste real que a detecção automática está disparando pro usuário — não foi validado ao vivo, só confirmado que o código existe e parece completo.

### 1.4 Motor Multi-Moedas e Renda Fixa (WHT) 🟡

Parcial: `FixedIncomePanel.tsx` já existe pra títulos de Renda Fixa BR (CDB, Tesouro). O tratamento de imposto (30% US / 0% BR / 15% JCP) já existe na camada de cálculo de valuation (netAvgDividend com taxRate) e já está documentado na Wiki.
Falta: um "motor" dedicado de WHT pra múltiplas moedas de forma mais robusta/explícita, e cupons de renda fixa internacional (hoje o foco é BR).

### 1.5 Rentabilidade Real vs. Benchmark (TWR/IRR) ⚪

Não existe. Depende do item 1.2 (dado real de transação) pra calcular TWR de verdade. Comparação com CDI, IBOV, S&P 500 — fonte de benchmark externa a definir.

### 1.6 Rebalanceamento por Meta Configurável ⚪

Não existe como feature dedicada, mas evolui o "Gap Filler" que já existe hoje (usado no Smart Allocation). Usuário define alocação-alvo, app sugere aportes pra convergir.

**Nota sobre o texto original do backlog**: a formulação antiga ("implementar fórmulas de Preço Justo de Bazin/Graham") está desatualizada — Bazin, Graham e Gordon já são o núcleo do produto inteiro (Fuente Consensus). O que falta de verdade aqui é só TWR/IRR e o screener comparativo contra benchmark.

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

Parcial: já existe um componente `LockedPanel` (com textos "Pro Feature" / "Unlock advanced features" já traduzidos nos 3 idiomas) sugerindo que parte do "cadeado visual" pra recursos Pro já foi implementada durante nossas rodadas de i18n. Falta confirmar cobertura completa e o "banner transparente sobre fonte de dados" (ex: avisar que cotação vem do Yahoo Finance) — isso não foi encontrado ainda.

### 4.2 Onboarding Regulatório e Perfilamento (KYC/Suitability) ⚪

Não existe. Nenhum fluxo de perfilamento de risco do investidor encontrado no código.

### 4.3 Conformidade Legal (LGPD & GDPR) 🟡

Parcial: existe uma seção "Privacidade (LGPD)" na navegação de Configurações (só o item de menu, visto nas telas do produto). Não encontrado: banner de cookies, fluxo funcional de "Direito ao Esquecimento" (excluir conta + limpar Firestore), exportação/portabilidade de dados. Ou seja, tem o link, não tem o conteúdo atrás dele confirmado.

### 4.4 Evolução UI/UX ("Pro Terminal Concept") ✅

**Este item parece já estar essencialmente concluído.** Dark mode + glassmorphism + estética de terminal financeiro foi exatamente o que construímos ao longo de várias rodadas de landing page e do dashboard (Fuente Consensus, gradiente de marca, hierarquia de KPIs, etc.). Vale uma reavaliação visual rápida pra confirmar que cobre a intenção original antes de arquivar de vez este item — mas não parece precisar de trabalho novo do zero.

---

## Débitos Técnicos e Manutenção

Itens menores, sem épico específico, encontrados ao longo da auditoria:

- **`pdf-parser.test.ts`** com 3 testes falhando por divergência entre o comportamento real (`'unknown_broker'`) e a expectativa do teste (`'Malformed file'`) — descobrir qual dos dois está desatualizado antes de mexer na lógica de parsing de corretora
- **`Watchlist.tsx`** é o maior e mais frequentemente quebrado arquivo do projeto (KPIs, filtros, grid, orquestração de diálogos tudo junto) — candidato a quebrar em componentes menores quando houver tempo
- **`nitro: "3.0.260603-beta"`** fixado como dependência de servidor — migrar pra versão estável assim que disponível
- **`AGENTS.md`** documenta só as Golden Rules 1 e 2 originais — precisa ser atualizado com as versões revisadas das Regras 3 e 4, e incluir as Regras 5 e 6
- **Scripts órfãos na raiz** (`clean.cjs`, `merge.cjs`, `test-bbas3.ts`, `test-server.js`, `test_search.ts`) — resíduo de refatorações já concluídas, candidatos a remoção
- **Fallback de classificação em `classify.ts`** usa uma lista crescente de exceções hardcoded (`!s.startsWith("TAEE")`, etc.) pro sufixo "11" — funciona porque o `apiType` da API cobre a maioria dos casos primeiro, mas é uma dívida técnica conhecida, não uma solução definitiva

---

## Itens já resolvidos (histórico, não é mais backlog)

Registrado aqui só pra contexto — não precisa de ação:

- Toda a causa raiz do bug de fidelidade do Fuente Consensus (dividendo-base divergente entre telas, BVPS calculado com preço de fonte errada, yield-alvo hardcoded no Comparador) — resolvido nos Prompts 1, 5 e 6
- `.env` protegido no `.gitignore`, credenciais órfãs do Supabase removidas — resolvido
- Auditoria completa de i18n, navegação mobile, acessibilidade WCAG AA, hierarquia visual do dashboard — resolvido nos Sprints 1 a 5 do P2

---

_Consolidado a partir do backlog original de Produto + achados da auditoria técnica/UX (Prompts 1-13) + acesso direto ao repositório. Documento único a partir de agora — `epic3_task4.3_diagnostic.md` e `CLAUDE_AUDIT_GERAL.md` foram incorporados aqui e podem ser apagados._
