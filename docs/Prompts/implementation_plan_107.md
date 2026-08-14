# Plano de Implementação — Prompt 107: Risk Radar Label Cru + Causa Raiz Moeda Errada

## 1. Contexto e Objetivos

O Prompt 107 aborda duas frentes:
1. **Parte 1 (Fix Direto)**: Eliminar vazamento de enums crus em JSX (`STOCK_US`, `STOCK_BR`, etc.) em `RiskRadar.tsx` e em qualquer outro componente da aplicação, padronizando a tradução via `t.types[item.type] ?? item.type`.
2. **Parte 2 (Investigação e Correção da Causa Raiz de Moeda)**: Identificar e sanar a causa raiz que levou ativos de classe internacional (`STOCK_US`, `REIT`) a terem moeda `BRL` ou `undefined` no armazenamento/ingestão, garantindo auto-healing preventivo e resiliência ponta a ponta.

---

## 2. Governança de Roles (Regra 9 de `AGENTS.md`)

- **fuente-architecture-review**: Garante que a tradução de tipos siga o padrão canônico estabelecido e que o schema de moeda seja tratado como SSOT estrita no pipeline `ingestão -> Firestore -> rowToItem -> useValuedPortfolio -> usePortfolioRisk`.
- **fuente-solution-architect**: Estrutura a hierarquia de resolução de moeda (`API > Type Inference > Currency Heuristic`) com auto-healing defensivo em `watchlist.ts` (`rowToItem` e `readLocal`).
- **fuente-business-architect**: Assegura consistência nas exposições cambiais (BRL vs USD) e no impacto da conversão de taxa de câmbio (`USDBRL`) sobre o patrimônio total.
- **fuente-product-manager**: Valida que todas as telas de risco e carteira exibam rótulos claros e consistentes em todos os idiomas suportados (`ptBR`, `en`, `es`).
- **fuente-product-marketing**: Assegura nomenclatura financeira elegante e padronizada (Ações, FIIs, US Stocks, US REITs).
- **fuente-ux-designer**: Garante que o layout dos cards de risco mantenha harmonia visual sem quebras ou textos truncados.
- **fuente-investidor-profissional**: Valida que a exposição cambial do Risk Radar represente exatamente a alocação do investidor em ativos dolarizados.
- **fuente-investidor-iniciante**: Elimina termos de programação obscuros (`STOCK_US`) da interface, tornando o Risk Radar autoexplicativo.
- **fuente-advogado-lgpd-gdpr**: Não aplicável diretamente a esta tarefa, pois não há alteração de dados pessoais sensíveis ou novos fluxos de consentimento.

---

## 3. Investigação Detalhada da Causa Raiz (Parte 2)

Durante a auditoria profunda do código-fonte, identificamos **3 causas concorrentes** para a distorção de moeda:

1. **Lacuna no `rowToItem` e `readLocal` (`src/lib/watchlist.ts:88,185`)**:
   - `rowToItem` lê `currency: r.currency as Currency`. Se um documento no Firestore ou no LocalStorage não tiver o campo `currency` (dado legado, migração incompleta ou importação antiga), `currency` fica `undefined`.
   - `readLocal` não continha sanitização ou fallback para `currency`.
   - **Efeito**: Ativos com `currency` indefinido não incrementavam os acumuladores em `useValuedPortfolio` e caíam em chaves inválidas em `usePortfolioRisk`.
2. **Fallback Silencioso e Arriscado em `brapi.server.ts:114`**:
   - `currency: (res.currency as Currency) || "BRL"` assumia `"BRL"` silenciosamente mesmo quando a API não retornava o campo ou quando o tipo do ativo era internacional (ex: BDR classificado como `STOCK_US`).
   - Não havia log de warning para alertar a ausência de moeda pela API.
3. **Falta de Auto-Healing Defensivo para Ativos Internacionais**:
   - Por definição do modelo de domínio (`domain.ts`), ativos do tipo `STOCK_US` e `REIT` são cotados em dólares americanos (`USD`). Se por qualquer anomalia de dado legado um ativo `STOCK_US` estiver armazenado com `currency: "BRL"`, ele deve ser corrigido/sanitizado automaticamente na camada de carregamento (`rowToItem` / `readLocal`).

---

## 4. Pontos de Atenção & Decisões de Arquitetura (Regra 8 de `AGENTS.md`)

| Risco Identificado | Decisão Tomada |
| :--- | :--- |
| **Risco 1: BDRs negociados na B3 (em BRL) com `type: STOCK_US`** | BDRs (ex: `AAPL34`) são cotados em Reais (BRL), mas classificados heuristicamente por `classifyBr` como `STOCK_US`. Se forçarmos todo `STOCK_US` a ser `USD`, o preço em Reais (R$ 50) seria multiplicado pela cotação do dólar (5.5x), distorcendo o patrimônio. | **Decisão 1**: No auto-healing de `rowToItem`, se o ticker terminar com `34`, `35` ou for identificado por `isBrTicker(ticker)`, a moeda primária é mantida como `BRL`. Apenas tickers genuinamente internacionais (sem sufixo B3 / não-BR) do tipo `STOCK_US` ou `REIT` têm fallback forçado para `USD`. |
| **Risco 2: Outros componentes renderizando enums crus** | Apenas corrigir `RiskRadar.tsx` deixaria outras telas vulneráveis ao mesmo bug visual. | **Decisão 2**: Varredura completa em `src/` identificou e corrigirá todas as ocorrências de `{item.type}` sem tradução, padronizando para `{t.types[type as keyof typeof t.types] ?? type}`. |
| **Risco 3: Brapi API não informando moeda** | Assumir cegamente `"BRL"` mascara bugs de classificação. | **Decisão 3**: Em `brapi.server.ts`, inferir a moeda a partir do tipo caso a API não envie, e emitir `console.warn` estruturado quando o fallback for acionado. |
| **Risco 4: Persistência de dados legados no Firestore** | Itens já salvos com `currency: undefined` continuariam errados se não houver sanitização na leitura. | **Decisão 4**: `rowToItem` e `readLocal` aplicarão auto-healing automático na leitura de dados, garantindo que o estado em memória e a reescrita no Firestore fiquem consistentes sem necessidade de script manual destrutivo. |

---

## 5. Arquivos a Criar / Modificar

### 5.1 [MODIFY] [`src/components/ceiling/RiskRadar.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/RiskRadar.tsx)
- Substituir `{tItem.type}` na linha 138 por `{t.types[tItem.type as keyof typeof t.types] ?? tItem.type}`.

### 5.2 [MODIFY] [`src/lib/watchlist.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/watchlist.ts)
- Em `rowToItem`: adicionar resolução e auto-healing de `currency`:
  ```typescript
  const isUsdAsset = (r.type === "STOCK_US" || r.type === "REIT") && !isBrTicker(r.ticker);
  const resolvedCurrency: Currency = (r.currency as Currency) || (isUsdAsset ? "USD" : "BRL");
  ```
- Em `readLocal`: adicionar sanitização de `currency` equivalente.

### 5.3 [MODIFY] [`src/lib/api/brapi.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/brapi.server.ts)
- Ajustar linha 114 para inferência estruturada com aviso:
  ```typescript
  const currency: Currency = (res.currency as Currency) || (type === "STOCK_US" && !isBrTicker(clean) ? "USD" : "BRL");
  if (!res.currency) {
    console.warn(`[brapi] missing currency in response for ${clean}, inferred ${currency} from type ${type}`);
  }
  ```

### 5.4 [MODIFY] [`src/lib/api/yahoo.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/yahoo.server.ts)
- Garantir fallback robusto:
  ```typescript
  const currency: Currency = (res.meta.currency as Currency) || (type === "STOCK_US" || type === "REIT" ? "USD" : "BRL");
  ```

### 5.5 [NEW] [`src/lib/__tests__/currencyAutoHealing.test.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/__tests__/currencyAutoHealing.test.ts)
- Testes unitários cobrindo:
  1. Leitura de `WatchlistItem` sem `currency` ou com `currency` nulo no Firestore.
  2. Auto-healing de ativo US (`AAPL`, `O`) para `USD`.
  3. Preservação de BDRs B3 (`AAPL34`) em `BRL`.
  4. Cálculo de Currency Exposure no `usePortfolioRisk` com dados curados e dados curados via auto-healing.

---

## 6. Plano de Verificação

### 6.1 Testes Automatizados
- `npx vitest run src/lib/__tests__/currencyAutoHealing.test.ts`
- `npx vitest run src/lib/__tests__/portfolioRisk.test.ts`
- `npm test` (suite completa)

### 6.2 Gates Obrigatórios (Regra 8)
1. `npx tsc --noEmit` limpo (0 erros).
2. `npm run test` sem nenhuma falha.
3. `npm run build` limpo gerando bundle de produção com sucesso.
