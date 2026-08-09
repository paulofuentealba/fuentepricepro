# Prompt para Antigravity — Evolução do Modelo Gordon (2 Estágios + Confiança por Ativo)

> [!NOTE]
> Documentação técnica da evolução do modelo de Gordon Growth para 2 estágios (H-Model) e adição do indicador de volatilidade de proventos (`gordonConfidence`) sem alterar o número de modelos do consenso (mantidos Bazin, Graham e Gordon).

---

## 1. Escopo Implementado

### Parte 1: Modelo Gordon de 2 Estágios (H-Model)
- **Taxa Inicial de Crescimento**: Utiliza o CAGR de 5 anos (`dividendCagr5y`) quando disponível no ativo.
- **Período de Transição ($N$)**: Horizonte fixo de 5 anos (`GORDON_HIGH_GROWTH_YEARS = 5`, meias-vidas $H = 2.5$).
- **Taxa Terminal ($g_{terminal}$)**: Constante nomeada `GORDON_TERMINAL_GROWTH_RATE = 0.03` (3,0%).
- **Trava de Singularidade**: Aplicada sobre a taxa terminal ($k - g_{terminal} \ge \text{GORDON\_MIN\_DISCOUNT\_MARGIN}$, ou seja, $0.02$).
- **Fallback Automático**: Caso o ativo não possua `dividendCagr5y` (como FIIs ou ativos sem histórico), o modelo recua para Gordon de estágio único ($g = 0$) calculando $D_0 / k$.

### Parte 2: Métrica de Confiança por Volatilidade de Proventos (`gordonConfidence`)
- **Cálculo de Volatilidade**: Função `calculateDividendGrowthVolatility` calcula o desvio padrão amostral dos crescimentos ano-a-ano (YoY) do histórico de proventos.
- **Classificação de Confiança**: Se a volatilidade exceder a constante `GORDON_MAX_GROWTH_VOLATILITY = 0.35` (35%), o campo `gordonConfidence` é retornado como `"low"`; caso contrário, `"high"`.
- **Intactitude do Consenso**: A mediana do `Fuente Consensus` permanece calculada sobre os valores válidos de Bazin, Graham e Gordon sem alteração de peso.

---

## 2. Comparativo Numérico Antes vs. Depois em Ativos Reais

### Ativo 1: WEGE3 (Crescimento Regular)
- **Premissas**: $D_0 = \text{R\$ 2,00}$, $k = 10,5\%$, CAGR = $10,0\%$.
- **Antes (Estágio Único com Trava em $g_{initial}$)**: $k - g_{initial} = 10,5\% - 10,0\% = 0,5\% < 2,0\%$ $\rightarrow$ Trava acionada, Gordon retornava `null`.
- **Depois (2 Estágios H-Model)**: $k - g_{terminal} = 10,5\% - 3,0\% = 7,5\% \ge 2,0\%$.
  - Preço Teto Gordon: **R$ 32,13**
  - Confiança: **`"high"`** (crescimento previsível)

### Ativo 2: VALE3 (Crescimento Volátil)
- **Premissas**: $D_0 = \text{R\$ 6,00}$, $k = 10,5\%$, CAGR = $5,0\%$, volatilidade histórico YoY = $85\%$.
- **Antes (Estágio Único)**: $\text{Gordon} = \frac{6,00 \times 1,05}{0,105 - 0,05} =$ **R$ 114,55**
- **Depois (2 Estágios H-Model)**:
  - Preço Teto Gordon: **R$ 86,40**
  - Confiança: **`"low"`** (devido a oscilações cíclicas de proventos)

---

## 3. Constantes Nomeadas e Placeholders Documentados

> [!WARNING]
> **PENDENTE DE VALIDAÇÃO DE MODELAGEM FINANCEIRA - Aguarda confirmação de Paulo**
>
> 1. `export const GORDON_TERMINAL_GROWTH_RATE = 0.03;` // 3,0% taxa terminal de crescimento perpétuo
> 2. `export const GORDON_HIGH_GROWTH_YEARS = 5;` // 5 anos de transição elevada
> 3. `export const GORDON_MAX_GROWTH_VOLATILITY = 0.35;` // 35% limite de volatilidade para confiança "low"

---

## 4. Evidências Literais de Validação

1. **`npx tsc --noEmit`**: **0 erros** (Exit Code 0).
2. **`npm run test`**: **150 passed** | 4 skipped (25 arquivos de teste aprovados, incluindo regressão KNCR11, volatilidade de crescimento e fallback).
3. **`npm run build`**: Client (4097 módulos em 21.83s) e SSR (251 módulos em 1.23s) compilados com sucesso.

---

## 5. Registro de Commit

- **Título do Commit (gerado via título do prompt)**: `Prompt para Antigravity — Evolução do Modelo Gordon (2 Estágios + Confiança por Ativo)`
- **Mensagem no Git**: `feat(valuation): evolui modelo Gordon para 2 estagios e adiciona metrica de confianca [Parte 1+2]`
