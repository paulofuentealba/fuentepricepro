# RESULTADO — 101 — Reformular Fluxo do Smart Allocation

## 1. Contexto e Diagnóstico
- **Problema Anterior**:
  - A estratégia `"yield"` (Max Yield) vinha pré-selecionada por padrão.
  - A distribuição percentual de "Target Allocation (%)" exibia valores estáticos persistidos em `settings.smartAllocationTargets` mesmo com o campo de capital vazio, sem recálculo reativo.
  - O disclaimer regulatório ocupava um card amarelo de destaque visual excessivo competindo com os parâmetros de entrada.
  - O botão "Generate allocation" ficava no topo da tela, antes das configurações de estratégia e classe de ativo, e permitia clique sem validação de estratégias.

## 2. Ações Realizadas
1. **Seleção Inicial Vazia e Reset**:
   - `strategies` agora inicializa como array vazio (`[]`), exigindo que o investidor escolha explicitamente 1 ou 2 estratégias.
   - `isDefaultStrategies` e `handleResetStrategies` atualizados para refletir o estado vazio (`[]`).
2. **Cálculo Reativo e Automático de Target Allocation (%)**:
   - `suggestedTargets` é computado dinamicamente via `useMemo` com base em `computeSuggestedAllocation(profile, strategies, valuedItems)` assim que `capital > 0` e ao menos 1 estratégia estiver ativa.
   - Os sliders manuais do `TargetAllocationPanel` continuam editáveis pelo usuário (ajuste fino sobre a sugestão automática).
3. **Disclaimer Regulatório Integrado e Discreto**:
   - Removido o card amarelo chamativo e o botão duplicado de sugestão.
   - O texto regulatório foi movido para o interior do acordeon do painel de Target Allocation com estilo discreto (`text-muted-foreground`, ícone sutil).
4. **Reposicionamento do Botão "Generate Allocation"**:
   - Botão movido para o final da seção de parâmetros (após os acordeons de Alocação e Concentração Máxima, antes dos resultados/gráficos).
   - Validação aprimorada:
     ```tsx
     disabled={!capital || Number(capital) <= 0 || !hasCurrency[currency] || strategies.length === 0 || isGenerating}
     ```
5. **Concentração Máxima (`maxConcentration`)**:
   - Mantida a integração com `computeSmartAllocation`, limitando a alocação por ativo individual conforme configurado pelo usuário.

## 3. Gates de Verificação
- `npx tsc --noEmit`: 0 erros
- `npm test`: 52 arquivos / 351 testes passando
- Commit: `cac9e8d` — `feat(allocation): refactor smart allocation flow with reactive targets and cleaner layout [Prompt 101]`
