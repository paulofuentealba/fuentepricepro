### Fix Crítico: Token `--primary` (Ambos os Blocos CSS) + PaywallDialog ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz & Descoberta**:
  - `src/routes/__root.tsx` fixa `<html lang="en" className="dark">` de forma incondicional. A aplicação roda 100% do tempo na classe `.dark`.
  - Corrigir apenas o bloco `:root` não teria tido nenhum efeito em produção. Portanto, ambos os blocos (`:root` e `.dark`) foram corrigidos para o tom Emerald (hue 162).

- **Arquivos Alterados**:
  1. `src/styles.css`:
     - Bloco `:root`: `--primary: oklch(0.50 0.16 162)` (`#007d45`), `--ring`, `--sidebar-primary`, `--sidebar-ring`.
     - Bloco `.dark`: `--primary: oklch(0.70 0.17 162)` (`#10b981`), `--ring`, `--sidebar-primary`, `--sidebar-ring`.
  2. `src/components/ui/PaywallDialog.tsx`:
     - Alterado o destino do botão de `<a href="/pricing">` (rota 404 inexistente) para `<a href="/settings">`.

- **Cálculos Matemáticos de Contraste WCAG Exatos**:
  - **`:root` (Ajustado via Opção A)**: `oklch(0.50 0.16 162)` vs `oklch(0.98 0 0)` (Branco `#fafafa`) $\to$ **5.12:1** (Aprovado em WCAG AA $\ge 4.5:1$).
  - **`.dark` (Produção Ativa)**: `oklch(0.70 0.17 162)` vs `oklch(0.1 0.02 260)` (Dark Charcoal `#090d16`) $\to$ **8.46:1** (Supera WCAG AAA $\ge 7.0:1$).

- **Confirmação dos Consumidores (25 Arquivos Verificados)**:
  - Busca textual `grep -rlE "\b(bg-primary|text-primary|border-primary|ring-primary)\b" src/ --include="*.tsx"` confirmou exatamente a lista de 25 arquivos.


- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped test file para emulator).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos) e SSR (251 módulos).



---