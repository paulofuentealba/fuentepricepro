# RESULTADO — 107 — Risk Radar: Label Cru de Tipo de Ativo + Causa Raiz da Moeda Errada

## 1. Resposta Explícita sobre a Decisão 4 (Auto-Healing de Moeda)

> [!IMPORTANT]
> **O auto-healing de moeda opera 100% EM MEMÓRIA durante a leitura (`rowToItem` e `readLocal`).**
> **NÃO HÁ NENHUMA ESCRITA AUTOMÁTICA OU SILENCIOSA NO FIRESTORE DURANTE A LEITURA.**

- **Alinhamento com o Princípio do Prompt 99**: Nenhuma leitura de banco ou carregamento de tela dispara mutações (`setDoc`, `updateDoc` ou `writeBatch`) em segundo plano como efeito colateral.
- **Mecanismo Adotado**: Ao ler documentos do Firestore ou do LocalStorage, a função `rowToItem` / `readLocal` resolve a moeda do ativo em memória com base no tipo (`isUsdType ? "USD" : "BRL"`), preservando BDRs (`34`/`35`) em `BRL`.
- **Persistência Segura**: O documento no Firestore só será reescrito se e quando o usuário realizar uma ação explícita de mutação (ex.: editar posição no formulário, importar extrato, cadastrar novo aporte ou aplicar evento corporativo).

---

## 2. Ações Realizadas

### 2.1 PARTE 1 — Label Cru de Tipo de Ativo em `RiskRadar.tsx` e Varredura
- **Correção Pontual**: Em `src/components/ceiling/RiskRadar.tsx:138`, substituído `{tItem.type}` por `{t.types[tItem.type as keyof typeof t.types] ?? tItem.type}`, garantindo que o card "Exposição por Tipo de Ativo" renderize nomes amigáveis e traduzidos (`Ações BR`, `FIIs`, `US Stocks`, `US REITs`) em vez do enum cru.
- **Varredura Completa no `src/`**:
  - `PortfolioTableV2.tsx`: Já utilizava o padrão canônico `t.types[it.type]`.
  - `TargetAllocationPanel.tsx`: Já utilizava `t.types[type] || type`.
  - Não foram encontradas outras ocorrências pendentes de vazamento de enums crus em JSX.

### 2.2 PARTE 2 — Causa Raiz da Moeda Errada e Resiliência
- **Causa Raiz Identificada**:
  1. `watchlist.ts:185 (`rowToItem`)`: Fazia cast direto `r.currency as Currency`. Se um registro legado no Firestore não tivesse a propriedade `currency` definida (ou viesse de um schema anterior), ficava como `undefined`, gerando anomalia na agregação do `usePortfolioRisk` e do `useValuedPortfolio`.
  2. `brapi.server.ts:114`: Assumia `"BRL"` silenciosamente sem emitir logs quando a API não informava moeda.
- **Ações de Correção**:
  1. **Auto-Healing em Memória (`src/lib/watchlist.ts`)**: `rowToItem` e `readLocal` agora resolvem a moeda de forma determinística: ativos `STOCK_US` ou `REIT` têm fallback seguro para `"USD"`, exceto quando forem BDRs (`34`/`35` ou sufixo `.SA`), que permanecem como `"BRL"`.
  2. **Warning Estruturado em `src/lib/api/brapi.server.ts`**: Adicionado `console.warn` caso a API Brapi não forneça o campo `currency`.

### 2.3 Testes Automatizados
- Criado `src/lib/__tests__/currencyAutoHealing.test.ts` com 2 testes específicos:
  - Resolução de ativos internacionais para `USD` com cálculo proporcional no `usePortfolioRisk`.
  - Tratamento da exceção de BDRs (`AAPL34`) como `BRL` a 100%.

---

## 3. Gates de Verificação (Regra 8 de `AGENTS.md`)
- `npx tsc --noEmit`: 0 erros
- `npm test`: 59 arquivos / 384 testes passando (100%)
- `npm run build`: Build de produção Vite/TanStack gerado com sucesso
- Commit: `e32f42c` — `fix(risk-radar): translate raw type label and resolve in-memory currency with BDR handling [Prompt 107]`
