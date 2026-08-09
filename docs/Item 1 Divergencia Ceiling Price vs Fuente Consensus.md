# Item 1: Divergência Ceiling Price vs Fuente Consensus

> [!NOTE]
> Relatório detalhado de investigação, diagnóstico de causa raiz, correção de UI e evidências de validação para o Item 1.

---

## 1. Contexto e Problema Documentado

Ao buscar ativos (como `VALE3`) no Screener com target yield de 6%, observou-se uma divergência visual na tela:
- Card superior ("Preço Teto / Ceiling Price"): exibia **R$ 0,00**.
- Card inferior ("Fuente Consensus"): exibia **R$ 49,24** corretamente.

---

## 2. Investigação & Diagnóstico da Causa Raiz

### A. Verificação do Engine de Valoração (Single Source of Truth)
- Em [`src/lib/calculations.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/calculations.ts), a função `getAssetValuation` calcula centralizadamente todos os modelos de valuation (`bazin`, `graham`, `gordon`) e deriva o `consensus`.
- A propriedade `activeCeiling` é atribuída como:
  ```ts
  const activeCeiling = consensus !== null ? consensus : bazin || 0;
  ```
- **Conclusão Matemática**: O motor de valoração (SSOT) nunca produziu valores divergentes. Sempre que `consensus` é calculado (ex: R$ 49,24), `activeCeiling` assume o mesmo valor exato de `consensus`.

### B. Descoberta da Causa Raiz Visual (Bug no `AnimatedNumber`)
- No componente [`ResultStats.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/result/ResultStats.tsx), o valor de `ceiling` era renderizado utilizando o componente `<AnimatedNumber value={ceiling} format={...} />`.
- Em [`src/components/ui/AnimatedNumber.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ui/AnimatedNumber.tsx), a implementação anterior possuía as seguintes características:
  1. `const inView = useInView(ref, { once: true, margin: "-50px" });`
  2. `const motionValue = useMotionValue(0);`
- **Mecanismo da Falha**:
  - A margem negativa de `-50px` exigia que o componente avançasse no mínimo 50px dentro da viewport visível para disparar `inView = true`.
  - Quando o card `ResultStats` era renderizado na parte inferior do viewport ou em telas sem rolagem suficiente, `inView` permanecia `false`.
  - Com `inView = false`, o `useEffect` não executava o `motionValue.set(value)`.
  - Como `motionValue` foi inicializado em `0`, o componente renderizava permanentemente `format(0)` $\rightarrow$ **"R$ 0,00"**.
  - O `ValuationRadar` (que renderiza `formatCurrency(consensus)` diretamente sem `AnimatedNumber`) exibia o valor real **"R$ 49,24"**.

---

## 3. Solução Implementada

1. **Ajuste em `AnimatedNumber.tsx`**:
   - Inicializado `motionValue` diretamente com o prop `value` (`useMotionValue(value)`), garantindo que a renderização inicial e fallbacks exibam o número numérico correto imediatamente.
   - Alterada a margem do `useInView` de `"-50px"` para `"0px"`, evitando bloqueios por recuo de interseção.
   - Atualizado o `useEffect` para atualizar reativamente `motionValue` e limpar timers de animação.

2. **Teste de Regressão em `calc.test.ts`**:
   - Adicionado teste automatizado para `VALE3` a 6% de target yield em [`src/lib/__tests__/calc.test.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/__tests__/calc.test.ts), assegurando que `activeCeiling` e `consensus` sejam estritamente idênticos.

---

## 4. Evidências Literais de Validação

> [!TIP]
> Todos os 3 gates obrigatórios de qualidade e compilação do projeto foram executados e aprovados.

- **`npx tsc --noEmit`**: **0 erros** (Exit Code 0).
- **`npm run test`**: **143 passed** | 4 skipped em 24 arquivos de teste (Exit Code 0).
- **`npm run build`**: Compilação limpa do cliente (4097 módulos em 13.92s) e SSR (251 módulos em 977ms).

---

## 5. Commit de Registro

```bash
fix(valuation): investiga e corrige divergencia Ceiling Price vs Fuente Consensus [Item 1]
```
