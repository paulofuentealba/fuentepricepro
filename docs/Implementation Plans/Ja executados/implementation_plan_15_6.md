# Implementation Plan — Task 15.6: Code Splitting (Lazy Loading com Zero CLS)

**Data:** 10 de Agosto de 2026  
**Auditor/Arquiteto:** `fuente-architecture-review` & `fuente-solution-architect`  
**Escopo:** Code Splitting das 6 rotas principais da aplicação via `React.lazy` + `Suspense` com Skeletons customizados contra CLS (Cumulative Layout Shift).

---

## 9 Regras de Ouro de Governança

Esta atividade atende rigorosamente às **9 Regras de Ouro** do `AGENTS.md`:
1. **Reusabilidade Primeiro (Arquitetura)**
2. **Global i18n Enforcement (Sem Hardcode)**
3. **Isolamento e Segurança de Dados (Database & Mocks)**
4. **Single Source of Truth (SSOT — Dados Financeiros)**
5. **Abordagem "Mobile-First" Sustentável**
6. **Qualidade Visual Premium (Aesthetics)** — *Eliminação de CLS e transição visual suave via Shimmer Skeletons*
7. **AGENTS.md Tem Precedência (Governança)**
8. **Plano de Implementation Obrigatório Antes de Executar** — *Apresentação para aprovação prévia*
9. **Governança de Roles (Skills)**

---

## Esclarecimentos Arquiteturais de Execução

### 1. Posicionamento do `<Suspense>` (Decisão: Opção B)
- **Decisão:** O `<Suspense>` será posicionado **FORA** do wrapper de animação `div.animate-in`.
- **Justificativa:** O Skeleton é exibido imediatamente sem sobressaltos. Quando a rota assíncrona resolve, o contêiner real é montado e dispara a animação `animate-in fade-in-0 slide-in-from-bottom-1 duration-300`, garantindo uma entrada fluida e eliminando qualquer corte seco entre o Skeleton e o conteúdo final. Padronizado para 100% das 6 rotas.

### 2. Estrutura de Lazy Loading em `myportfolio.tsx` (Decisão: Opção A)
- **Decisão:** Criar **dois `React.lazy` e dois `<Suspense>` independentes**: um para `FIProgressCard` e outro para `Watchlist`.
- **Justificativa:** `FIProgressCard` é um componente leve e carrega quase instantaneamente. Manter os dois independentes permite que o resumo de Renda Fixa/FI apareça imediatamente na tela enquanto a `Watchlist` completa o download do chunk e processamento das transações.

### 3. Remoção de `p-4` dos Skeletons (Alinhamento de Padding do Layout Pai)
- **Decisão:** Removido o padding `p-4` de **todas as 6 skeletons**. O layout pai `app.tsx` já aplica padding responsivo (`px-4 py-8 sm:px-6 sm:py-10`) ao redor do `<Outlet/>`. Remover o `p-4` interno previne duplo padding durante o carregamento e elimina qualquer pátio/pulo visual (CLS).

### 4. Animação de Skeleton Única (Sem `animate-pulse` Redundante)
- **Decisão:** Mantida apenas a animação interna `shimmer` do componente base `ui/skeleton.tsx`.

---

## Status Final da Conversão das 6 Rotas

1. **Rota 1: `src/routes/app/riskradar.tsx`** — *Concluído* (Chunk: `RiskRadar-XMLzcdW4.js` | 15.45 kB)
2. **Rota 2: `src/routes/app/globalradar.tsx`** — *Concluído* (Chunk: `DividendRadar-BU46yJAt.js` | 10.16 kB)
3. **Rota 3: `src/routes/app/screener.tsx`** — *Concluído* (Chunk: `AssetForm-BZQcrBRZ.js` | 9.70 kB)
4. **Rota 4: `src/routes/app/smartallocation.tsx`** — *Concluído* (Chunk: `SmartAllocation-B4Llyg9l.js` | 41.96 kB)
5. **Rota 5: `src/routes/app/cashflow.tsx`** — *Concluído* (Chunk: `CashFlowCalendar-gi1lWtGu.js` | 70.73 kB)
6. **Rota 6: `src/routes/app/myportfolio.tsx`** — *Concluído* (Chunks: `FIProgressCard-Do2Xecp4.js` | 12.05 kB e `Watchlist-CfHJNXfA.js` | 109.51 kB)

---

## Verification Plan

### Automated Verification Steps
- Executar `npx tsc --noEmit` após a edição de cada rota e confirmar 0 erros.
- Executar `npm run build` e confirmar a criação de chunks assíncronos dinâmicos gerados pelo Vite.
- Executar `npx vitest run` para garantir que 100% da suíte de testes permanece aprovada.
