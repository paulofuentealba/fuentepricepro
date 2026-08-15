# PROMPT 110 — Quick Wins do Sweep v2 (P1 Confirmados)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Todos os 3 itens abaixo foram verificados linha-a-linha contra o
> código real do `dev` antes deste prompt ser gerado — não são
> repasse cego do relatório do sweep. O item de `ComparatorPerformanceChart`
> memoização, que aparecia na Tabela 3 do sweep, foi **removido**
> porque é falso positivo confirmado (`chartData` já está em
> `useMemo`, linha 109) — não implementar nada relacionado a isso.

---

## ITEM 1 — Unificar Tipo `Locale`, Eliminar 6 Casts `as any`

### Causa Raiz
`src/lib/formatters.ts:3` define `export type Locale = "en" | "ptBR" | "es"`,
enquanto `i18n-provider.tsx` fornece `"pt-BR" | "en-US"` (formato
BCP-47). A incompatibilidade força `locale as any` em 6 pontos,
confirmados nesta rodada de verificação:

| # | Arquivo | Linha |
|---|---|---|
| 1 | `src/components/ceiling/watchlist/assetCard/AssetCardTags.tsx` | 58 |
| 2 | `src/components/ceiling/watchlist/AssetMonthlyDividendChart.tsx` | 32 |
| 3 | `src/components/ceiling/watchlist/DividendsHistoryPanel.tsx` | 179 |
| 4 | `src/components/ceiling/ComparatorPerformanceChart.tsx` | 56 |
| 5 | `src/components/shared/AssetCard.tsx` | 178 |
| 6 | `src/components/shared/AssetCard.tsx` | 189 |

### Tarefa
1. Alterar `export type Locale = "en" | "ptBR" | "es"` em
   `formatters.ts` para o formato real usado por `i18n-provider.tsx`
   (`"pt-BR" | "en-US"` — confirmar se falta também `"es-ES"` ou
   equivalente, olhando o provider real antes de decidir o union
   type completo).
2. Verificar se `toIntlLocale()`/`formatCurrency()`/`formatPercent()`
   (as funções que recebem `Locale` como parâmetro) fazem algum
   mapeamento interno assumindo o formato antigo (`"ptBR"` sem hífen)
   — se sim, ajustar esse mapeamento também, não só a assinatura de
   tipo.
3. Remover os 6 `as any` listados acima, um por um, confirmando que o
   `tsc` não gera erro de tipo genuíno em nenhum (se gerar, é sinal de
   que o novo union type não cobre um caso real — investigar antes de
   forçar).
4. Buscar por outras ocorrências de `locale as any`/`Locale` em
   `src/` que não estejam na lista dos 6 — o grep original pode não
   ter sido exaustivo.

### Gate de Saída
- `npx tsc --noEmit` — 0 erros, confirmando que a unificação de tipo
  não introduziu incompatibilidade nova.
- `npx vitest run`, `npm run build`.
- Reportar se algum dos 6 pontos revelou incompatibilidade real
  (não só cosmética) durante a remoção do `as any`.

---

## ITEM 2 — i18n no Showcase da Landing (7 Ocorrências, Não 2)

### Causa Raiz
`src/components/landing/showcase/cards.ts` tem **7 ocorrências** de
`status:` com string hardcoded em inglês (`"Undervalued"`,
`"Fairly Priced"`, etc.) — confirmado via `grep -c "status:"` = 7,
não as 2 citadas como exemplo no sweep original (`BBSE3`, `O`).

### Tarefa
1. Listar as 7 ocorrências reais (rodar
   `grep -n "status:" src/components/landing/showcase/cards.ts` e
   confirmar a contagem antes de começar — se o número mudou desde
   esta auditoria, usar a contagem real).
2. Adicionar chaves i18n para cada valor distinto de status
   encontrado (ex: `t.showcase.status.undervalued`,
   `t.showcase.status.fairlyPriced`, e qualquer outro valor único
   presente nas 7 ocorrências) nos 3 dicionários.
3. Alterar `cards.ts` para usar uma chave semântica
   (`statusKey: "undervalued"`) em vez da string de exibição direta,
   e o componente que renderiza (`ShowcaseCard.tsx` ou equivalente)
   interpola via `t.showcase.status[card.statusKey]`.

### Gate de Saída
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Confirmar visualmente a landing em pt-BR, en, es — os cards de
  showcase devem mostrar o status traduzido, não mais inglês fixo.

---

## ITEM 3 — Lazy Loading do `DynamicImportModal`

### Causa Raiz
`src/components/ceiling/watchlist/WatchlistDialogs.tsx:7` importa
estaticamente `DynamicImportModal` (componente grande — parser
dinâmico, Web Worker, streaming de progresso), inflando o bundle
inicial de qualquer usuário que abra a Watchlist, mesmo que nunca use
a função de importação.

### Tarefa
- Converter para `React.lazy(() => import("@/components/horizonte/DynamicImportModal").then(m => ({ default: m.DynamicImportModal })))`,
  envolvido em `<Suspense fallback={...}>` no ponto de uso (linha 59
  de `WatchlistDialogs.tsx`).
- Fallback do `Suspense` deve ser um skeleton/loading coerente com o
  padrão já usado em outros lazy loads do projeto (Regra 1 — não
  inventar um novo padrão visual de loading).

### Gate de Saída
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Confirmar que o modal ainda abre e funciona normalmente ao clicar
  em "Importar" — só o carregamento do código que deve ser adiado, não
  o comportamento.
- Reportar redução aproximada de bundle inicial, se mensurável.

---

## Proibido
- Não tocar em `ComparatorPerformanceChart.tsx` além do item 1
  (troca do cast de locale) — o `chartData` já está corretamente
  memoizado, não mexer nessa parte.
- Não expandir o escopo do Item 1 para revisar todos os usos de
  `Locale` no projeto além dos 6 pontos + a busca complementar do
  item 4 — se achar mais gente usando `Locale` de forma incompatível
  fora do escopo direto de exibição, reportar mas não corrigir nesta
  rodada.
