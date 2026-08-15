# Histórico de Execução de Prompts — Fuente Price Pro

Este documento registra a execução sequencial atômica dos Prompts 115 a 125, conforme o padrão estabelecido no projeto e as diretrizes do `agents.md`.

---

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
- **Commit**: `Pendente de hash`
- **Mensagem**: `feat(valuation): complete BFF migration with documented rollback protocol [Prompt 125]`
- **Ações**:
  - Criação do manual de contingência e reversão instantânea em `docs/ROLLBACK.md`.
  - Atualização do `ADR-001` com o plano de migração e descontinuação da pipeline legada.
  - Registro de auditoria em `docs/PROMPTS_LOG.md`.
- **Status**: ✅ Concluído com 3 gates validados (`tsc`, `test`, `build`).
