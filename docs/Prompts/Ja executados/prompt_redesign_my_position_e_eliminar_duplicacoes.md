# Especificação & Propostas: Redesign da Seção "My Position" e Eliminação de Duplicações

**Data:** 20/08/2026  
**Status:** Aguardando Decisão / Aprovação  
**Arquivos de Impacto:**  
- `src/components/ceiling/watchlist/AssetDetailSheet.tsx`  
- `src/components/ceiling/watchlist/EditPositionFields.tsx`  
- `src/components/ceiling/watchlist/assetCard/AssetCardFinancials.tsx`  
- `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`

---

## 1. Contexto & Problema Identificado

Na tela da aba **"My Position"** do `AssetDetailSheet.tsx`, foram identificadas redundâncias visuais severas:

1. **`Investing Since` (Data de Início) em Duplicidade:**
   - Já é exibido no topo direito de `MY PORTFOLIO` com seletor interativo de data.
   - Aparece novamente como campo de entrada dentro do accordion `Update Holdings`.
2. **Coluna `PREVIEW` 100% Redundante:**
   - Ocupa 50% da largura do formulário apenas para repetir os mesmos cards (*Total Cost*, *Projected Annual Income*, *Yield on Cost*, *Goal Progress*) já visíveis logo acima no painel consolidado `MY PORTFOLIO`.
3. **Inputs de Quantidade e Preço Médio para Usuários com Transações:**
   - Quando o usuário gerencia a carteira via extrato/transações, os campos `Quantity owned` e `Average price` ficam desabilitados ("Calculado a partir de X transações"), ocupando espaço desnecessário.

---

## 2. Visão de Engenharia de Frontend & Experiência do Investidor

- **Hierarquia Visual Ideal:** O investidor precisa de:
  1. **Dashboard de Leitura (Topo):** Quanto tenho, quanto rende, qual meu preço médio e retorno.
  2. **Configuração de Premissas/Metas (Meio):** Qual meu Yield Alvo desejado e qual minha Meta de Renda.
  3. **Histórico Operacional (Base):** Extrato de compras, vendas e proventos onde novos lançamentos são feitos.

---

## 3. Comparativo de Propostas com Protótipos

### 🎨 Proposta 1: Foco em "Metas & Premissas" + Extrato de Transações (Recomendada)

![Proposta 1 - Foco em Metas e Extrato](./assets/proposta_1_metas_e_extrato.jpg)

#### O que muda:
1. O accordion colapsável passa a se chamar **"Metas & Premissas"** (`Asset Goals & Assumptions`).
2. Contém apenas os campos que representam metas e premissas do investidor:
   - **Target Dividend Yield (%)** (calibra o Preço-Teto Ativo).
   - **Meta de Renda Mensal (R$)** (calibra a meta de renda e número de cotas necessárias).
3. **Elimina 100% da coluna `PREVIEW`:** Sem cards repetidos.
4. **Remove `Investing Since` do formulário:** Mantido exclusivamente no cabeçalho de `MY PORTFOLIO`.
5. **Gestão de Posição (Quantidade e Preço Médio):**
   - Para usuários com ledger: gerenciado no painel **"Transações e Extrato"** logo abaixo através do botão `+ Nova Transação`.
   - Para usuários sem ledger (saldo manual rápido): botão/link discreto *"Ajuste manual de saldo"*.

---

### 🎨 Proposta 2: Formulário Unificado Compacto (Sem Sidebar de Preview)

![Proposta 2 - Formulário Compacto](./assets/proposta_2_formulario_compacto.jpg)

#### O que muda:
1. Mantém o accordion **"Atualizar Posição & Metas"**, mas sem a coluna lateral de preview.
2. Layout em grid 2x2 limpo:
   - Coluna 1 (Sua Posição): `Quantidade` e `Preço Médio` (com badge informativo *"Calculado via Extrato"* se houver lançamentos).
   - Coluna 2 (Metas): `Target Yield (%)` e `Meta Mensal (R$)`.
3. **Remove `Investing Since` do formulário.**

---

### 🎨 Proposta 3: Edição Contextual Direta nos Cards ("Click-to-Edit")

![Proposta 3 - Click-to-Edit](./assets/proposta_3_click_to_edit.jpg)

#### O que muda:
1. **Elimina completamente o accordion intermediário.**
2. Clicar no card de **Safety Margin** abre um popover/slider inline para calibrar o Yield Alvo.
3. Clicar na barra de **Meta** abre um popover para editar a Meta Mensal.
4. Clicar no card de **QTY / Preço Médio** abre a edição do saldo manual.
5. O painel de Transações fica posicionado imediatamente abaixo dos cards.

---

## 4. Plano de Execução Técnica

Após a escolha da proposta:
1. Refatorar `src/components/ceiling/watchlist/EditPositionFields.tsx` conforme a estrutura selecionada.
2. Atualizar `src/components/ceiling/watchlist/AssetDetailSheet.tsx` para garantir a integração limpa com `AssetHoldings` e `TransactionsPanel`.
3. Atualizar chaves nos 3 dicionários de internacionalização (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`).
4. Executar os 3 gates de qualidade:
   - `npx tsc --noEmit`
   - `npx vitest run`
   - `npm run build`
