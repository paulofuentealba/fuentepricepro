# Plano de Implementação — Prompts 108 e 109

## 1. Contexto e Objetivos

Este lote compreende dois prompts críticos para a robustez de dados e governança de código:

1. **PROMPT 108 — Guard Automático: Impedir Vazamento de Enum Cru (SSOT) no Build**:
   - Criar `scripts/check-ssot-leaks.js` para detectar automaticamente:
     - **Regra 1**: Renderização de `{something.type}` em arquivos `.tsx` sem passar por `t.types[...]`.
     - **Regra 2**: Inferência ad-hoc de moeda por `type` (ex: `["STOCK_US", "REIT"].includes`) fora dos arquivos canônicos de resolução da SSOT.
   - Integrar no `package.json` no passo de `build` (`npm run check-ssot-leaks`).
2. **PROMPT 109 — Datas de Proventos: Corrigir Conflação exDate/paymentDate + Investigação Fonte B3**:
   - **Parte 1 (Fix)**: Em `src/lib/api/brapi.server.ts:103`, eliminar a conflação de `paymentDate` como `exDate` quando `lastDatePrior` estiver ausente. Corrigir também a seleção de `exDividendDate` (data com futura) para não usar `paymentDate`. Adicionar testes de regressão.
   - **Parte 2 (Investigação)**: Documentar a pesquisa sobre o endpoint de eventos da B3, estabilidade, viabilidade legal (termos de uso) e recomendação técnica fundamentada.

---

## 2. Governança de Roles (Regra 9 de `AGENTS.md`)

- **fuente-architecture-review**: Garante que o script `check-ssot-leaks.js` atue como guardrail automatizado de CI/build, impedindo regressões em tempo de desenvolvimento.
- **fuente-solution-architect**: Separa rigorosamente os domínios de `exDate` (data-com) e `paymentDate` (data de pagamento) no pipeline de proventos.
- **fuente-business-architect**: Garante precisão no cálculo de proventos realizados (`calculateRealizedIncome`), evitando que ações compradas entre a data-com e a data de pagamento recebam proventos indevidamente.
- **fuente-product-manager**: Valida que eventos sem data-com confirmada não exibam datas falsas ao investidor.
- **fuente-product-marketing**: Assegura consistência na comunicação de dividendos e governança de dados.
- **fuente-ux-designer**: Garante que os cards de proventos e banners lidem graciosamente com proventos com data a confirmar.
- **fuente-investidor-profissional**: Exige estrita separação entre data-com e data de liquidação financeira.
- **fuente-investidor-iniciante**: Protege o investidor contra decisões de compra baseadas em data-com conflada com data de pagamento.
- **fuente-advogado-lgpd-gdpr**: Avalia conformidade dos termos de uso da B3 quanto ao acesso automatizado de dados de mercado.

---

## 3. Pontos de Atenção & Decisões de Arquitetura (Regra 8 de `AGENTS.md`)

| Risco Identificado | Decisão Tomada |
| :--- | :--- |
| **Risco 1: Falso positivo no script de lint `check-ssot-leaks.js`** (ex: `type={it.type}` em atributos JSX ou `t.types[it.type] ?? it.type`) | **Decisão 1**: O regex da Regra 1 verificará especificamente expressões JSX de interpolação textual (`>{...}<` ou `{something.type}` solto como filho JSX) e excluirá linhas que contenham `t.types[`. Validado contra os 9 pontos de referência do repo. |
| **Risco 2: Bloqueio indevido de inferência legítima de moeda** | **Decisão 2**: A Regra 2 define uma whitelist estrita dos arquivos de resolução da SSOT (`watchlist.ts`, `brapi.server.ts`, `yahoo.server.ts`, `dynamicCsvParser.ts`, `transactionPersistence.ts`, `classify.ts`, fixtures de teste). Qualquer outro arquivo que tente inferir moeda por `type` será barrado. |
| **Risco 3: Evento de provento sem `lastDatePrior` na Brapi** | **Decisão 3**: Em `brapi.server.ts`, `exDate` recebe `d.lastDatePrior ?? ""`. Se `lastDatePrior` for nulo, o evento não atribuirá a data de pagamento ao campo `exDate`, evitando cálculo errôneo de custódia na data-com. |
| **Risco 4: Dependência de endpoint não documentado da B3** | **Decisão 4**: Não integrar o endpoint reverso da B3 em produção nesta rodada. Apresentar os riscos de WAF/Cloudflare e violação dos termos de uso da B3 no relatório da Parte 2. |

---

## 4. Arquivos a Criar / Modificar

### 4.1 [NEW] [`scripts/check-ssot-leaks.js`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/scripts/check-ssot-leaks.js)
- Implementar varredura em `src/` com as Regras 1 e 2.
- Saída formatada com arquivo, linha e mensagem explicativa clara.

### 4.2 [MODIFY] [`package.json`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/package.json)
- Adicionar script `"check-ssot-leaks": "node scripts/check-ssot-leaks.js"`.
- Atualizar `"build": "npm run check-tagline && npm run check-ssot-leaks && vite build"`.

### 4.3 [MODIFY] [`src/lib/api/brapi.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/brapi.server.ts)
- Linhas 80-87: Selecionar `exDividendDate` futura estritamente a partir de `d.lastDatePrior` (sem fallback para `paymentDate`).
- Linha 103: Definir `exDate: d.lastDatePrior ?? ""` (sem fallback para `paymentDate`).

### 4.4 [NEW] [`src/lib/__tests__/dividendDatesConflation.test.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/__tests__/dividendDatesConflation.test.ts)
- Testes unitários cobrindo o mapeamento de proventos da Brapi com `lastDatePrior` presente vs ausente.
- Teste garantindo que `exDate` nunca receba `paymentDate`.

---

## 5. Plano de Verificação

### 5.1 Testes Automatizados
- `node scripts/check-ssot-leaks.js` (deve passar com 0 erros e 0 falsos positivos).
- `npx vitest run src/lib/__tests__/dividendDatesConflation.test.ts`.
- `npm test` (suite completa).

### 5.2 Gates Obrigatórios (Regra 8)
1. `npx tsc --noEmit` limpo (0 erros).
2. `npm run test` sem nenhuma falha.
3. `npm run build` limpo (executando `check-tagline` e `check-ssot-leaks`).
