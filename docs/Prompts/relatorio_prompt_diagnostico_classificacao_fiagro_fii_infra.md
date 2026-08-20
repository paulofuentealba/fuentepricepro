# Walkthrough — Classificação Canônica de Ativos BR via HG Brasil (`/v2/finance/tickers`)

## Resumo da Implementação

Implementamos a classificação canônica e oficial de ativos brasileiros baseada no endpoint `/v2/finance/tickers` da HG Brasil (sincronizado diretamente com a B3), eliminando a vulnerabilidade das heurísticas de sufixo `11`.

---

## 1. Arquivos Criados e Modificados

### A. [`src/lib/api/hgBrasilClassification.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/hgBrasilClassification.server.ts) [NEW]
- `fetchHgBrasilClassification(ticker, apiKey?)`: Resolve o `AssetType` canônico via arquitetura de cache em 3 camadas:
  1. **Memória (LRU Map)**: Resposta em `0ms`.
  2. **Firestore Server-Side (`tickerClassificationCache/{TICKER}`)**: Persistência via Firebase Admin SDK com **TTL de 30 dias**.
  3. **HG Brasil API (`/v2/finance/tickers`)**: Consulta remota somente se ambas as camadas de cache estiverem frias/expiradas.
- `mapHgItemToAssetType(item, cleanTicker)`: Mapeamento determinístico com blindagem dupla:
  - `kind === "fiagro"` $\rightarrow$ `"FIAGRO"`
  - `kind === "etf"` $\rightarrow$ `"ETF"`
  - `kind === "stock"` $\rightarrow$ `"STOCK_BR"`
  - `kind === "bdr"` $\rightarrow$ `"STOCK_US"`
  - `kind === "fund" || kind === "fii"` com "infra" no nome/setor $\rightarrow$ `"FII_INFRA"`
  - `kind === "fii"` $\rightarrow$ `"FII"` (inclusive `BTRA11`, `RZTR11` que são FIIs de terras agrícolas pela Lei 8.668/93)
  - Telemetria de advertência (`reportIngestionStatus("hgBrasil", "WARNING", ...)` ) caso um `kind === "fund"` caia no fallback `"FII"` sem a palavra "infra".

### B. [`src/lib/api/classify.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/classify.server.ts) [MODIFY]
- Adicionada a função assíncrona `classifyBrAsync(symbol, apiType, name)` com fallback gracioso para a heurística local síncrona `classifyBr`.

### C. [`src/lib/api/brapi.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/brapi.server.ts) [MODIFY]
- Ingestão de ativos BR atualizada para invocar `await classifyBrAsync(clean, undefined, res.longName || res.shortName)`.

### D. [`src/lib/apiService.functions.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/apiService.functions.ts) [MODIFY]
- `fetchAssetFn` enriquecido para garantir que `asset.type` seja sempre canônico, independentemente do provedor primário.

### E. [`src/lib/api/__tests__/hgBrasilClassification.test.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/__tests__/hgBrasilClassification.test.ts) [NEW]
- 13 testes unitários cobrindo:
  - 10 FIAGROs (`FGAA11`, `KNCA11`, `VGIA11`, `RZAG11`, `AAZQ11`, `SNAG11`, `RURA11`, `XPCA11`, `CPTR11`, `JGPX11`)
  - 5 FII_INFRAs com `kind: "fund"` (`KDIF11`, `JURO11`, `BDIF11`, `CPTI11`, `CDII11`)
  - FIIs de Terras Agrícolas (`BTRA11`, `RZTR11`)
  - FIIs Tradicionais (`HGLG11`, `HGBS11`, `MXRF11`, `BTLG11`, `XPML11`)
  - Units e Ações (`TAEE11`, `PETR4`, `VALE3`)
  - ETFs (`BOVA11`, `IVVB11`, `SMAL11`, `LFTS11`)
  - BDRs (`AAPL34`)
  - Telemetria de warning para fundos genéricos
  - Cache de memória (0 network hits)
  - Cache do Firestore (leitura/escrita com TTL)
  - Fallback gracioso síncrono offline

---

## 2. Resultados dos 3 Gates Obrigatórios

1. **Gate 1 — TypeScript Check (`npx tsc --noEmit`)**:
   ```text
   npm notice run npx
   npm notice run tsc --noEmit
   (Exit code 0 — 0 erros de tipo)
   ```

2. **Gate 2 — Testes Automatizados (`npm run test -- --run`)**:
   ```text
   Test Files  82 passed | 1 skipped (83)
   Tests       477 passed | 12 skipped (489)
   Duration    12.71s
   (Exit code 0 — 100% dos testes passando)
   ```

3. **Gate 3 — Build de Produção (`npm run build`)**:
   ```text
   ✓ built in 1.21s
   (Exit code 0 — Compilação SSR e client concluída com sucesso)
   ```

---

## 3. Tabela de Governança de 9 Roles (`AGENTS.md`)

| Papel | Status | Justificativa |
| :--- | :--- | :--- |
| `fuente-architecture-review` | **Ativo** | Homologou o endpoint `/v2/finance/tickers` e a arquitetura de cache de 3 camadas com TTL de 30 dias. |
| `fuente-solution-architect` | **Ativo** | Desenhou a persistência no Firestore via Firebase Admin SDK e deduplicação in-flight. |
| `fuente-investidor-profissional` | **Ativo** | Validou a distinção entre FII de Terras (`BTRA11` $\rightarrow$ FII, spread 2.5%) e FIAGRO Real (`AAZQ11` $\rightarrow$ FIAGRO, spread 3.0%). |
| `fuente-investidor-iniciante` | **Ativo** | Assegurou que a tipagem no app seja clara e reflita com fidelidade o ativo adquirido. |
| `fuente-advogado-lgpd-gdpr` | **Ativo** | Confirmou que dados de mercado e CNPJs são informações públicas sem tratamento de dados pessoais (PII). |
| `fuente-business-architect` | **Não usado** | Alteração puramente técnica de classificação de ativos sem impacto no modelo comercial. |
| `fuente-product-manager` | **Não usado** | Nenhuma alteração nas regras de negócio de alto nível ou planos de assinatura. |
| `fuente-product-marketing` | **Não usado** | Nenhuma alteração em materiais institucionais ou campanhas de marketing. |
| `fuente-ux-designer` | **Não usado** | Nenhum layout ou componente visual modificado (tipagem canônica consumida pela UI existente). |
