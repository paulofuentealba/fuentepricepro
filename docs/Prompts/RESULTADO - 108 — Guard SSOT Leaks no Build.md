# RESULTADO — 108 — Guard Automático: Impedir Vazamento de Enum Cru (SSOT) no Build

## 1. Confirmações Explícitas Requeridas

### 1.1 Whitelist de Resolução Canônica de Moeda (Decisão 2)
- **Status do `classify.ts`**: **NÃO INCLUÍDO na whitelist**.
- **Confirmação Técnica**: Inspecionamos `src/lib/classify.ts` integralmente e confirmamos que ele realiza apenas classificação de tipo (`classifyBr`, `getShareClassBadge`), sem qualquer inferência ou manipulação do campo de moeda (`currency`). Portanto, `classify.ts` não necessita de exceção e **não está** na whitelist de inferência de moeda.
- **Arquivos Autorizados na Whitelist**:
  - `src/lib/watchlist.ts` (SSOT de carregamento e auto-healing da carteira)
  - `src/lib/api/brapi.server.ts` (ingestão primária B3)
  - `src/lib/api/yahoo.server.ts` (ingestão primária internacional/fallback)
  - `src/lib/dynamicCsvParser.ts` (motor puro de parsing de arquivos de terceiros)
  - `src/lib/transactionPersistence.ts` (persistência em lote de transações)

---

### 1.2 Calibração e Validação dos 9 Pontos de Referência
O script `scripts/check-ssot-leaks.js` foi executado contra todo o repositório e validado especificamente nos 9 pontos de referência para garantir **0 falsos positivos**:

| # | Arquivo de Referência | Linha | Trecho de Código Verificado | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | `src/components/ceiling/AssetComparator.tsx` | 151 | `{t.types[a.type]}` | ✅ **Aprovado (0 alerta)** |
| 2 | `src/components/ceiling/AssetForm.tsx` | 113, 133 | `{t.types[activeType]}`, `{t.types[tp]}` | ✅ **Aprovado (0 alerta)** |
| 3 | `src/components/ceiling/DividendRadar.tsx` | 243 | `{t.types[asset.type as keyof typeof t.types] \|\| asset.type}` | ✅ **Aprovado (0 alerta)** |
| 4 | `src/components/ceiling/RiskRadar.tsx` | 139 | `{t.types[tItem.type as keyof typeof t.types] ?? tItem.type}` | ✅ **Aprovado (0 alerta)** |
| 5 | `src/components/ceiling/SmartAllocation.tsx` | 239 | `name: t.types[type as AssetType] \|\| type` | ✅ **Aprovado (0 alerta)** |
| 6 | `src/components/ceiling/TargetAllocationPanel.tsx` | 113 | `{t.types[type] \|\| type}` | ✅ **Aprovado (0 alerta)** |
| 7 | `src/components/ceiling/shared/AssetDataDisplay.tsx` | 27 | `{t.types[type]}` | ✅ **Aprovado (0 alerta)** |
| 8 | `src/components/ceiling/shared/AllocationChart.tsx` | 49 | `const typeLabel = t.types[it.type] \|\| it.type;` | ✅ **Aprovado (0 alerta)** |
| 9 | `src/components/horizonte/PortfolioTableV2.tsx` | 231 | `{t.types[item.type as keyof typeof t.types] ?? item.type}` | ✅ **Aprovado (0 alerta)** |

- **Total de Falsos Positivos**: **0**.
- **Ajustes de Calibração**: O regex foi calibrado para ignorar atribuições de propriedades JSX (ex: `type={it.type}` em `AssetTicker.tsx`) e inspecionar linhas contendo contexto `t.types[`.

---

## 2. Ações Realizadas

### 2.1 Criação do Script (`scripts/check-ssot-leaks.js`)
- Criado seguindo a mesma estrutura leve de `scripts/forbid-legacy-tagline.js`.
- **Regra 1**: Detecta interpolações JSX cruas `{something.type}` sem `t.types[...]`.
- **Regra 2**: Detecta comparações de moeda ad-hoc (`["STOCK_US", "REIT"].includes`) fora dos arquivos autorizados.

### 2.2 Integração no `package.json`
- Adicionado script:
  ```json
  "check-ssot-leaks": "node scripts/check-ssot-leaks.js",
  "build": "npm run check-tagline && npm run check-ssot-leaks && vite build"
  ```

---

## 3. Gates de Verificação (Regra 8 de `AGENTS.md`)
- `node scripts/check-ssot-leaks.js`: `OK: No SSOT leaks detected`
- `npx tsc --noEmit`: 0 erros
- `npm test`: 59 arquivos / 386 testes passando (100%)
- `npm run build`: `check-tagline`, `check-ssot-leaks` e `vite build` executados com sucesso
- Commit: `2ce3996` — `feat(guards): add check-ssot-leaks build guard and fix dividend dates conflation [Prompts 108, 109]`
