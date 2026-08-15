# RESULTADO — Discovery: Calibração de Preço-Teto por Classe de Ativo (Épico 2 - Intelligence)

> **Data**: 15/08/2026  
> **Status**: Discovery Concluído — Modo Read-Only (0 arquivos de código modificados)  
> **Skill Aplicada**: `fuente-solution-architect` / `fuente-investidor-profissional` / `fuente-product-manager`  
> **Conformidade**: 100% aderente a [`AGENTS.md`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/AGENTS.md)

---

## 1. Síntese do Diagnóstico Técnico

- **Oportunidade Estratégica**: Evoluir a SSOT financeira (`src/lib/calculations.ts`) para precificação especializada por classe de ativo, criando uma vantagem competitiva institucional inatingível por concorrentes de varejo.
- **Arquitetura Alvo**:
  - Ponto de entrada canônico único mantido em `getAssetValuation(params)` (Regra 4 do `AGENTS.md`).
  - Dispatcher interno roteando para submétodos puros: `valuateStockBR`, `valuateStockUS`, `valuateFundoImobiliario`, `valuateREIT`, `valuateETF`.
  - Inteligência 100% no Backend (cálculo de defaults, presets, badges de confiança `●●●○` e scores) e Frontend puramente como camada de exibição burra consumindo o array `assumptions`.

---

## 2. Plano de Ação Sequenciado (Épico 2 - Intelligence)

- **Fase 2.0 — ADR-002**: Definição formal do Dispatcher e contratos `ValuationResult` / `ValuationAssumption`.
- **Fase 2.1 — Ações BR**: Bazin com JCP líquido a 15% WHT, Graham CVM e DDM 2 Estágios (H-Model com IPCA 5y dinâmico).
- **Fase 2.2 — Stocks US**: Total Shareholder Yield (Buybacks reportados SEC EDGAR + dividendos), Gordon Multi-estágio e FCFE.
- **Fase 2.3 — FIIs / Fi-Infra / Fi-Agro**: Bazin Spread sobre NTN-B (BACEN), Gordon Inflacionário e P/VP Dinâmico.
- **Fase 2.4 — REITs US**: Integração com FRED API para US Treasury 10Y e cálculo de AFFO Yield e NAV Discount.
- **Fase 2.5 — ETFs**: Modelo Bogle, DY Histórico 5y e Shiller CAPE com séries de índices de mercado.
- **Fase 2.6 — UI de Premissas Ajustáveis**: Componente visual do Modo Avançado renderizando sliders dinâmicos a partir de `assumptions`.
