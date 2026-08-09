# Item 2: Investigação e Correção do Global Radar "0/0/0"

> [!NOTE]
> Relatório detalhado de investigação, diagnóstico de causa raiz em API/UI e evidências de validação para o Item 2.

---

## 1. Contexto e Problema Documentado

Na tela **Global Radar** (`/app/globalradar`), o resumo exibia persistentemente:
- **"All 0 / Undervalued 0 / Overvalued 0"**
- Tabela de ativos vazia (*empty state*).

Para o perfil de investidor profissional, o Global Radar funciona como screener geral de mercado e deve listar continuamente os ativos acompanhados com seus indicadores de valoração.

---

## 2. Diagnóstico da Causa Raiz (Duplo Bug Detectado)

### A. Descarte Indevido na API Server (`fetchRadarFn`)
- **Local do Bug**: [`src/lib/apiService.functions.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/apiService.functions.ts) (linha 340).
- **Código com Falha**:
  ```ts
  if (asset && asset.metrics.dividendCagr5y) {
    return { ...asset, ticker: cleanTicker(asset.ticker) };
  }
  ```
- **Mecanismo da Falha**: `asset.metrics.dividendCagr5y` é calculado por `dividendCagrPct` e retorna `null` para ativos com histórico menor que 2 anos ou distribuição constante (como a maioria dos FIIs `MXRF11`, `BTLG11`, `HGLG11`, REITs `O`, ETFs `DIVO11`, `NDIV11`, `SPYI`, `JEPI` e ações com dividendos recentes/estáveis).
- A instrução `if (asset.metrics.dividendCagr5y)` avaliava para `false` para esses ativos, descartando-os silenciosamente da resposta do backend.

### B. Pré-Filtro Hardcoded no Componente Visual (`DividendRadar.tsx`)
- **Local do Bug**: [`src/components/ceiling/DividendRadar.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/DividendRadar.tsx) (linha 107).
- **Código com Falha**:
  ```tsx
  .filter((asset: any) => asset.ceiling > asset.currentPrice) || [];
  ```
- **Mecanismo da Falha**:
  - O componente aplicava um filtro inline retirando todos os ativos onde `ceiling <= currentPrice` (*Overvalued*) **antes** de repassar a lista para o `useAssetFilterSort`.
  - Como resultado, a contagem de ativos *Overvalued* era **sempre 0**.
  - Quando os ativos consultados estavam sobreavaliados perante a Selic/Yield Alvo selecionado, a lista ficava totalmente vazia (`[]`), resultando em **"All 0 / Undervalued 0 / Overvalued 0"**.

---

## 3. Solução Implementada

1. **`src/lib/apiService.functions.ts`**:
   - Alterada a condição de aceite para `if (asset)`, preservando todos os ativos de mercado válidos buscados para o radar (Ações, FIIs, REITs, ETFs).

2. **`src/components/ceiling/DividendRadar.tsx`**:
   - Removido o filtro hardcoded `.filter((asset) => asset.ceiling > asset.currentPrice)`. A filtragem por oportunidade (*All / Undervalued / Overvalued*) passa a ser gerenciada dinamicamente pelo `useAssetFilterSort` e `WatchlistFilterBar`.

3. **`src/lib/__tests__/radar.test.ts`**:
   - Criado teste unitário verificando a contagem de ativos totais, subavaliados e sobreavaliados no radar.

---

## 4. Evidências Literais de Validação

> [!TIP]
> Executados e aprovados todos os 3 gates obrigatórios de qualidade do projeto.

- **`npx tsc --noEmit`**: **0 erros** (Exit Code 0).
- **`npm run test`**: **144 passed** | 4 skipped em 25 arquivos de teste (Exit Code 0).
- **`npm run build`**: Compilação limpa do cliente (4097 módulos em 1.90s) e SSR (251 módulos em 827ms).

---

## 5. Commit de Registro

```bash
git commit -m "fix(global-radar): investiga e corrige tela mostrando zero ativos [Item 2]"
```
