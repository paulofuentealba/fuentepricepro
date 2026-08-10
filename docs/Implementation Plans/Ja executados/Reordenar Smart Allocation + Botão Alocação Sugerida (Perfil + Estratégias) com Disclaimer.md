# Implementation Plan — Reordenar Smart Allocation + Botão "Alocação Sugerida" (Perfil + Estratégias) com Disclaimer Legal

Reordenação da interface de *Smart Allocation* e adição do motor de sugestão de alocação-alvo paramétrica baseado no perfil do investidor (`useInvestorProfile`) e vieses de estratégias combinadas (`StrategyKey`), com aviso legal visível obrigatório e reuso 100% integral dos componentes de recomendação existentes.

---

## Esclarecimento & Tabelas Completas de Vieses por Estratégia

Para garantir total robustez e evitar qualquer `undefined` durante a multiplicação de vetores, todas as 5 estratégias definem de forma **explícita e completa todos os 8 objetos `Record<AssetType, number>`**:

### Tabela Completa de Multiplicadores por Estratégia (8 AssetTypes)

| AssetType | `yield` (Max Yield) | `snowball` (Bola de Nieve) | `defensive` (Defensiva) | `gapFiller` (Preenche Lacunas) | `margin` (Margem Dinâmica)* |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`STOCK_BR`** | 1.0 | 1.2 | 0.8 | 1.0 | $1 + \min(\text{margin}/100, 0.5)$ |
| **`STOCK_US`** | 0.9 | 1.0 | 0.7 | 1.0 | $1 + \min(\text{margin}/100, 0.5)$ |
| **`FII`** | 1.3 | 1.3 | 1.2 | 1.0 | $1 + \min(\text{margin}/100, 0.5)$ |
| **`REIT`** | 1.2 | 1.0 | 0.8 | 1.0 | $1 + \min(\text{margin}/100, 0.5)$ |
| **`ETF`** | 0.8 | 0.9 | 1.1 | 1.0 | $1 + \min(\text{margin}/100, 0.5)$ |
| **`FII_INFRA`** | 1.2 | 1.1 | 1.2 | 1.0 | $1 + \min(\text{margin}/100, 0.5)$ |
| **`FIAGRO`** | 1.3 | 1.1 | 1.0 | 1.0 | $1 + \min(\text{margin}/100, 0.5)$ |
| **`FIXED_INCOME`** | 0.7 | 0.8 | 1.5 | 1.0 | $1 + \min(\text{margin}/100, 0.5)$ |

*\*Nota sobre `margin`: Se o ativo da watchlist possuir margem de segurança média positiva ($\text{margin} > 0$), o multiplicador varia entre 1.0 e 1.5. Caso não existam ativos daquela classe na watchlist ou a margem seja $\le 0$, o multiplicador é exatamente 1.0.*

### Justificativa da Calibração:
- **`yield`**: Eleva FIIs/FIAGROs/FII-Infra/REITs (alto fluxo de proventos) e reduz Renda Fixa e ETFs de acumulação.
- **`snowball`**: Eleva FIIs e Ações BR de pagamento recorrente (maior velocidade de reinvestimento).
- **`defensive`**: Eleva Renda Fixa (1.5x) e FIIs/FII-Infra de menor volatilidade, reduzindo Ações US e REITs.
- **`gapFiller`**: Neutro (1.0x) em nível de classe de ativo, pois atua na distribuição mensal de ativos individuais.

---

## User Review Required

> [!IMPORTANT]
> **Fluxo da Tela Reordenado**:
> 1. **Valor do Aporte (Capital) e Moeda**: No topo da tela.
> 2. **Estratégias & Botão "Alocação Sugerida" + Disclaimer Legal**:
>    - Botão "Alocação Sugerida" que calcula e preenche automaticamente as metas de `TargetAllocationPanel`.
>    - Banner em destaque visível com o aviso legal de isenção de responsabilidade.
> 3. **Painel de Metas de Alocação (`TargetAllocationPanel`)**: Exibe os sliders preenchidos automaticamente com a sugestão, permitindo ajustes manuais subsequentes.
> 4. **Antes e Depois por Classe de Ativo**: Reuso direto do gráfico em barras horizontais ("Before / After").
> 5. **Ativos Sugeridos**: Reuso direto dos `AssetCard` com quantidade de ações, custo e acréscimo de renda.
> 6. **Transformação de Renda Projetada**: Reuso direto do card de transformação de renda da carteira.

---

## Open Questions

Nenhuma pergunta aberta pendente.

---

## Proposed Changes

### Dynamic Calculation Engine (SSOT)

#### [NEW] [`suggestedAllocation.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/suggestedAllocation.ts)
- Função pura `computeSuggestedAllocation(profile, strategies, items): Record<AssetType, number>`.
- Mapeamento paramétrico da base por perfil (`tier`: conservative, moderate, aggressive; `sublabel`: income, growth).
- Aplicação estrita das tabelas completas de multiplicadores para todos os 8 `AssetType`.
- Garantia de que todos os objetos possuem as 8 chaves definidas.
- Normalização e ajuste do resíduo de arredondamento na maior classe para garantir soma exata de 100%.

---

### UI Components & i18n

#### [MODIFY] Dicionários i18n ([`dict.en.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.en.ts), [`dict.ptBR.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.ptBR.ts), [`dict.es.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.es.ts))
- Adicionar chaves em `smartAllocation`:
  - `suggestedAllocationBtn`: `"Alocação Sugerida"`
  - `legalDisclaimer`: `"Esta é uma sugestão baseada no seu perfil e nos dados da sua carteira — não é uma recomendação de investimento. A decisão final é sempre sua."`

#### [MODIFY] [`SmartAllocation.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/SmartAllocation.tsx)
- Reordenar os blocos conforme o novo fluxo da tela.
- Adicionar o botão "Alocação Sugerida" e o aviso legal visível em destaque.

---

### Testes Unitários

#### [NEW] [`suggestedAllocation.test.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/__tests__/suggestedAllocation.test.ts)
- Testar `computeSuggestedAllocation` para múltiplas combinações de perfil, garantindo a presença de todos os 8 `AssetType` e a soma exata de 100%.
- Testar o viés dinâmico do Margin Focus com watchlist mockada.

---

## Verification Plan

### Automated Tests
- Executar os testes unitários do Vitest:
  ```bash
  npm run test
  ```
- Executar o build de produção:
  ```bash
  npm run build
  ```

### Manual Verification
1. Abrir a aba *Smart Allocation*.
2. Inserir um capital de aporte e clicar em **"Alocação Sugerida"**.
3. Verificar o preenchimento automático das metas (soma = 100%), o aviso legal visível e a atualização dos componentes de recomendação.
