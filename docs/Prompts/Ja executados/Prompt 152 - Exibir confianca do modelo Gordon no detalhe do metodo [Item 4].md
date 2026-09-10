# Prompt para Antigravity — Transparência: Exibir Confiança do Gordon no Detalhe do Método (Item 4, continuação)

## Modo de operação

`[EXECUÇÃO]`. Mudança estritamente textual — **nenhuma alteração visual/layout**. Adiciona uma linha de texto ao conteúdo que já existe no tooltip/sheet do método Gordon, usando um dado que já é calculado (`gordonConfidence`) mas nunca chega à tela.

**Um commit:**
```
feat(valuation): exibir confiança do modelo Gordon no detalhe do método [Item 4]
```

## Contexto

`resolveGordonConfidence()` (`src/lib/calculations.ts`) já calcula `"high"` ou `"low"` com base na volatilidade histórica de dividendos (`GORDON_MAX_GROWTH_VOLATILITY = 35%`, decisão confirmada por benchmark — H-Model / Fuller & Hsia 1984, referência Damodaran) e o resultado já está em `ValuationResult.gordonConfidence`. Só que o tipo `ValuationData` (`src/lib/valuationTypes.ts`), que é o que `ConsensusPyramid.tsx` e `ValuationConsensusMatrix.tsx` efetivamente recebem, **não tem esse campo** — então algum componente intermediário descarta o dado ao converter `ValuationResult` → `ValuationData`.

Decisão de UX confirmada com Paulo: **não criar elemento visual novo**. Só adicionar uma linha de texto ao conteúdo que já existe (mesmo padrão de `gordonTooltipSource`/`gordonTooltipGrowth` já usado hoje).

## Escopo técnico

### 1. Achar o ponto de perda do dado (investigação obrigatória primeiro)

Rodar uma busca real por onde `ValuationData` é construído a partir de um `ValuationResult` — provavelmente dentro de `src/components/explore/AssetDeepDiveView.tsx` (candidato mais provável, onde `ConsensusPyramid`/`ValuationConsensusMatrix` são renderizados), procurando o objeto literal que monta `methodDetails: { gordon: { formula, rate, growth, source, date, growthSource } }`. Confirmar o arquivo e linha exatos antes de editar.

### 2. Adicionar o campo ao tipo

Em `src/lib/valuationTypes.ts`, adicionar `gordonConfidence?: "high" | "low" | null;` na interface `ValuationData` (nível raiz, ao lado de `bazin`/`graham`/`gordon`/`consensus` — não dentro de `methodDetails`).

### 3. Propagar o valor no ponto de construção (achado no passo 1)

No mapeamento `ValuationResult` → `ValuationData`, incluir `gordonConfidence: result.gordonConfidence` (o campo já existe em `ValuationResult`, só precisa parar de ser descartado).

### 4. Novas chaves de i18n

Adicionar em `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` (mesmo arquivo/objeto `valuationAssumptions` onde já vivem `gordonTooltipSource`, `gordonTooltipGrowth` etc.):

```ts
// PT-BR
gordonConfidenceHigh: "Confiança do modelo: Alta.",
gordonConfidenceLow: "Confiança do modelo: Baixa — a volatilidade histórica dos dividendos deste ativo está acima do padrão considerado estável, então o crescimento assumido é menos previsível. Metodologia H-Model (Fuller & Hsia, 1984).",

// EN
gordonConfidenceHigh: "Model confidence: High.",
gordonConfidenceLow: "Model confidence: Low — this asset's historical dividend volatility is above the threshold considered stable, so the assumed growth rate is less predictable. Methodology: H-Model (Fuller & Hsia, 1984).",

// ES
gordonConfidenceHigh: "Confianza del modelo: Alta.",
gordonConfidenceLow: "Confianza del modelo: Baja — la volatilidad histórica de dividendos de este activo supera el umbral considerado estable, por lo que la tasa de crecimiento asumida es menos predecible. Metodología: H-Model (Fuller & Hsia, 1984).",
```

### 5. Adicionar a linha no `ConsensusPyramid.tsx`

**Tooltip desktop** (dentro da construção de `gordonTooltip`, mesmo padrão de concatenação já usado):
```ts
const gordonTooltip = valuation.methodDetails?.gordon
  ? `${t.valuationAssumptions.gordonTooltipFormula}. ${t.valuationAssumptions.gordonTooltipRate.replace(...)}. ${t.valuationAssumptions.gordonTooltipGrowth.replace(...)}. ${t.valuationAssumptions.gordonTooltipGrowthSource}. ${t.valuationAssumptions.gordonTooltipSource.replace(...)}. ${valuation.gordonConfidence === "low" ? t.valuationAssumptions.gordonConfidenceLow : valuation.gordonConfidence === "high" ? t.valuationAssumptions.gordonConfidenceHigh : ""}`
  : t.tooltips?.gordon;
```

**Sheet mobile** (dentro do `<MethodDetailSheet methodType="gordon">`, mesmo padrão de `<p>` já usado):
```tsx
{valuation.methodDetails?.gordon && (
  <>
    <p>{t.valuationAssumptions.gordonTooltipRate.replace(...)}</p>
    <p>{t.valuationAssumptions.gordonTooltipGrowth.replace(...)}</p>
    <p className="text-muted-foreground">{t.valuationAssumptions.gordonTooltipGrowthSource}</p>
    <p className="text-muted-foreground">{t.valuationAssumptions.gordonTooltipSource.replace(...)}</p>
    {valuation.gordonConfidence && (
      <p className="text-muted-foreground">
        {valuation.gordonConfidence === "low" ? t.valuationAssumptions.gordonConfidenceLow : t.valuationAssumptions.gordonConfidenceHigh}
      </p>
    )}
  </>
)}
```

### 6. Repetir em `ValuationConsensusMatrix.tsx`

Mesmo tratamento, se esse componente também constrói um tooltip/detalhe de texto para o Gordon (confirmar primeiro lendo o arquivo — ele pode ou não ter a mesma estrutura de tooltip que `ConsensusPyramid`).

## Pontos de Atenção & Decisões de Arquitetura

| Risco | Decisão |
|---|---|
| Se `gordonConfidence` for `null` (Gordon em si é `null` — ativo sem Gordon aplicável), nenhuma linha deve aparecer | Já coberto pela condicional `valuation.gordonConfidence &&` acima — não adicionar fallback de texto genérico |
| Não criar nenhum elemento visual novo (badge, ícone, cor) — só texto dentro do que já existe | Confirmado por Paulo — proibido expandir escopo pra UI nova aqui |
| Se o ponto de construção de `ValuationData` no passo 1 não for `AssetDeepDiveView.tsx`, mas outro arquivo | Reportar o arquivo real encontrado, não assumir — a investigação é o primeiro passo, não um detalhe opcional |

## Proibido

- Criar qualquer componente visual novo (ícone tocável, badge, caixa colorida).
- Mudar posição, cor, ou estrutura de qualquer elemento existente.
- Adicionar a linha de confiança em qualquer lugar fora do tooltip/sheet do Gordon (Bazin/Graham/Lynch não têm esse conceito de confiança — não inventar um pra eles).

## Governança de roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | ✅ | Gate obrigatório |
| `fuente-ux-designer` | ✅ | Confirmou que a mudança é só textual, sem novo elemento visual |
| `fuente-investidor-iniciante` | ✅ | Texto revisado para ser legível sem exigir conhecimento do H-Model |
| `fuente-investidor-profissional` | ✅ | Citação da metodologia (Fuller & Hsia, Damodaran) presente para quem quer rigor |
| Demais 5 roles | ❌ | Sem mudança de arquitetura de dado, negócio, ou LGPD |

## Gates de verificação final (colar output literal)

```bash
npx tsc --noEmit
npm run test
npm run build
```

## Mensagem de commit

```
feat(valuation): exibir confiança do modelo Gordon no detalhe do método [Item 4]
```
