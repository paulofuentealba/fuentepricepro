# RESULTADO — Correção: Mover Horizonte FI para Produção

`docs/PROMPTS_LOG.md` não existe mais neste repositório (provavelmente consolidado em `docs/SSOT.md`), então este resultado é documentado aqui, como instruído pelo prompt de correção.

## Contexto

Uma execução anterior implementou a identidade visual "Horizonte FI" numa rota paralela `/app-v2` (layout `src/routes/app-v2.tsx` + subrotas `index`, `myportfolio`, `screener`, `comparator`, `globalradar`, `riskradar`), com um arquivo de tokens CSS duplicado (`src/styles/horizonte-tokens.css`, tokens `--h-*`) — engano de escopo. A decisão correta, confirmada nesta correção, é que "Horizonte FI" substitui a produção diretamente em `/app`, sem rota paralela.

## O que foi feito

1. **Rota paralela removida.** `src/routes/app-v2.tsx` e todo `src/routes/app-v2/` deletados. `src/styles/horizonte-tokens.css` deletado (tokens já existiam com os nomes reais em `src/styles.css`). `src/components/layout-v2/SidebarHorizonte.tsx` também removido — ficou órfão (só era referenciado pelo layout de `/app-v2`).

2. **Tokens `--h-*` remapeados** para os tokens reais (`--card`, `--border`, `--foreground`, `--muted-foreground`, `--primary`, `--success`, `--danger`, `--font-serif`) em `src/components/horizonte/HorizonteHero.tsx` e `src/components/horizonte/PortfolioTableV2.tsx`, preferindo classes Tailwind (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-primary`, `font-serif`, `text-success`, `text-danger`, `tabular-nums`) a `style={{...}}` inline sempre que havia mapeamento 1:1. Confirmado por `grep -rn -- "--h-" src/`: zero ocorrências.

3. **SSOT de proventos realizados extraído.** Criado `src/lib/useRealizedIncomeSummary.ts`, hook que encapsula a cadeia `dividendEventsMap -> effectiveTransactions -> realizedEvents -> summary` que estava duplicada quase idêntica entre `CashFlowCalendar.tsx` e o antigo `app-v2/index.tsx`. `CashFlowCalendar.tsx` foi atualizado para consumir o hook (o `dividendEventsMap` local permanece, pois também alimenta `buildMonthlyBuckets`/`computeInvestedVsReceived`, fora do escopo do hook). Números de `/app/cashflow` confirmados idênticos após a extração (ver seção de verificação visual).

4. **Home real montada em `src/routes/app/index.tsx`.** Deixou de redirecionar para `/app/myportfolio` — agora renderiza: `HorizonteHero`, uma linha de progresso opcional ("+X p.p. desde a última visita", Parte 5), grid de 4 `SummaryCard` (Patrimônio total, Proventos recebidos no ano via `useRealizedIncomeSummary()`, Maior posição, **Aporte deste mês** via `getMonthlyNetContribution` + padrão `convertToBRL` de `useFIProgress.ts`, com legenda deixando clara a aproximação), e uma prévia da tabela de carteira (`PortfolioTableV2` agora aceita prop `limit`, usado com `limit={4}`) com botão "Ver tudo" para `/app/myportfolio` e botão "Registrar aporte" que abre `NewContributionDialog` (reaproveitado sem alterações).

5. **Snapshot leve de "última visita" (Parte 5).** Campo único `lastVisitSnapshot: { coveragePercent, capturedAt }` dentro de `users/{uid}` (mesmo doc de `useUserSettings.ts`), lido e sobrescrito (`setDoc({ merge: true })`) a cada carregamento da home. Delta de `coveragePercent` exibido como "+X p.p. desde a última visita"; omitido na primeira visita (sem snapshot anterior) e quando o delta é exatamente zero; delta negativo é sempre mostrado (não escondido).

## Decisão sobre screener/comparator/globalradar/riskradar/myportfolio de app-v2

Investigação do conteúdo real (não dos nomes de prompt 55-64) mostrou que **nenhum desses arquivos tinha lógica ou dado que já não existisse identicamente em produção**:

- `app-v2/comparator.tsx`, `app-v2/globalradar.tsx`, `app-v2/riskradar.tsx` eram cascas finas em torno dos mesmos componentes compartilhados que as rotas de produção já usam (`AssetComparator`, `DividendRadar`, `RiskRadar` — comparados linha a linha com `src/routes/app.comparator.tsx`, `src/routes/app/globalradar.tsx`, `src/routes/app/riskradar.tsx`: idênticos, exceto pela casca visual).
- `app-v2/screener.tsx` reimplementava a mesma lógica de `src/routes/app/screener.tsx` (mesmo `AssetForm`, mesma mutation, mesmo `AssetCard`), só trocando `Card`/classes Tailwind por `style={{ ...var(--h-*) }}` inline — sem ganho funcional, e a versão de produção já usa classes semânticas Tailwind (mais alinhado ao objetivo de tokens reais).
- `app-v2/myportfolio.tsx` era um wrapper de uma linha em torno de `PortfolioTableV2` — sem lógica própria.

**Decisão:** descartar os cinco arquivos sem portar conteúdo — produção já cobre a mesma superfície. `PortfolioTableV2` (o único componente com lógica própria de fato) foi preservado e remapeado, e é reaproveitado tanto na prévia da nova home quanto continua disponível para uso futuro em `/app/myportfolio` caso se decida adotar a visão em tabela densa (fora do escopo desta correção — `/app/myportfolio` não foi alterado).

## Verificação

- `npx tsc --noEmit`: limpo em relação a esta mudança. Único erro remanescente é pré-existente e não relacionado (`src/components/horizonte/__tests__/HorizonteHero.test.tsx` — `toBeInTheDocument` não tipado, problema de setup de tipos do `@testing-library/jest-dom`, arquivo não tocado nesta correção).
- `npm run test`: 229 passed, 4 skipped, 35 test files passed (1 skipped) — sem regressões.
- `npm run build`: build de cliente e servidor concluído sem erros (apenas aviso pré-existente de chunk grande, não relacionado).
- `Select-String`/`grep -rn -- "--h-" src/`: zero ocorrências.
- `src/routes/app-v2` e `src/routes/app-v2.tsx`: confirmados inexistentes.
- Verificação visual real via dev server (Vite, porta 5176): `/app/` renderiza hero "Horizonte FI" com valor acumulado, 4 cards de resumo (Patrimônio total, Proventos recebidos no ano, Maior posição, Aporte deste mês com legenda de aproximação), e prévia da tabela de carteira com botão "Ver tudo". Nenhum erro no console. `/app/cashflow` renderiza normalmente após a extração do hook, com números de proventos/IRR/gráficos consistentes (Annual Total R$ 51,07, Monthly Average R$ 4,26 etc. — carrega sem erro).

## Commits

Ver histórico do branch `dev` — mensagens descritivas por unidade lógica (remoção da rota paralela, remapeamento de tokens + extração do SSOT, nova home + snapshot de última visita).
