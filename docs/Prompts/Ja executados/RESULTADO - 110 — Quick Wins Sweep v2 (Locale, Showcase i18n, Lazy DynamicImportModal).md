# RESULTADO — 110 — Quick Wins do Sweep v2 (Locale, Showcase i18n, Lazy DynamicImportModal)

## 1. Resposta da Investigação sobre o Tipo `Locale` (Item 1)

> [!IMPORTANT]
> **Resultado da Investigação Exaustiva no Repositório**:
> 1. O tipo canônico de `Locale` no ecossistema de dicionários do projeto (`i18n.ts`, `i18n-provider.tsx`, `LanguageSwitcher.tsx`, `legal-content.ts`, `formatters.ts`) é **estritamente `"ptBR" | "en" | "es"`**.
> 2. As tags BCP-47 (`"pt-BR"`, `"en-US"`, `"es-ES"`) **nunca são o tipo de `Locale` da aplicação**. Elas são geradas sob demanda pela função pura `toIntlLocale(locale: Locale): string` exclusivamente para serem passadas aos construtores nativos do navegador (`Intl.NumberFormat`, `Intl.DateTimeFormat`).
> 3. **Causa real dos 6 casts `as any`**:
>    - `AssetMonthlyDividendChart.tsx:32` e `DividendsHistoryPanel.tsx:179`: a propriedade `currency` estava tipada como `string` em vez de `Currency` (`"USD" | "BRL"`), forçando `currency as any` para satisfazer `formatCurrency`.
>    - `ComparatorPerformanceChart.tsx:56`: o helper `formatDateLabel` tipou `locale: string` em vez de `locale: Locale`, forçando `toIntlLocale(locale as any)`.
>    - `AssetCardTags.tsx:16, 58`, `AssetCard.tsx:178, 189`, `FIProgressCard.tsx:203` e `RiskRadar.tsx:16`: continham casts supérfluos (`locale as any` ou `locale as "ptBR" | "en" | "es"`).
> 4. **Ação Tomada**: Tipamos `currency: Currency` e `locale: Locale` corretamente em todas as props e helpers, **removendo 100% dos `as any`** sem necessidade de poluir o union type com strings BCP-47 desnecessárias.

---

## 2. Ações Realizadas

### 2.1 ITEM 1 — Limpeza e Unificação de Tipos (Zero `as any`)
- Removidos todos os casts `as any` em:
  - `src/components/ceiling/watchlist/assetCard/AssetCardTags.tsx:16, 58`
  - `src/components/ceiling/watchlist/AssetMonthlyDividendChart.tsx:32`
  - `src/components/ceiling/watchlist/DividendsHistoryPanel.tsx:179`
  - `src/components/ceiling/ComparatorPerformanceChart.tsx:56`
  - `src/components/shared/AssetCard.tsx:178, 189`
  - `src/components/ceiling/FIProgressCard.tsx:203`
  - `src/components/ceiling/RiskRadar.tsx:16`

### 2.2 ITEM 2 — Localização das 7 Ocorrências de Status no Showcase da Landing
- Mapeadas as 7 ocorrências em `src/components/landing/showcase/cards.ts`:
  - `statusKey: "undervalued"` (O, BBSE3, MXRF11, VALE, HGLG11)
  - `statusKey: "fairlyPriced"` (SPYI)
- Adicionadas chaves semânticas sob `t.showcase.status` nos 3 dicionários:
  - `dict.ptBR.ts`: `undervalued: "Abaixo do Teto"`, `fairlyPriced: "Preço Justo"`
  - `dict.en.ts`: `undervalued: "Undervalued"`, `fairlyPriced: "Fairly Priced"`
  - `dict.es.ts`: `undervalued: "Bajo el Techo"`, `fairlyPriced: "Precio Justo"`
- `ShowcaseCard.tsx:92` atualizado para renderizar `{t.showcase.status[card.statusKey]}`.

### 2.3 ITEM 3 — Lazy Loading do `DynamicImportModal`
- `src/components/ceiling/watchlist/WatchlistDialogs.tsx` convertido para `React.lazy`:
  - `DynamicImportModal` agora é baixado como chunk assíncrono sob demanda (`DynamicImportModal-*.js`, 35.22 kB) apenas quando o usuário clica em "Importar CSV/PDF".
  - **Redução mensurada no bundle da Watchlist**: `Watchlist-*.js` caiu de **134.81 kB** para **100.50 kB** (-34.3 kB no chunk principal / ~8 kB gzip).

---

## 3. Gates de Verificação (Regra 8 de `AGENTS.md`)
- `node scripts/check-ssot-leaks.js`: `OK: No SSOT leaks detected`
- `node scripts/forbid-legacy-tagline.js`: `OK: No legacy tagline found`
- `npx tsc --noEmit`: 0 erros
- `npm test`: 60 arquivos / 388 testes passando (100%)
- `npm run build`: Build de produção gerado com sucesso
