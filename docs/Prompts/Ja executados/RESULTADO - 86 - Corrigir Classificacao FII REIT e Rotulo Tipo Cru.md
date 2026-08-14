# RESULTADO — Prompt 86: Corrigir Classificação FII/REIT e Rótulo Tipo (i18n)

## Resumo
Duas correções independentes:
1. **Ordem de classificação em `classifyYahoo`**: Verificar `.SA` (tickers brasileiros) ANTES do regex de REIT para evitar classificar FIIs brasileiros como REITs americanos
2. **i18n em `PortfolioTableV2`**: Substituir `{item.type}` cru por `{t.types[item.type]}` para traduzir labels de classe de ativo

---

## Correção 1: `src/lib/api/classify.server.ts` — Ordem de `classifyYahoo`

### Problema
O código original verificava REIT **antes** de verificar se o ticker terminava em `.SA`:
```typescript
if (/REIT|REALTY|REAL ESTATE/.test(name)) return "REIT";  // Linha 17
if (q.symbol.endsWith(".SA")) return classifyBr(...);      // Linha 18
```
Isso fazia com que FIIs brasileiros (ex: `HGLG11.SA`) cujo nome continha "REIT" ou "REAL ESTATE" fossem classificados incorretamente como `REIT` (EUA) em vez de `FII` (Brasil).

### Solução
Invertida a ordem — `.SA` check **primeiro**:
```typescript
// Brazilian tickers end with .SA — check FIRST to avoid misclassifying Brazilian REITs (FIIs) as US REITs
if (q.symbol.endsWith(".SA")) return classifyBr(q.symbol.replace(".SA", ""));
if (/REIT|REALTY|REAL ESTATE/.test(name)) return "REIT";
```

### Impacto
- `HGLG11.SA` → `FII` (correto, era `REIT`)
- `KNCR11.SA` → `FII` (correto)
- `XPML11.SA` → `FII` (correto)
- `O.SA` (Realty Income BDR) → `STOCK_BR` (via `classifyBr`, correto)
- `O` (NYSE) → `REIT` (correto, continua funcionando)

---

## Correção 2: `src/components/horizonte/PortfolioTableV2.tsx` — i18n do Tipo

### Problema
Na linha 222 (componente `PortfolioRow`), o tipo do ativo era renderizado cru:
```tsx
{item.type}  // ex: "FII", "STOCK_US", "ETF" — não traduzido
```
Violava a **Regra 2 (i18n Enforcement)** do AGENTS.md: "Zero hardcoded strings — use `useI18n()` hook with dictionary files".

### Solução
1. Passado o objeto `t` (dicionário i18n) do componente pai para `PortfolioRow` via props
2. Atualizada a assinatura da função `PortfolioRow` para receber `t: ReturnType<typeof useI18n>["t"]`
3. Substituído por lookup no dicionário com fallback seguro:
```tsx
{t.types[item.type as keyof typeof t.types] ?? item.type}
```

### Dicionário Usado (`dict.ptBR.ts` → `types`)
```typescript
types: {
  STOCK_US: "Stock",
  STOCK_BR: "Ação",
  REIT: "REIT",
  FII: "FII",
  FII_INFRA: "FII-Infra",
  FIAGRO: "FIAGRO",
  ETF: "ETF",
  FIXED_INCOME: "Renda Fixa",
} as Record<AssetType, string>
```

### Resultado Visual (pt-BR)
| Antes (raw) | Depois (traduzido) |
|-------------|-------------------|
| `FII` | `FII` |
| `STOCK_BR` | `Ação` |
| `STOCK_US` | `Stock` |
| `ETF` | `ETF` |
| `FIXED_INCOME` | `Renda Fixa` |
| `REIT` | `REIT` |
| `FII_INFRA` | `FII-Infra` |
| `FIAGRO` | `FIAGRO` |

---

## Validação
- ���� `npx tsc --noEmit` — Type check passa
- ���� `npm run test` — 322 testes passam
- ���� `npm run build` — Build bem-sucedido

---

## Arquivos Modificados
| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/lib/api/classify.server.ts` | Bug fix — ordem de classificação |
| `src/components/horizonte/PortfolioTableV2.tsx` | Bug fix — i18n + prop drilling `t` |

---

## Notas Técnicas
- **Nenhuma mudança no `classifyBr`** — a lógica brasileira continua intacta
- **`classifyYahoo` é server-only** (sufixo `.server.ts`), roda em Cloud Functions
- **`PortfolioTableV2`** é usado na rota `/independencia-financeira` (Horizonte FI)
- O fallback `?? item.type` garante que, se por algum motivo a chave não existir no dicionário, o valor raw ainda aparece (fail-safe)