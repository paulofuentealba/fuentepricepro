# Relatório de Execução — Completar Migração de `bvps` em `useValuedPortfolio.ts`

**Data:** 10 de Agosto de 2026  
**Atividade:** Completar Migração de `bvps` em `useValuedPortfolio.ts` (SSOT Convergence)  
**Branch:** `dev`  
**Status:** Concluído com sucesso (100% das ocorrências de `bvps` migradas para `calculateBvps`)

---

## 1. Resumo da Correção

1. **Definição de `AssetMeta` Atualizada (`utils.ts`)**:
   - Adicionada a propriedade `bvps: number | null` à interface `AssetMeta` em `src/components/ceiling/watchlist/utils.ts`.
2. **Propagação do Dado em `useLiveQuotesAndMeta.ts`**:
   - Adicionado `bvps: asset.metrics?.bvps ?? null` no mapeamento de metadata do ativo.
3. **Consumo SSOT em `useValuedPortfolio.ts`**:
   - Importada a função `calculateBvps` de `@/lib/calculations`.
   - Substituído o cálculo inline antigo `m?.pbRatio ? m.currentPrice / m.pbRatio : null` por `calculateBvps(m?.bvps, m?.pbRatio, livePrice)`.
4. **Alinhamento em `DividendRadar.tsx`**:
   - Atualizado `DividendRadar.tsx` para também consumir `calculateBvps(asset.metrics?.bvps, asset.metrics?.pbRatio, asset.currentPrice)` em vez de um fallback local manual.

---

## 2. Auditoria Completa de `bvps` no Repositório

Busca global por `/ pbRatio` e recálculos inline em todo o diretório `src/`:

| Arquivo | Status | Método Utilizado |
|---|---|---|
| `src/lib/useValuedPortfolio.ts` | **Migrado** ✅ | `calculateBvps(m?.bvps, m?.pbRatio, livePrice)` |
| `src/components/shared/AssetCard.tsx` | **Migrado** ✅ | `calculateBvps(asset.metrics?.bvps, asset.metrics?.pbRatio, asset.currentPrice)` |
| `src/components/ceiling/AssetComparator.tsx` | **Migrado** ✅ | `calculateBvps(data.metrics?.bvps, data.metrics?.pbRatio, data.currentPrice)` |
| `src/components/ceiling/DividendRadar.tsx` | **Migrado** ✅ | `calculateBvps(asset.metrics?.bvps, asset.metrics?.pbRatio, asset.currentPrice)` |
| `src/lib/calculations.ts` | **Definição SSOT** ✅ | `calculateBvps(bvpsInput, pbRatio, currentPrice)` |

**Conclusão da Busca:** **Zero ocorrências** de cálculo inline ou duplicado de `bvps` restantes em todo o projeto `src/`.

---

## 3. Testes de Regressão & Convergência

Adicionado novo bloco de testes em `src/lib/__tests__/calc.test.ts`:
- **Prevalência de `bvps` Direto:** Valida que se `bvps` direto da API existir (ex: `15.0`) e divergir do valor recalculado via `currentPrice / pbRatio` (ex: `100 / 2 = 50.0`), o valor direto `15.0` prevalece no modelo de Graham (resultando em teto de Graham `25.98`, e **não** `47.43`).
- **Fallback Automático:** Valida fallback para `currentPrice / pbRatio` se `bvps` direto for `null` ou `0`.
- **Convergência entre Telas:** Valida que `useValuedPortfolio` e `AssetCard` produzem exatamente os mesmos valores de `bvps` para o mesmo ativo.

---

## 4. Gates de Saída & Verificação

1. `npx tsc --noEmit` — **Aprovado (0 erros)**
2. `npx vitest run` — **Aprovado (30 suítes passadas, 188 testes passados)**
3. `npm run build` — **Aprovado (Build de produção SSR + Client executado com sucesso)**
