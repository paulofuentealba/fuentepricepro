### Item 3 — Limpeza de Hardcodes `emerald-*` & Correção do Fallback de Setor em Inglês ✅ CONCLUÍDO E VERIFICADO

- **Escopo & Regra de Classificação**:
  - **(a) Cor da marca / CTA**: Substituídos por tokens semânticos (`bg-primary`, `text-primary`, `border-primary`, `ring-primary`, `shadow-primary/*`).
  - **(b) Indicador semântico de mercado** (retorno positivo, lucro, proventos recebidos, desconto de valuation condicional `derived.positive`, nível de risco baixo): **MANTIDO hardcoded green** (`emerald-500` / `emerald-400` / `emerald-950/20`).

- **Arquivos e Classificação (21 Arquivos Alterados, 10 Intocados)**:
  1. `src/components/ceiling/Watchlist.tsx`: (a) Spinner de carregamento $\to$ `border-primary`.
  2. `src/components/ceiling/watchlist/BrokerNoteUploader.tsx`: (a) Anel de foco e botão de confirmação $\to$ `primary`. (b) Badge de compra $\to$ Mantido `emerald-500/10`.
  3. `src/components/ceiling/watchlist/GoalProgressBar.tsx`: (a) Barra de progresso e tom ativo $\to$ `primary`.
  4. `src/components/ceiling/watchlist/AddAssetDropdown.tsx`: (a) Botão principal e hover de itens $\to$ `primary`.
  5. `src/components/ceiling/watchlist/FixedIncomePanel.tsx`: (a) Glow e ícone de escudo $\to$ `primary`. (b) Rentabilidade de Renda Fixa $\to$ Mantida `emerald-400`.
  6. `src/components/ceiling/watchlist/DividendsHistoryPanel.tsx`: (a) Ícone do histórico $\to$ `text-primary`. (b) Proventos recebidos $\to$ Mantidos `emerald-400`.
  7. `src/components/ceiling/watchlist/WatchlistKpiSection.tsx`: (a) Bordas, ícone global e gradiente dos cards KPI $\to$ `primary`.
  8. `src/components/ceiling/watchlist/ConsensusPyramid.tsx`: (a) Glow de fundo, linhas SVG e badge central $\to$ `primary`.
  9. `src/components/ceiling/watchlist/FixedIncomeWizardSheet.tsx`: (a) Glow, etapas, anéis de foco e botões CTA $\to$ `primary`. (b) Card de resultado simulado $\to$ Mantido `emerald`.
  10. `src/components/ceiling/Header.tsx`: (a) Badge de câmbio, botões de cadastro/terminal e links de hover mobile $\to$ `primary`.
  11. `src/components/ceiling/AssetComparator.tsx`: (a) Ícones de balança e hover de busca $\to$ `primary`.
  12. `src/components/ceiling/RiskRadar.tsx`: (a) Estado vazio, botão e barra de progresso $\to$ `primary`. (b) Badges de risco seguro $\to$ Mantidas `emerald`.
  13. `src/components/ceiling/FIProgressCard.tsx`: (a) Glow, ícone de alvo, botões e gradiente da barra $\to$ `primary`. (b) % de cobertura passiva $\to$ Mantida `text-emerald-400`.
  14. `src/components/landing/ShowcaseCarousel.tsx`: (a) Glow ambiente $\to$ `primary`.
  15. `src/components/landing/showcase/ProCards.tsx`: (a) Sombras dos pro cards $\to$ `shadow-primary/10`.
  16. `src/components/onboarding/InvestorProfileFlow.tsx`: (a) Fluxo de onboarding, etapas, seleções e botões $\to$ `primary`.
  17. `src/routes/app/docs.tsx`: (a) Ícones e bordas de documentação $\to$ `primary`.
  18. `src/routes/settings.tsx`: (a) Badge de perfil e botão de refazer quiz $\to$ `primary`.
  19. `src/routes/index.tsx`: (a) Hero da landing, botões e destaques de seções $\to$ `primary`. (b) Valores de proventos/rendimentos em mockups $\to$ Mantidos `emerald`.
  20. `src/lib/useValuedPortfolio.ts`: Correção do fallback de setor $\to$ `sector: m?.sector || it.sector || t.common.other` (import do `useI18n` + chamada no hook).
  21. `src/lib/usePortfolioRisk.ts`: Correção do fallback de setor $\to$ `const sector = item.sector || t.common.other` + fix da checagem de alerta de concentração `s.sector !== t.common.other` (commit `a66181e`).
  - **Intocados (100% Categoria b)**: `AssetCard.tsx`, `TransactionsPanel.tsx`, `AssetMonthlyDividendChart.tsx`, `AssetDetailSheet.tsx`, `AssetCardHeader.tsx`, `CashFlowSummary.tsx`, `PortfolioIrrCard.tsx`, `CashFlowChart.tsx`, `ValuationRadar.tsx`, `AssetCardTags.tsx`.

- **Evidências de Validação**:
  1. **`git diff --stat`**: 21 arquivos alterados no commit inicial + 1 fix no `usePortfolioRisk.ts`.
  2. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  3. **`npm run build`**: Compilação limpa do cliente e SSR (0 erros).
  4. **Busca por hardcodes de `"Outros"`**: Apenas 1 ocorrência legítima em todo `src/` (`src/lib/i18n/dict.ptBR.ts:16`).

---