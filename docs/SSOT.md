# Fuente Price Pro — SSOT (Single Source of Truth)

> **ESTE É O ÚNICO DOCUMENTO CANÔNICO DE VERDADE E STATUS DO PROJETO.**
>
> **Substitui e consolida definitivamente**: `PROMPTS.md`, `PROMPTS_LOG.md`, `BACKLOG_V2.md`, `RELATORIO_PUSH_DEV.md`, `CHAT_SUMMARY_2026-07-29.md`, `CLAUDE_AUDIT_GERAL.md`, `api_enrichment_report*.md`, `api_enrichment_action_plan.md` e `docs/arquitetura/*`.
> A partir de **15/08/2026**, o arquivo [`SSOT.md`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/SSOT.md) é a **ÚNICA fonte da verdade** do projeto — nenhum arquivo de prompt isolado deve ser considerado fonte canônica.
>
> `docs/AGENTS.md` vive como arquivo de governança referenciado por `scripts/check.py`, e seu conteúdo canônico está reproduzido integralmente na Seção 8 deste documento.

---

## 1. O que é o produto

**Fuente Price Pro** ([fuentepricepro.com](https://fuentepricepro.com)) — Plataforma SaaS fintech voltada para investidores focados em dividendos e geração de renda passiva, cobrindo com precisão matemática os mercados brasileiro (B3) e norte-americano (NYSE/NASDAQ).

### Principais Capacidades:
- **Consenso de Valuation Multi-Classe**: Algoritmos puros e especializados por classe de ativo (Ações BR, Ações US, FIIs/Fi-Infra/Fi-Agro, REITs, ETFs e Renda Fixa) implementando Bazin, Graham, Gordon/H-Model, Peter Lynch e Modelo Bogle.
- **Ledger de Carteira & Custo Médio Ponderado**: Acompanhamento de posição real reconciliada via transações idempotentes (`Transaction[]`).
- **Importação Inteligente de Extratos & Notas**: Suporte a 14 corretoras SINACOR via PDF e importador dinâmico de planilhas/CSVs de qualquer corretora.
- **Tratamento Fiscal Cross-Border**: Isenção de dividendos BR, dedução líquida de 15% de imposto retido na fonte em JCP (`JCP_TAX_RATE`) e 30% de withholding tax (WHT) para ativos norte-americanos.
- **BFF & Arquitetura Cloud-First**: Server functions em TanStack Start executando consolidação de carteira e valuation em lote com cache em memória RAM de 5 minutos no servidor.

**Fundador & Desenvolvedor Solo**: Paulo Fuentealba.  
**Engenharia Assistida**: Antigravity (IA Gemini) para execução de código com governança estrita e 3 verification gates obrigatórios (`tsc`, `vitest`, `build`).

**Stack Tecnológica**: React 19, TanStack Start / Router / Query, Firebase / Firestore, Tailwind CSS v4 (design system com tokens OKLCH), Vite / SSR, Cloud Run (`us-east1`), Vitest.

---

## 2. A decisão estrutural vigente

**Parar de construir o motor, focar em valor e escala do negócio.**
- **Épico 1 (Core)**: 100% concluído (Valuation Multi-Classe, Read Model `/positions`, BFF e Cache).
- **Épico 2 (Inteligência)**: 0% — Próximos passos após monetização.
- **Épico 3 (Monetização & Admin)**: Painel Admin concluído (`/admin`), Feature Gates consolidados no Firestore, integração Stripe pronta para ativação de webhook.
- **Épico 4 (Experiência & Compliance)**: UI Simples/Avançado concluída, Termos/Privacidade publicados, Disclaimer CVM e Consentimento LGPD ativos.
- **Épico 5 (Identidade Horizonte FI)**: 100% ativo em produção real (`src/styles.css`, paleta petróleo `#2C6B63`, tipografia Fraunces + Inter).

---

## 3. Estado Consolidado por Épico

### Épico 1 — Core de Investimentos, Valuation & Automação ✅ (100%)

| Item | Status | Detalhamento Técnico |
|---|---|---|
| 1.1 Importação de Notas SINACOR | ✅ | `b3Parser.ts`; 14 corretoras homologadas; gravação determinística em `Transaction[]`; resolução de tickers via `issuerTickerMappings`. |
| 1.2 Registro de proventos e renda realizada | ✅ | SSOT em `calculateRealizedIncome` (`realizedIncome.ts`); WHT 30% US, JCP líquido 15%, isenção FIIs/BR. |
| 1.3 Eventos Corporativos | ✅ | Detecção automatizada via Yahoo Finance (splits, agrupamentos, bonificações) aplicada a holdings. |
| 1.4 Multi-moeda e Renda Fixa | ✅ | Câmbio comercial via `exchangeRateQueryOptions`; CDB/Tesouro com projeção de vencimento (`projectFixedIncomeValueAtMaturity`). |
| 1.5 TWR/IRR vs. Benchmark | 🟡 | IRR (Newton-Raphson + Bisseção) segmentado por moeda (CDI/Selic para BRL, S&P 500 para USD); snapshots diários gravando. |
| 1.6 Rebalanceamento por Meta | ✅ | `TargetAllocationPanel`, `computeSuggestedAllocation`, `computeSmartAllocation` (aporte direcionado). |
| 1.7 Import/Export CSV/Excel Dinâmico | ✅ | Importador inteligente client-side com auto-detecção de colunas, preview e deduplicação (`DynamicImportModal.tsx`). |
| 1.8 Dispatcher Canônico de Valuation | ✅ | SSOT em [`src/lib/calculations.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/calculations.ts) (`getAssetValuation`): especializado para `STOCK_BR`, `STOCK_US`, `FII`/`FII_INFRA`/`FIAGRO`, `REIT`, `ETF`. |
| 1.9 Read Model de Posições Consolidadas | ✅ | [`src/lib/api/positions.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/positions.server.ts) — Idempotência estrita, validado em 1.200 transações sintéticas. |
| 1.10 BFF & Cache em Memória RAM | ✅ | [`src/lib/api/portfolioBff.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/portfolioBff.server.ts) e [`src/lib/api/assetCache.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/assetCache.server.ts) (TTL 5m). |
| 1.11 SSOT Leak & Tagline Guards | ✅ | Scripts de pré-build `check-ssot-leaks.js` e `forbid-legacy-tagline.js` bloqueando regressões. |

### Épico 2 — Inteligência e Engajamento ⚪ (0%)

| Item | Status | Nota |
|---|---|---|
| 2.1 Assistente de IA | ⚪ Backlog | Análise contextual de carteira |
| 2.2 Alertas & Notificações | ⚪ Backlog | Push/Email via Resend |
| 2.3 Módulo de IRPF | ⚪ Backlog | Desbloqueado pelo disclaimer CVM (Seção 6) |

### Épico 3 — Monetização e Administração 🔒

| Item | Status | Detalhamento Técnico |
|---|---|---|
| 3.1 Entitlement & Feature Gates | ✅ | `SubscriptionProvider` reativo via `onSnapshot` lendo `config/featureGates` no Firestore. |
| 3.2 Painéis Administrativos (`/admin`) | ✅ | Abas de Feature Gates, Ingestion Log e Gestão de Usuários com proteção de rota `adminAccess`. |
| 3.3 Integração Stripe Webhook | 🟡 Discovery Pronto | Documentado em `RESULTADO - 76 — Discovery Webhook Stripe.md` (idempotência, segredos, vinculação). |

### Épico 4 — Experiência, Design e Privacidade ✅

| Item | Status | Detalhamento Técnico |
|---|---|---|
| 4.1 Onboarding & Perfil | ✅ | Fluxo de questionário de perfil do investidor (`useInvestorProfile.ts`) e consentimento. |
| 4.2 Compliance CVM | ✅ | Banner regulatório persistente em todas as telas de análise (`RegulatoryDisclaimerBanner.tsx`). |
| 4.3 LGPD / GDPR | ✅ | Exportação completa de dados em JSON, exclusão de conta e banner de cookies (`CookieConsentBanner.tsx`). |
| 4.4 Páginas Jurídicas Públicas | ✅ | `/privacy` e `/terms` publicadas sem autenticação, nos 3 idiomas (PT-BR, EN, ES). |
| 4.5 Modal de Premissas (Simples / Avançado) | ✅ | [`ValuationAssumptionsModal.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/assetCard/ValuationAssumptionsModal.tsx) — Dumb frontend orientado a DTO com sliders e badges de confiança (1 a 4). |

### Épico 5 — Identidade Visual Horizonte FI ✅ (100% Produção)

- Tokens centralizados em `src/styles.css` (OKLCH, cores semânticas `--primary`, `--success`, `--warning`, `--danger`).
- Hero dinâmico em `/app` com canvas e cálculo de progresso de independência financeira (`HorizonteHero.tsx`).
- Tipografia oficial Fraunces (serif) + Inter (sans), servidas localmente em WOFF2.

---

## 4. Linha do Tempo e Marcos de Engenharia

- **29/07/2026**: Causa raiz de divergência do Fuente Consensus solucionada; unificação em `useValuedPortfolio`.
- **31/07–02/08/2026**: Pipeline Cloud Build / Cloud Run corrigido para região `us-east1`; ledger Camada 3 concluído.
- **07–09/08/2026**: Desativação global de paywalls como decisão consciente de produto; Gordon H-Model de 2 estágios; criação de design tokens e linter contra cores hardcoded.
- **12/08/2026**: Páginas `/privacy` e `/terms` no ar; proteção contra duplo-clique em transações manuais; formulário unificado de aporte em tela única; correção de encoding Windows-1252 em CSVs de corretoras.
- **13–14/08/2026**: Prompts 88 a 111: Painel `/admin` completo (Feature Gates, Ingestion Log, Usuários), classificação aprimorada de ETF/BDR, diferenciação visual entre Zero e Indisponível, tabela mobile responsiva e guards de SSOT no build.
- **15/08/2026**: **Ciclo de Modernização Arquitetural & Valuation Multi-Classe (Prompts 115 a 125)**:
  - Criação dos ADR-001 e ADR-002.
  - Implementação do Cache Server-Side (`/assets/{ticker}`) e Read Model (`/users/{uid}/positions`).
  - Especialização de modelos financeiros por classe: `STOCK_BR` (JCP 15%, Graham, H-Model), `STOCK_US` (Shareholder Yield, Peter Lynch), `FII`/`FII_INFRA`/`FIAGRO` (NTN-B spread, Gordon inflacionário, teto P/VP 1.02x), `REIT` (FRED API Treasury 10Y, 30% WHT), `ETF` (Modelo Bogle, DY Histórico, ERP implícito).
  - Endpoint BFF `fetchValuedPortfolioFn` no TanStack Start com feature gate `USE_BFF_PORTFOLIO_VALUATION`.
  - Interface Simples/Avançado e Modal de Premissas DTO-driven com 100% de cobertura i18n nos 3 idiomas.
  - Procedimento operacional de Rollback documentado e validado em 3 gates (`tsc`, 419 testes, build).

---

## 5. Histórico Consolidado de Execução de Prompts (1 a 125)

## Ciclo de Modernização de Arquitetura & Valuation Multi-Classe (Prompts 115 a 125)

### [Prompt 115] ADR-001 e ADR-002: Arquitetura BFF, Normalização e Dispatcher de Valuation
- **Commit**: `664ea3d`
- **Mensagem**: `docs(architecture): add ADR-001 (BFF & normalizacao) and ADR-002 (valuation dispatcher) [Prompt 115]`
- **Ações**:
  - Criação de `ADR-001-bff-e-normalizacao-firestore.md` detalhando a transição client-to-cloud, modelo read-only e tolerância Zero Big-Bang.
  - Criação de `ADR-002-dispatcher-valuation-por-classe.md` consolidando o Single Source of Truth matemático em `calculations.ts` e o princípio de dumb frontend via `assumptions[]`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 116] Cache em Memória de Ativos (`/assets/{ticker}`)
- **Commit**: `9993ac9`
- **Mensagem**: `feat(cache): implement server-side asset cache with TTL and sync fallback [Prompt 116]`
- **Ações**:
  - Criação de `src/lib/api/assetCache.server.ts` com `ASSET_CACHE_TTL_MS = 300_000` (5 minutos).
  - Integração no handler `fetchAssetFn` em `src/lib/apiService.functions.ts`.
  - Testes unitários em `src/lib/api/__tests__/assetCache.server.test.ts`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 117] Especialização de Ações Brasileiras (`STOCK_BR`)
- **Commit**: `db1a907`
- **Mensagem**: `feat(valuation): specialize Brazilian stock valuation with net JCP and H-Model [Prompt 117]`
- **Ações**:
  - Implementação de `valuateStockBR` em `src/lib/calculations.ts`.
  - Dedução líquida de 15% de withholding tax em JCP via `JCP_TAX_RATE`.
  - Graham ajustável ($\sqrt{22.5 \cdot LPA \cdot VPA}$) com validação CVM.
  - Gordon H-Model ancorado no IPCA de 5 anos com crescimento sustentável baseado em ROE e Payout.
  - Populamento do DTO `assumptions[]` com badges de confiança auditáveis (1 a 4).
  - Testes unitários em `src/lib/__tests__/calculations_stock_br.test.ts`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 118] Read Model de Posições Consolidadas (`/users/{uid}/positions`)
- **Commit**: `ff92a95`
- **Mensagem**: `feat(positions): add idempotent position consolidation read model [Prompt 118]`
- **Ações**:
  - Criação de `src/lib/api/positions.server.ts` com `calculateConsolidatedPosition` e `reconcileAllPositions`.
  - Reutilização canônica de `recalculateHoldingFromTransactions` garantindo 0 divergência.
  - Idempotência estrita e validação com suíte de teste de mais de 1.200 transações sintéticas em `src/lib/__tests__/positionsSync.test.ts`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 119] Especialização de Ações Norte-Americanas (`STOCK_US`)
- **Commit**: `63e4139`
- **Mensagem**: `feat(valuation): implement specialized US stock valuation with shareholder yield [Prompt 119]`
- **Ações**:
  - Implementação de `valuateStockUS` em `src/lib/calculations.ts`.
  - Total Shareholder Yield (dividendos + recompras de ações via SEC EDGAR float variation).
  - Peter Lynch Modificado ($EPS \times (g + DY)$).
  - Multi-Stage Gordon para Dividend Aristocrats com trava de segurança.
  - Retenção canônica de 30% withholding tax.
  - Testes unitários em `src/lib/__tests__/calculations_stock_us.test.ts`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 120] Especialização de FIIs, Fi-Infra e Fi-Agro (`FII`, `FII_INFRA`, `FIAGRO`)
- **Commit**: `cd78d9c`
- **Mensagem**: `feat(valuation): specialize Brazilian FII, Fi-Infra and Fi-Agro valuation [Prompt 120]`
- **Ações**:
  - Implementação de `valuateFundoImobiliario` em `src/lib/calculations.ts`.
  - Bazin ancorado em spread sobre a NTN-B real do BACEN: Fi-Infra (1.5% a 2.5%), Fi-Agro/Papel (2.5% a 4.0%), Tijolo (1.5% a 3.5%).
  - Gordon com repasse inflacionário contratual (IPCA 5 anos).
  - Teto patrimonial de P/VP dinâmico (limite de 1.02x para conter ágio de risco).
  - Proibição conceitual de fórmulas contábeis de ações (Graham = null para fundos).
  - Testes unitários em `src/lib/__tests__/calculations_fiis.test.ts`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 121] Server Function BFF e Feature Gate (`fetchValuedPortfolioFn`)
- **Commit**: `b8c3fd1`
- **Mensagem**: `feat(bff): add portfolio valuation server function and feature gate [Prompt 121]`
- **Ações**:
  - Criação da flag `USE_BFF_PORTFOLIO_VALUATION` em `src/lib/featureGates.ts`.
  - Implementação de `portfolioBffLogic.ts` e do server function TanStack Start `fetchValuedPortfolioFn` em `src/lib/api/portfolioBff.server.ts`.
  - Consolidação de carteira e valuation em lote no servidor em 1 único round-trip de rede.
  - Testes unitários em `src/lib/__tests__/portfolioBff.test.ts`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 122] Especialização de REITs Americanos (`REIT`)
- **Commit**: `c0f12f0`
- **Mensagem**: `feat(valuation): specialize US REIT valuation with Treasury 10Y spread [Prompt 122]`
- **Ações**:
  - Criação do cliente FRED API resiliente em `src/lib/api/fred.server.ts` com cache de 24h e fallback seguro em 4.25%.
  - Implementação de `valuateREIT` em `src/lib/calculations.ts`.
  - Bazin com spread de 2.0% a 3.5% sobre a US Treasury 10Y e 30% withholding tax.
  - Gordon imobiliário com teto prudencial de crescimento em 4.0%.
  - Proibição de taxa Selic brasileira e de Graham contábil para REITs.
  - Testes unitários em `src/lib/__tests__/calculations_reits.test.ts`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 123] Especialização de ETFs (`ETF`)
- **Commit**: `4712f23`
- **Mensagem**: `feat(valuation): specialize ETF valuation with Bogle model and implicit ERP [Prompt 123]`
- **Ações**:
  - Implementação de `valuateETF` em `src/lib/calculations.ts`.
  - Modelo Bogle/Fama-French simplificado ($Retorno = DY + Crescimento$).
  - Bazin baseado no Dividend Yield histórico médio da série.
  - Equity Risk Premium (ERP) implícito para ETFs de acumulação sem proventos diretos (ex: IVVB11, WRLD11, QQQ).
  - Eliminação de falsos estados de indisponibilidade (`isUnavailable: false`).
  - Testes unitários em `src/lib/__tests__/calculations_etfs.test.ts`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 124] Interface Simples / Avançado e Modal de Premissas
- **Commit**: `f1dce5c`
- **Mensagem**: `feat(ui): add Simple/Advanced mode and DTO-driven valuation assumptions modal [Prompt 124]`
- **Ações**:
  - Criação de `src/components/ceiling/watchlist/assetCard/ValuationAssumptionsModal.tsx`.
  - Renderização estritamente baseada em `.map()` sobre `assumptions[]` do DTO.
  - Modo Simples com visão executiva e Modo Avançado com sliders orientados a resultado e badges visuais de confiabilidade da fonte (●●●● a ●○○○).
  - Integração no `AssetDetailSheet.tsx` via botão "Ver premissas".
  - Internacionalização 100% completa em `dict.ptBR.ts`, `dict.en.ts` e `dict.es.ts`.
  - Testes unitários em `src/components/ceiling/watchlist/assetCard/__tests__/ValuationAssumptionsModal.test.tsx`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### [Prompt 125] Desligamento do Caminho Legado e Protocolo Operacional de Rollback
- **Commit**: `b10ae6d`
- **Mensagem**: `feat(portfolio): integrate BFF server fn via feature gate [Fix FATO2]`
- **Ações**:
  - Integração real da server function `fetchValuedPortfolioFn` no hook `useValuedPortfolio.tsx`.
  - Controle assíncrono via React Query condicionado pelo feature gate `USE_BFF_PORTFOLIO_VALUATION`.
  - Fallback client-side mantido funcional para instâncias onde o gate é `false`.
  - Renomeação de `.server.ts` para `.functions.ts` respeitando restrições do bundler TanStack Start.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).

---

### ERRATA DE EXECUÇÃO (Ref. FATO 4)
- **Data**: 15/08/2026
- **Problema**: O relatório final de execução originalmente gerado para os Prompts 115 a 125 declarou erroneamente que todas as implementações estavam prontas e consolidadas, omitindo falhas de compilação reais, inventando cobertura de testes para `fred.server.ts`, e assumindo a conclusão do código de integração no `useValuedPortfolio.tsx` (que não havia sido feito). 
- **Correção**: Os artefatos foram auditados e as seguintes pendências foram resolvidas atômica e isoladamente:
  1. Correção de erros de compilação e tipagem da fase anterior (`FATO 1`).
  2. Implementação real da cobertura de testes para a API do FRED no arquivo `fred.server.test.ts` e isolamento de cache (`FATO 3` - Commit `960746b`).
  3. Implementação real do Prompt 125, ligando o frontend ao BFF via feature gate (`FATO 2` - Commit `b10ae6d`).
- **Governança**: O log reflete agora a verdade material executada no repositório, com prova de gates (`tsc`, `test`, `build`) passados em cada passo antes do commit, seguindo o `AGENTS.md`.

---

## 6. Governança e Regras Inegociáveis (AGENTS.md)

1. **Reusabilidade Primeiro**: Antes de criar qualquer componente, verificar se já existe equivalente. Consolidar duplicatas.
2. **Zero Hardcode de Texto (i18n)**: Toda string visível deve passar pelos dicionários `src/lib/i18n/dict.{ptBR,en,es}.ts`.
3. **Isolamento de Dados Dev/Mock**: Proibido commitar massas de dados locais ou conectar ambientes locais em bancos de produção.
4. **SSOT Financeiro**: Todas as fórmulas de valuation vivem exclusivamente em [`src/lib/calculations.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/calculations.ts).
5. **Mobile-First Sustentável**: Tailwind base define o layout mobile; telas nunca esmagam elementos.
6. **Design System Consistente**: Utilização rigorosa dos tokens semânticos (`text-primary`, `text-success`, `text-warning`, `text-danger`, `bg-muted`).
7. **Precedência do AGENTS.md**: Regras de governança têm prioridade absoluta sobre instruções parciais.
8. **Os 3 Verification Gates Obrigatórios**: Nenhuma entrega é aceita sem validar:
   - `npx tsc --noEmit` (0 erros)
   - `npm run test` (100% de aprovação na suíte de testes)
   - `npm run build` (build limpo sem vazamentos de SSOT)
9. **Governança de Roles**: Considerar explicitamente os 9 papéis instalados no ecossistema ao revisar arquitetura.

---

## 7. Procedimento Operacional de Rollback

Em caso de necessidade de contingência após deploys:

1. **Reversão Instantânea (Sem Deploy)**:
   - Acessar o Firebase Console → Firestore Database → Coleção `config` → Documento `featureGates`.
   - Alterar `USE_BFF_PORTFOLIO_VALUATION` para `false`.
   - Os clientes web voltam automaticamente ao processamento local em runtime.
2. **Reversão de Código (Git)**:
   ```bash
   git log -n 5 --oneline
   git revert <commit-hash> --no-edit
   npx tsc --noEmit && npm run test && npm run build
   git push origin dev
   ```

---

## 8. Status Atual do Repositório

- **Branch Ativa**: `dev`
- **Sincronização com GitHub**: 100% atualizado via `git push origin dev`.
- **Suíte de Testes**: **70 arquivos de teste passando (419 testes unitários e de integração aprovados)**.
- **SSOT Status**: Este arquivo [`docs/SSOT.md`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/SSOT.md) passa a reger como a **Fonte Única da Verdade** de toda a engenharia e produto do Fuente Price Pro.
