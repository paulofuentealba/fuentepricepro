# PROMPT — Correção: Imports Órfãos de `apiService.server` + `any` Implícito
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior. Correção pontual, baixo risco —
apresente PLANO (Regra 8) rápido antes, mas isso não exige ADR nem
discussão de arquitetura.

CONTEXTO:
Rodei npx tsc --noEmit no HEAD atual (de1e49b) e encontrei 12 erros reais
que não constam em nenhum relatório anterior. A causa raiz é uma única:
quando apiService.server.ts foi renomeado para apiService.functions.ts em
algum momento da sequência de correções, 9 imports não foram atualizados
(são todos `import type`, por isso o build/dev não quebra em runtime — só
o type-check).

ESCOPO:
1. Corrigir os 9 imports de "@/lib/apiService.server" e
   "../apiService.server" para "@/lib/apiService.functions" /
   "../apiService.functions" nos arquivos:
   - src/components/ceiling/AssetComparator.tsx
   - src/components/ceiling/AssetForm.tsx
   - src/components/ceiling/watchlist/WatchlistActionsContext.tsx
   - src/components/ceiling/watchlist/WatchlistTable.tsx
   - src/components/ceiling/watchlist/assetCard/AssetCardHeader.tsx
   - src/components/ceiling/watchlist/useLiveQuotesAndMeta.ts
   - src/components/horizonte/NewContributionDialog.tsx
   - src/components/shared/AssetCard.tsx
   - src/components/shared/TickerSearchField.tsx
   - src/lib/__tests__/benchmarkHistory.test.ts
   - src/lib/__tests__/formatYahooTicker.test.ts
   (confirme se a lista bate exatamente com o que o tsc aponta no seu
   ambiente antes de aplicar — pode haver mais algum arquivo se o path
   mudou de novo depois do meu último clone)

2. Corrigir src/components/shared/TickerSearchField.tsx linha ~202: erro
   TS7053 "Element implicitly has an 'any' type" ao indexar
   Record<AssetType, string>. Tipar o índice corretamente (ex: `as
   AssetType` no acesso, ou tipar a variável de índice como AssetType),
   sem usar `as any`.

PROIBIDO:
- Usar `as any` ou `@ts-ignore` para calar o erro em vez de corrigir o
  tipo de verdade.
- Tocar em qualquer lógica de negócio — é correção de import/tipo, nada
  mais.

ENTREGA:
Um único commit atômico (ex: "fix(imports): resolve stale
apiService.server references and implicit any [Fix TSC Gate]"). Colar
output CRU e completo de npx tsc --noEmit (deve dar 0 erros), npm run
test, npm run build.
```
