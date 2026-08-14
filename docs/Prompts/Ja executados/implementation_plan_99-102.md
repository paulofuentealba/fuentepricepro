# Plano de Implementação — Prompts 99, 100, 101 e 102

Seguindo as diretrizes de `AGENTS.md` (Regras 1 a 9) e as 9 skills do projeto, este plano detalha a arquitetura, as alterações e os gates de verificação para a execução dos 4 prompts da pasta `docs/Prompts`.

---

## 1. PROMPT 99 (🔴 CRÍTICO) — Escrita Prematura no Firestore ao Selecionar Ticker

### 1.1 Investigação e Causa Raiz
- Em [`NewContributionDialog.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/horizonte/NewContributionDialog.tsx#L50-L69), o `useEffect` que detecta a seleção de um ativo no campo de busca chamava `upsertWatchlistItem(draft)` na linha 66, antes do preenchimento de quantidade/preço e antes de qualquer clique em "Salvar".
- Se o modal fosse fechado pelo "X" ou clique fora, o estado local era limpo (`reset()`), mas o documento com `quantity: 0` e `averagePrice: null` já havia sido gravado no Firestore.
- Investigação de dependências: `TransactionFormFields` opera puramente via props React (`item={workingItem}`). Nenhuma outra parte do fluxo depende da persistência prematura. No momento do `handleSaveTransaction` (linhas 86-98), a transação é gravada e a posição é calculada e persistida atomicamente com seus dados reais.
- Investigação em componente irmão ([`AddToWatchlistDialog.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/AddToWatchlistDialog.tsx)): O diálogo irmão já opera corretamente chamando `upsert` apenas dentro de `handleSave()` após validação.

### 1.2 Ações Propostas
1. Em `NewContributionDialog.tsx`: remover a chamada `upsertWatchlistItem(draft)` do `useEffect`. Manter `draft` exclusivamente em estado local (`setWorkingItem(draft)`).
2. Criar script de auditoria somente-leitura [`scripts/audit-orphan-watchlist-items.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/scripts/audit-orphan-watchlist-items.ts) para listar eventuais itens órfãos no banco sem efetuar exclusão automática.
3. Criar teste unitário específico cobrindo: seleção de ticker → fechamento sem salvar → nenhuma persistência realizada.

---

## 2. PROMPT 100 — Unificar Menu Mobile (Sidebar + MobileBottomNav → Um Só)

### 2.1 Análise Arquitetural e UX
- Hoje em [`src/routes/app.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/routes/app.tsx), são renderizados simultaneamente `<Sidebar />` (desktop) e `<MobileBottomNav />` (mobile com apenas 5 abas curadas).
- No mobile, o Header possui o botão de menu (hamburger) que abre um Drawer/Sheet lateral.

### 2.2 Ações Propostas
1. Em `src/routes/app.tsx`:
   - Desativar a renderização do `<MobileBottomNav />`.
   - Ajustar o padding inferior de `<main>` (remover `pb-20 md:pb-0` redundante, ficando `pb-6` limpo).
2. Em [`src/components/ceiling/Header.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/Header.tsx):
   - Na variante `"app"` do Drawer lateral mobile, renderizar a **mesma lista completa de 10 itens de navegação** do Sidebar, na mesma ordem:
     1. `home`: `/app/` (Independência Financeira)
     2. `myportfolio`: `/app/myportfolio` (Minha Carteira)
     3. `screener`: `/app/screener` (Calculadora de Preço Teto)
     4. `comparator`: `/app/comparator` (Comparador de Ativos)
     5. `riskradar`: `/app/riskradar` (Radar de Risco)
     6. `globalradar`: `/app/globalradar` (Radar Global)
     7. `cashflow`: `/app/cashflow` (Fluxo de Caixa)
     8. `smartallocation`: `/app/smartallocation` (Alocação Inteligente)
     9. `snowballeffectsimulator`: `/app/snowballeffectsimulator` (Efeito Bola de Neve)
     10. `wiki`: `/app/docs` (Base de Conhecimento)
   - Adicionar indicação visual de rota ativa (`useLocation()`), fechamento automático da Sheet ao clicar em um link, e badges para itens bloqueados/auth.
3. Manter o arquivo `MobileBottomNav.tsx` no repositório (sem importação em `app.tsx`), preservando histórico para limpeza futura.

---

## 3. PROMPT 101 — Reformular Fluxo do Smart Allocation

### 3.1 Respostas às Perguntas de Arquitetura (Regra 8)
1. **Existe hoje função de "estratégia → pesos"?**
   - **Sim!** [`computeSuggestedAllocation()`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/suggestedAllocation.ts#L199-L289) já traduz o perfil do investidor e as estratégias selecionadas em pesos por classe de ativo via `STRATEGY_BIAS_MULTIPLIERS` e `computeMarginBiasMultipliers`, normalizando a soma para exatamente 100%.
2. **Regra de combinação de 2 estratégias selecionadas simultaneamente**:
   - `computeSuggestedAllocation()` já aplica a composição multiplicativa de vieses: `mult = mult_strat1 * mult_strat2`, reponderando as classes de ativos e normalizando para 100%.
3. **Destino de `settings.smartAllocationTargets`**:
   - Mantido como estado customizável pelo usuário. Quando `capital > 0` e uma estratégia é selecionada pela primeira vez ou alterada, os targets são recalculados dinamicamente via `computeSuggestedAllocation()`. O usuário pode continuar ajustando os sliders manualmente se desejar.

### 3.2 Ações Propostas em `SmartAllocation.tsx`
- **2.1 & 2.2**: Estado inicial de `strategies`: `[]` (vazio). `handleResetStrategies` zera para `[]`.
- **2.2.1**: Disclaimer regulatório amarelo deixa de ser um card chamativo e passa a ser um texto informativo discreto (`text-muted-foreground`, ícone sutil) dentro do cabeçalho do acordeon de Target Allocation.
- **2.3**: Mover o botão "Generate Allocation" para o final da seção de configurações (após o acordeon de Alocação Alvo / Concentração Máxima, antes dos resultados).
- **2.3 (Gate)**: Condição `disabled`:
  ```tsx
  disabled={!capital || Number(capital) <= 0 || !hasCurrency[currency] || strategies.length === 0 || isGenerating}
  ```
- **2.4**: Target Allocation recalculado reativamente quando `capital > 0` e estratégias são alteradas, permitindo ajuste fino subsequente.
- **2.5**: `maxConcentration` (`maxConcentrationPerAsset`) já é respeitado em `computeSmartAllocation` e continua integrado.

---

## 4. PROMPT 102 (Discovery) — Parser Dinâmico de Import de Transações (CSV/XLS/XLSX)

### 4.1 Escopo do Documento de Discovery
- **Entregável**: Documento em [`docs/Prompts/RESULTADO - 102 — Discovery Parser Dinamico Import CSV-XLSX.md`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/Prompts/) detalhando:
  1. **Algoritmo de Mapeamento Semântico de Colunas**: Dicionário de sinônimos/aliases por campo, normalização de pontuação/separadores (vírgula vs ponto-e-vírgula), parsing de datas BR/ISO (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`).
  2. **Validação de Ativos Suportados**: Baseada no `AssetType` de `domain.ts` e padrões de tickers suportados (B3 com sufixos 3, 4, 11, 39, 34; US tickers standard). Ativos não suportados (cripto, opções, futuros) entram no log de pendências sem travar a importação.
  3. **Feedback Visual em Tempo Real**: Estrutura de estado para log humanizado linha a linha com resumo quantitativo de sucessos e pendências.
  4. **Encaixe com Prompt 98 Item 3 (Export CSV)**: Recomendação de que o Export Completo (Opção B) gere exatamente o schema semântico rico que o novo parser saberá ler de volta.
  5. **Client-side vs Server-side**: Recomendação de parsing client-side com Web Worker para arquivos de até 10MB/50k linhas, mantendo zero custo de servidor e privacidade total (LGPD).
  6. **Plano de Faseamento**: Divisão sugerida em 3 prompts de execução (Core Engine, UI/Worker, Validações/Testes).

---

## 5. Gates de Verificação e Entrega
- `npx tsc --noEmit`: 0 erros
- `npm run test`: Todos os testes unitários passando
- `npm run build`: Build de produção limpo
- Relatórios individuais gerados para os 4 prompts
- Commit semântico e `git push origin dev`
