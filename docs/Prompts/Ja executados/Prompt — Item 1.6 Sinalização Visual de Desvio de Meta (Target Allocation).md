### Prompt — Item 1.6: Sinalização Visual de Desvio de Meta (Target Allocation) ✅

- **Objetivo**: Sinalizar visualmente no painel de metas de alocação (`TargetAllocationPanel.tsx`) os desvios entre a alocação atual e a alocação-alvo por classe de ativo que ultrapassam a tolerância configurada (`ALLOCATION_TOLERANCE_PCT = 2` p.p.).
- **Implementação Técnica**:
  - **Funções Puras SSOT (`allocation.ts`)**: Adicionadas as funções puras `calculateAllocationDeviation(currentVal, targetVal)` e `isOutOfTolerance(currentVal, targetVal, tolerance)`. Reaproveitam rigorosamente a constante `ALLOCATION_TOLERANCE_PCT` (2 p.p.) sem duplicação de hardcodes.
  - **Extensão de Componente (`InfoTooltip.tsx`)**: Adicionada a prop opcional `icon?: ReactNode` ao `InfoTooltip`, permitindo passar o ícone `AlertTriangle` com estilizações customizadas.
  - **UI & Sinalização Visual (`TargetAllocationPanel.tsx`)**:
    - Quando o desvio ultrapassa a tolerância (> 2.0 p.p.), renderiza o ícone de alerta `AlertTriangle` no cabeçalho do card da classe.
    - **Sobre-alocado (`currentVal > targetVal`)**: Destaque em tom `amber` (`text-amber-400`), sinalizando alerta de concentração de risco.
    - **Sub-alocado (`currentVal < targetVal`)**: Destaque em tom `blue` (`text-blue-400`), sinalizando oportunidade de aporte.
    - Tooltip explicativo com valor exato do desvio em pontos percentuais (ex: *"3.2 pontos percentuais acima da meta de alocação"*).
    - Preservado o comportamento original (sem alertas) caso `currentAllocationPct` não esteja disponível.
  - **i18n**: Adicionadas chaves `overAllocatedTooltip` e `underAllocatedTooltip` nos dicionários `dict.en.ts`, `dict.ptBR.ts` e `dict.es.ts`.
- **Testes Unitários (`allocation.test.ts`)**:
  - Adicionadas suítes de teste para `calculateAllocationDeviation` e `isOutOfTolerance` cobrindo cenários de sobre-alocação, sub-alocação, limites exatos de tolerância, tolerâncias customizadas e valores nulos/indefinidos.
- **Validação**:
  - `npm run test`: **110/110 testes unitários aprovados** em 17 arquivos de teste.
  - `npm run build`: Compilação Client/SSR 100% limpa.

---