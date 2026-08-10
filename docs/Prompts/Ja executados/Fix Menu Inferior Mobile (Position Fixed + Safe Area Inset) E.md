### Fix: Menu Inferior Mobile (Position Fixed + Safe Area Inset) ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz**:
  - `src/components/layout/MobileBottomNav.tsx` continha `fixed` e `relative` na mesma classList (`className="fixed ... relative"`). A regra `.relative` era emitida após `.fixed` no CSS do Tailwind, sobrepondo o posicionamento fixo.
  - As classes `pb-safe` e `bottom-safe` eram inertes pois o projeto não possui o plugin `tailwindcss-safe-area`.
- **Alterações**:
  - `src/components/layout/MobileBottomNav.tsx`:
    - Removido `relative` do elemento `<nav>`, garantindo posicionamento `fixed` no rodapé da tela.
    - Substituído `pb-safe` por `pb-[env(safe-area-inset-bottom,0px)]` e ajustada a altura dinâmica para `min-h-[72px]`.
    - Substituído `bottom-safe` no fade visual por `bottom-[env(safe-area-inset-bottom,0px)]`.
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos) e SSR (251 módulos).

---