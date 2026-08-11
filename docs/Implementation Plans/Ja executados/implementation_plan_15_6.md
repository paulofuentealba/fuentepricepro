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

---

## Ordem Sequencial de Conversão (1 Rota por Vez)

1. **Rota 1: `src/routes/app/riskradar.tsx`** (Radar de Risco) — *Concluído*
2. **Rota 2: `src/routes/app/globalradar.tsx`** (Radar Global de Proventos)
3. **Rota 3: `src/routes/app/screener.tsx`** (Screener & Form de Ativos)
4. **Rota 4: `src/routes/app/smartallocation.tsx`** (Aporte Inteligente)
5. **Rota 5: `src/routes/app/cashflow.tsx`** (Calendário de Fluxo de Caixa)
6. **Rota 6: `src/routes/app/myportfolio.tsx`** (Minha Carteira & FI Progress — Rota principal)

---

## Mapeamento Atualizado de Fallbacks / Skeletons Zero-CLS por Rota (Sem `p-4`)

### 1. `riskradar.tsx` Fallback
```tsx
function RiskRadarSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-2xl bg-muted/30 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl bg-muted/30 animate-pulse" />
        <Skeleton className="h-64 rounded-2xl bg-muted/30 animate-pulse" />
      </div>
    </div>
  );
}
```

### 2. `globalradar.tsx` Fallback
```tsx
function GlobalRadarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48 rounded-lg bg-muted/30 animate-pulse" />
        <Skeleton className="h-10 w-64 rounded-lg bg-muted/30 animate-pulse" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-2xl bg-muted/30 animate-pulse" />
    </div>
  );
}
```

### 3. `screener.tsx` Fallback
```tsx
function ScreenerSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Skeleton className="h-[380px] rounded-2xl bg-muted/30 animate-pulse" />
      <Skeleton className="h-[380px] rounded-2xl bg-muted/30 animate-pulse" />
    </div>
  );
}
```

### 4. `smartallocation.tsx` Fallback
```tsx
function SmartAllocationSkeleton() {
  return (
    <div className="space-y-6 mx-auto max-w-4xl">
      <Skeleton className="h-32 w-full rounded-2xl bg-muted/30 animate-pulse" />
      <Skeleton className="h-[320px] w-full rounded-2xl bg-muted/30 animate-pulse" />
    </div>
  );
}
```

### 5. `cashflow.tsx` Fallback
```tsx
function CashFlowSkeleton() {
  return (
    <div className="space-y-6 mx-auto max-w-4xl">
      <Skeleton className="h-28 w-full rounded-2xl bg-muted/30 animate-pulse" />
      <Skeleton className="h-[380px] w-full rounded-2xl bg-muted/30 animate-pulse" />
    </div>
  );
}
```

### 6. `myportfolio.tsx` Fallback
```tsx
function FIProgressCardSkeleton() {
  return <Skeleton className="h-48 w-full rounded-2xl bg-muted/30 animate-pulse mb-6" />;
}

function WatchlistSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg bg-muted/30 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Skeleton className="h-44 rounded-xl bg-muted/30 animate-pulse" />
        <Skeleton className="h-44 rounded-xl bg-muted/30 animate-pulse" />
        <Skeleton className="h-44 rounded-xl bg-muted/30 animate-pulse" />
      </div>
    </div>
  );
}
```

---

## Verification Plan

### Automated Verification Steps
- Executar `npx tsc --noEmit` após a edição de cada rota e confirmar 0 erros.
- Executar `npm run build` e confirmar a criação de chunks assíncronos dinâmicos gerados pelo Vite (`assets/riskradar-*.js`, `assets/globalradar-*.js`, etc.).
- Executar `npx vitest run` para garantir que 100% da suíte de testes permanece aprovada.

### Manual Verification Steps
- Abrir a rota convertida em conexão throttled (Slow 3G) e confirmar exibição do Shimmer Skeleton sem qualquer sobressalto ou "pulo" de layout visual.
