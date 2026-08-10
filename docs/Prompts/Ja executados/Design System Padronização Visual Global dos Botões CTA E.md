### Design System: Padronização Visual Global dos Botões CTA ✅ CONCLUÍDO E VERIFICADO

- **Motivação**:
  - Alinhamento de identidade visual com a referência de produção ("Add Asset"): substituição do tom verde mint claro/lavado em dev por um verde esmeralda denso, sólido, com texto branco e sombra elegante.
- **Alterações**:
  - `src/styles.css`:
    - Atualizados os tokens `--primary` e `--sidebar-primary` para `oklch(0.58 0.16 162)` (Dark) e `oklch(0.52 0.16 162)` (Light), garantindo a tonalidade esmeralda idêntica a `emerald-600`.
    - Atualizados os tokens `--primary-foreground` para `oklch(0.99 0 0)` (branco puro em ambos os temas).
  - `src/components/ui/button.tsx`:
    - Adicionada a sombra colorida sutil com elevação e transição à variante `default`: `shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 hover:bg-primary/90 transition-all duration-200`.
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 1.88s) e SSR (251 módulos em 851ms).

---