# Prompt para Antigravity — Varredura Completa de Design System de Cores (Fases B, C & D)

> [!NOTE]
> Documentação técnica da execução das Fases B, C e D da varredura de cores no repositório, incluindo o gate estático automatizado `design-tokens.test.ts` com 0 exceções.

---

## 1. Fase B — Teste de Prevenção Automática (`design-tokens.test.ts`)

Foi implementado o gate estático automatizado em [`src/lib/__tests__/design-tokens.test.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/__tests__/design-tokens.test.ts), que varre 100% dos arquivos `.tsx` em `src/components/` e `src/routes/` durante o `npm run test` e valida:

1. **Extração Automática de Tokens**: Lê `styles.css` e extrai dinamicamente todos os tokens baseados em `oklch(...)` (ignorando os tokens `--asset-*` que usam HSL triplo).
2. **Impede Wrappers Incorretos `hsl()`**: Bloqueia a sintaxe `hsl(var(--token-oklch))` em componentes.
3. **Impede `oklch()` Hardcoded**: Bloqueia cores `oklch(...)` inline fora do `styles.css`.
4. **Impede `rgb/rgba/hex` em Gráficos**: Bloqueia valores brutos de cor em componentes de gráficos Recharts.
5. **Bidirecionalidade de Exceções**: Exige que a lista `KNOWN_EXCEPTIONS` seja mantida limpa — falhando se houver entradas obsoletas. A lista de exceções foi zerada (**0 exceções**).

---

## 2. Fase C — Padronização dos Componentes do Escopo

- **`AssetComparator.tsx`**: Confirmada a semântica de comparação lado a lado de até 3 ativos (sem relação binária antes/depois). Mantidos os seletores semânticos normais de cada `AssetCard`.
- **`TargetAllocationPanel.tsx`**: Aplicadas as regras de desvio visual (`text-warning` para alocação excedente e `text-comparison` para alocação deficitária).
- **`CashFlowChart.tsx`**: Migrada a barra de proventos "Realizados" do valor hardcoded `rgb(16, 185, 129)` para o token semântico `--realized`.
- **`SnowballSimulator.tsx`**: Substituídos wrappers `hsl()` de stroke por `color-mix(in oklab, var(--border) X%, transparent)`.
- **`chartColors.ts`**: Mapeados os tipos de ativos para os tokens de classe `--asset-*` (`hsl(var(--asset-fii))`, `hsl(var(--asset-reit))`, etc.).

---

## 3. Evidências Literais de Validação (Fase D)

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **155 passed** | 4 skipped (26 arquivos de teste aprovados, incluindo `design-tokens.test.ts`).
3. **`npm run build`**: Client e SSR compilados com sucesso.

---

## 4. Registro de Commit

- **Título do Commit**: `test(design-system): implementa Fase B/C/D do Design System de Cores e gate estatico em design-tokens.test.ts`
- **Mensagem no Git**: `test(design-system): implementa Fase B/C/D do Design System de Cores e gate estatico em design-tokens.test.ts`
- **Commit Short SHA**: `663b718`
- **Commit Full SHA**: `663b71887e5eebe59b9a67a0a6d5a15bdc8bebd4`
