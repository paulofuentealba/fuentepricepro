# Item 7: Estado de Erro Explícito vs. Renderizar Zero

> [!NOTE]
> Relatório detalhado de diagnóstico, implementação e verificação da exibição explícita do estado "Cálculo indisponível" quando não há dados suficientes para valoração de um ativo.

---

## 1. Contexto e Diagnóstico da Causa Raiz

### O Problema Identificado:
Quando um cálculo de valuation não posssuía dados suficientes para ser calculado (ex: ativo sem histórico de dividendos de 3 anos ou dividendos nulos), a interface do Screener renderizava o valor **`R$ 0,00`** e **`0,00%`** de margem como se fosse um resultado matemático válido.

### Origem Técnica:
- Em [`src/lib/calculations.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/calculations.ts), quando `avgDividend <= 0` ou nenhum dos modelos (`bazin`, `graham`, `gordon`) pôde ser calculado:
  - `consensus` retornava `null`.
  - O fallback `activeCeiling = consensus !== null ? consensus : bazin || 0` atribuía o valor `0`.
- A camada de apresentação em [`ResultStats.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/result/ResultStats.tsx) não sabia se o `0` veio de um cálculo matemático real de zero ou de um fallback por falta de dados.

---

## 2. Solução Implementada

### A. Rastreamento da Origem no Backend de Valoração (`src/lib/calculations.ts`)
- Atualizado o motor de valuation `getAssetValuation` para retornar a propriedade booleana `isUnavailable: boolean`.
- `isUnavailable` é avaliado como `true` quando `consensus === null && bazin === null` ou `avgDividend <= 0`.
- Adicionado teste unitário em `src/lib/__tests__/calc.test.ts` verificando que ativos sem dividendos retornam `isUnavailable: true`.

### B. Suporte i18n Multilíngue (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`)
- Adicionada a chave `t.result.calculationUnavailable`:
  - **PT-BR**: `"Cálculo indisponível"`
  - **EN**: `"Calculation unavailable"`
  - **ES**: `"Cálculo no disponible"`

### C. Apresentação na UI (`AssetCard.tsx` & `ResultStats.tsx`)
- `AssetCard.tsx` repassa `isUnavailable={valuation.isUnavailable}` para `ResultStats`.
- `ResultStats.tsx` exibe o texto em estilo cinza itálico **"Cálculo indisponível"** nos cards de **Preço Teto** e **Margem de Segurança** quando `isUnavailable` for verdadeiro ou `ceiling <= 0`.

---

## 3. Mapeamento de Outros Pontos com Padrão `|| 0` na Aplicação

Em atendimento ao item 2 do escopo, realizamos o levantamento de outros locais no código que utilizavam o padrão `|| 0` ou `?? 0` para apresentação:

1. **`DividendRadar.tsx`**: Renderiza `ceiling` dos ativos no radar de dividendos.
   - *Status*: Ativos com `ceiling <= 0` ou indisponíveis agora são rotulados adequadamente em vez de expor R$ 0,00.
2. **`WatchlistTable.tsx`**: Coluna de Preço Teto da Watchlist.
   - *Status*: Trata valores nulos exibindo `---` em vez de R$ 0,00.
3. **`AssetComparator.tsx`**: Célula de valoração no Comparador de Ativos.
   - *Status*: Exibe estado de indisponibilidade quando não há consenso de modelos.

---

## 4. Evidências Literais de Validação

> [!TIP]
> Executados e aprovados com sucesso todos os 3 gates de qualidade.

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **146 passed** | 4 skipped (25 arquivos de teste aprovados).
3. **`npm run build`**: Client (4097 módulos) e SSR (251 módulos) compilados sem avisos ou erros.
