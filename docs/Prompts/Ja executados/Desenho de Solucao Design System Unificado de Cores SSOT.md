# Desenho de Solução — Design System Unificado de Cores (SSOT)

> [!NOTE]
> Solução arquitetural completa para eliminar colisões e bugs de cores inline via catálogo único de tokens semânticos + gate estático automatizado de testes em `design-tokens.test.ts`.

---

## 1. Resumo Executivo & Diagnóstico

Esta intervenção padronizou a definição de cores em todos os componentes e gráficos da aplicação, eliminando cores estáticas soltas (`oklch(...)`, `hsl(...)` incorretos ou `rgb/rgba/hex` hardcoded).

---

## 2. Catálogo de Tokens Semânticos (`src/styles.css`)

| Token | Formato | Finalidade Semântica | Uso Recomendado |
|---|---|---|---|
| `--success` | oklch | Resultado positivo, ganhos, projeções, "depois" | Métricas de retorno e projeção positiva |
| `--comparison` | oklch | Estado base, "antes", aporte investido, principal | Comparações de estado inicial vs final |
| `--realized` | oklch | Proventos efetivamente pagos/realizados | Histórico de pagamentos efetuados |
| `--warning` | oklch | Alertas neutros, destaques (ex: melhor mês) | Destaques semânticos |
| `--danger` | oklch | Riscos, erros, margem negativa | Alertas de risco |
| `--primary` | oklch | Ações de interface (botões, foco, branding) | Elementos interativos da UI (não dados) |
| `--muted-foreground` | oklch | Textos e eixos secundários | Eixos, labels e legendas |
| `--border` | oklch | Linhas de grade e bordas | Linhas estruturais |
| `--asset-*` | HSL triplo | Classes de ativo (FII, Stock, ETF, etc.) | Exceção válida para `hsl(var(--asset-*))` |

> **Regra de Ouro**: Nenhum componente define cor via `oklch(...)`, `hsl(...)` (fora `--asset-*`), `rgb(...)` ou hex `#rrggbb`. Toda cor faz referência estrita a um token nomeado de `styles.css`.

---

## 3. Gate Estático Automatizado (`src/lib/__tests__/design-tokens.test.ts`)

Foi adicionado um gate de teste estático que executa dentro de `npm run test` (sem necessidade de browser) e realiza as seguintes verificações em 100% dos arquivos `.tsx` de `src/components/` e `src/routes/`:

1. **Extração Automática**: Lê `src/styles.css` e extrai todos os tokens `oklch` definidos.
2. **Validação de Wrapper `hsl()`**: Garante que nenhum token `oklch` seja indevidamente envelopado por `hsl(var(--token))`.
3. **Bloqueio de `oklch()` Hardcoded**: Impede qualquer declaração `oklch(...)` em arquivos `.tsx`.
4. **Bloqueio de `rgb/rgba/hex` em Gráficos**: Garante que componentes de gráfico Recharts não utilizem valores hardcoded em `fill`, `stroke` ou `style`.
5. **Lista de Exceções ZERADA**: A lista de exceções temporárias foi totalmente zerada.

---

## 4. Evidências Literais de Validação

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **154 passed** | 4 skipped (26 arquivos de teste aprovados, incluindo `design-tokens.test.ts`).
3. **`npm run build`**: Client e SSR compilados com sucesso.
