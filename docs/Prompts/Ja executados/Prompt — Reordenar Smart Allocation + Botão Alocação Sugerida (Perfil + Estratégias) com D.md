### Prompt — Reordenar Smart Allocation + Botão "Alocação Sugerida" (Perfil + Estratégias) com Disclaimer Legal ✅

- **Objetivo**: Reordenar a interface de *Smart Allocation* e implementar o motor de sugestão paramétrica de metas de alocação (`computeSuggestedAllocation`) combinando o perfil do investidor (`useInvestorProfile`), estratégias selecionadas (`StrategyKey`) e aviso legal em destaque de não-recomendação de investimento.
- **Implementação Técnica**:
  - **Motor SSOT (`src/lib/suggestedAllocation.ts`)**:
    - Criada a função pura `computeSuggestedAllocation(profile, strategies, items)` que retorna um `Record<AssetType, number>` somando exatamente 100%.
    - Mapeamento paramétrico da base por perfil (`PROFILE_BASE_ALLOCATION`) para os 6 cenários de `tier` (conservative, moderate, aggressive) e `sublabel` (income, growth).
    - Multiplicadores estáticos por estratégia (`STRATEGY_BIAS_MULTIPLIERS`) explicitamente definidos para todas as 8 chaves de `AssetType` (`yield`, `snowball`, `defensive`, `gapFiller`, `margin`).
    - Viés dinâmico para a estratégia `margin` calculado por `computeMarginBiasMultipliers(items)` a partir das margens de segurança dos ativos na watchlist.
    - Normalização e ajuste do resíduo de arredondamento diretamente no maior balde da alocação.
  - **Reordenação do Fluxo da Tela (`SmartAllocation.tsx`)**:
    1. Capital de aporte e seletor de moeda no topo.
    2. Botões de seleção de estratégia + botão **"Alocação Sugerida"** (com ícone `Sparkles`) + banner visível em destaque com o **Aviso Legal Obrigatório** (`legalDisclaimer` nos 3 idiomas).
    3. Painel `TargetAllocationPanel` com os sliders preenchidos automaticamente e editáveis.
    4. Reuso 100% integral dos componentes existentes de resultado (Gráfico *Before / After*, Cards de Ativos Recomendados e Card de Transformação de Renda).
  - **i18n**: Adicionadas as chaves `suggestedAllocationBtn` e `legalDisclaimer` em `dict.en.ts`, `dict.ptBR.ts` e `dict.es.ts`.
- **Testes Unitários (`suggestedAllocation.test.ts`)**:
  - Criada suíte de testes unitários cobrindo perfis conservador/moderado/agressivo, estratégias individuais e combinadas, viés dinâmico de margem de segurança e validação da soma exata de 100%.
- **Validação**:
  - `npm run test`: **118/118 testes unitários aprovados** em 18 arquivos de teste.
  - `npm run build`: Compilação Client/SSR 100% limpa.

---