### Item 1: Investigação e Correção da Divergência Ceiling Price vs Fuente Consensus ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz & Investigação**:
  - **Single Source of Truth**: Em `src/lib/calculations.ts`, `getAssetValuation` calcula `activeCeiling` e `consensus`. O `activeCeiling` é definido como `consensus !== null ? consensus : bazin || 0`, garantindo matematicamente que `activeCeiling` e `consensus` sejam exatamente iguais quando o consenso está disponível.
  - **Causa da Divergência Visual (R$ 0,00)**: No componente `ResultStats.tsx`, o valor de `ceiling` era renderizado envolvido por `<AnimatedNumber value={ceiling} format={...} />`. Em `AnimatedNumber.tsx`, a animação utilizava `useInView(ref, { once: true, margin: "-50px" })` e inicializava `motionValue` com `0`. Em telas/viewports onde o card `ResultStats` ficava próximo à borda inferior do viewport sem atingir a margem negativa de -50px, `useInView` retornava `false`. O `motionValue` permanecia em `0`, travando a exibição em `"R$ 0,00"` no card principal, enquanto o `ValuationRadar` (que renderiza o valor numérico diretamente sem `AnimatedNumber`) exibia `"R$ 49,24"`.
- **Correção Implementada**:
  - **`src/components/ui/AnimatedNumber.tsx`**:
    - Inicializado `motionValue` diretamente com o valor do prop `value` (`useMotionValue(value)`), garantindo que a renderização inicial e os fallbacks exibam imediatamente o valor numérico correto em vez de `0`.
    - Ajustada a margem do `useInView` de `"-50px"` para `"0px"`, evitando que elementos na viewport fiquem travados por recuo de interseção.
    - Adicionado suporte a atualização dinâmica via `useEffect` garantindo limpeza de timers e reatividade quando `value` é alterado.
  - **`src/lib/__tests__/calc.test.ts`**:
    - Adicionado teste unitário específico para `VALE3` a 6% de target yield garantindo alinhamento 100% estrito entre `activeCeiling` e `consensus` no `getAssetValuation`.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **143 passed** | 4 skipped (24 test files passed).
  3. **`npm run build`**: Client (4097 módulos em 13.92s) e SSR (251 módulos em 977ms) compilados limpos sem erros.

---