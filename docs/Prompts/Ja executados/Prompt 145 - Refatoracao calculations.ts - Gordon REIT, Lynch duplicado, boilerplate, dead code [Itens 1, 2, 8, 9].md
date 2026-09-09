# Prompt para Antigravity — Refatoração `calculations.ts` (PR1: Itens 1, 2, 8, 9)

## Modo de operação

`[EXECUÇÃO]`. Este prompt cobre 4 achados de uma auditoria arquitetural completa (Claude, sessão de revisão com `fuente-architecture-review` + `fuente-solution-architect` + `engineering:code-review` + `engineering:debug`), todos confinados a **um único arquivo**: `src/lib/calculations.ts`, o SSOT financeiro do projeto (Regra 4 do AGENTS.md).

**Um único commit para este prompt inteiro** — os 4 itens são refatorações internas do mesmo arquivo, revisadas em conjunto por serem todas de baixo-a-alto risco financeiro concentrado num só lugar. Formato do commit (Regra de governança):

```
refactor(calculations): unificar Gordon REIT, extrair Lynch, helper unavailable, remover dead code [Itens 1,2,8,9]
```

## Classificação de severidade (Product Manager)

| Item | Severidade | Motivo |
|---|---|---|
| 1 — Gordon duplicado (REIT) | 🔴 Alta | Duas implementações da mesma fórmula podem divergir silenciosamente — risco de preço-teto errado para todo REIT |
| 2 — Lynch duplicado (BR/US) | 🟡 Média | Duplicação exata hoje, risco é de divergência futura, não bug atual |
| 8 — Boilerplate "unavailable" 6x | 🟢 Baixa | Puramente estrutural, zero risco de cálculo |
| 9 — Dead code no fallback | 🟢 Baixa | Código inalcançável, remoção não muda comportamento |

## Contexto

Auditoria linha-a-linha de `calculations.ts` (arquivo inteiro lido) encontrou:

1. `valuateREIT` **não chama** `gordonPrice()` — reimplementa o H-Model inline com sua própria guarda de singularidade (`effectiveK = Math.max(k, g + GORDON_MIN_DISCOUNT_MARGIN)`), enquanto `valuateStockBR`/`valuateStockUS`/`valuateFundoImobiliario` usam a função compartilhada.
2. O bloco de cálculo do Peter Lynch Fair Value (`rawDy`, `effectiveGrowth`, `lynchMultiplier`, `lynch = eps * lynchMultiplier`) está copiado verbatim em `valuateStockBR` e `valuateStockUS`.
3. Os 6 pontos de retorno antecipado "ativo indisponível" (`currentPrice <= 0`) em `valuateStockBR`, `valuateStockUS`, `valuateFundoImobiliario`, `valuateREIT`, `valuateETF` e o branch `FIXED_INCOME` de `getAssetValuation` constroem manualmente o mesmo objeto `ValuationResult` de ~20 campos.
4. O branch "Default fallback for other asset classes" no final de `getAssetValuation` é estruturalmente inalcançável — os 8 `AssetType` existentes (`STOCK_BR, STOCK_US, FII, FII_INFRA, FIAGRO, REIT, ETF, FIXED_INCOME`, confirmados via `CLASS_MARKET_REFERENCE_YIELDS`) já são todos tratados em branches explícitos antes dele.

## Escopo técnico

### Item 9 primeiro (dead code) — fazer antes dos outros 3

Remover o branch de fallback no final de `getAssetValuation`. Trocar a cadeia de `if (type === "...")` por um `switch (type)` com um `default` que lança erro em tempo de compilação via checagem de exaustividade (`const _exhaustive: never = type;`), para que um `AssetType` novo e esquecido no futuro vire **erro de `tsc`**, não fallback silencioso. Este item vai primeiro porque simplifica o arquivo antes das outras 3 mudanças tocarem nele.

### Item 8 — extrair `buildUnavailableResult`

```ts
function buildUnavailableResult(
  ticker: string,
  investorProfile: ValuationResult["investorProfile"],
  extraMethods: Partial<ValuationResult["methods"]> = {},
): ValuationResult {
  return {
    ticker,
    activeCeiling: 0,
    margin: 0,
    fuenteConsensus: null,
    methods: { bazin: null, graham: null, gordon: null, lynch: null, ...extraMethods },
    assumptions: [],
    investorProfile,
    bazin: null,
    graham: null,
    gordon: null,
    lynch: null,
    gordonConfidence: null,
    consensus: null,
    dividendYield: 0,
    positive: true,
    isUnavailable: true,
    yieldTrapWarning: null,
    shareholderYield: null,
  };
}
```
Substituir os 6 objetos literais pelas chamadas correspondentes. **Atenção**: `activeCeiling` hoje varia entre `currentPrice > 0 ? currentPrice : 0` (na maioria) e `0` fixo (no `ETF`) — preservar esse detalhe por caller, não uniformizar sem confirmar comigo antes (ver Pontos de Atenção).

### Item 2 — extrair `calculateLynchFairValue`

```ts
function calculateLynchFairValue(
  eps: number | null | undefined,
  currentPrice: number,
  netAvgDividend: number,
  dividendCagr: number | null | undefined,
): number | null {
  if (eps == null || eps <= 0 || currentPrice <= 0) return null;
  const rawDy = (netAvgDividend / currentPrice) * 100;
  const effectiveGrowth = dividendCagr != null && dividendCagr > 0 ? dividendCagr : 6.0;
  const lynchMultiplier = Math.min(25, Math.max(5, effectiveGrowth + rawDy));
  return eps * lynchMultiplier;
}
```
Substituir os dois blocos idênticos em `valuateStockBR` e `valuateStockUS` pela chamada.

### Item 1 — unificar Gordon do REIT com `gordonPrice()`

Substituir o cálculo inline de `valuateREIT`:
```ts
const effectiveK = Math.max(k, g + GORDON_MIN_DISCOUNT_MARGIN);
const gordon = (netAvgDividend * (1 + g)) / (effectiveK - g);
```
por uma chamada a `gordonPrice(netAvgDividend, k, null, g)` — como `gInitial == null` já cai no branch single-stage existente dentro de `gordonPrice` (`if (gInitial == null) { if (k < GORDON_MIN_DISCOUNT_MARGIN) return null; const price = d0 / k; return price > 0 ? price : null; }`), a chamada precisa que **`k` já venha ajustado para o mesmo piso de segurança** que o REIT aplicava manualmente antes de chamar — ou seja, continuar calculando `effectiveK = Math.max(k, g + GORDON_MIN_DISCOUNT_MARGIN)` no `valuateREIT`, mas passar `effectiveK` como o `k` de `gordonPrice`, e usar `g` no lugar do parâmetro `gTerminal` teria efeito diferente do original (o single-stage de `gordonPrice` faz `d0/k`, não `d0*(1+g)/(k-g)`). **Não simplifique isso sozinho** — ver decisão obrigatória abaixo.

## Pontos de Atenção & Decisões de Arquitetura (obrigatório — Regra 8c)

| Risco | Decisão necessária |
|---|---|
| A fórmula single-stage de `gordonPrice` (`d0/k`) e a fórmula que `valuateREIT` usa hoje (`d0*(1+g)/(k-g)`) **não são matematicamente equivalentes** — a segunda é a perpetuidade de Gordon com crescimento `g`, a primeira assume crescimento zero. Migrar `valuateREIT` para `gordonPrice(netAvgDividend, k, null, g)` sem ajuste **mudaria o preço-teto calculado de todo REIT existente**. | **Bloqueante — não prosseguir sem confirmação explícita de Paulo.** Duas opções técnicas: (A) estender `gordonPrice` para aceitar `gInitial === gTerminal` como um caso válido do H-Model (quando `gInitial = gTerminal = g` e `years` não importa, o H-Model já reduz matematicamente à perpetuidade padrão — **verificar essa equivalência algebricamente antes de assumir**, não supor); (B) manter `valuateREIT` com fórmula própria, mas documentar explicitamente por que ela diverge de `gordonPrice` (ex: REIT não usa H-Model 2-stage, só perpetuidade simples) — nesse caso o item deixa de ser "bug", vira "decisão de design documentada", e o achado da auditoria original é rebaixado de 🔴 para 🟢. **Antigravity: pare neste ponto, rode ambas as fórmulas lado a lado com os mesmos inputs de um REIT real da base (ex: primeiro REIT do Screener), reporte a diferença numérica exata em R$, e aguarde minha decisão antes de tocar em `valuateREIT`.** |
| `activeCeiling` no estado "unavailable" varia entre `currentPrice > 0 ? currentPrice : 0` e `0` fixo (ETF) entre os 6 pontos hoje | Preservar o comportamento por-caller no `buildUnavailableResult` (parâmetro extra), não uniformizar |
| Troca de `if` por `switch` exaustivo no Item 9 pode revelar um `AssetType` não coberto que hoje cai silenciosamente no fallback morto | Se o `tsc` acusar erro após a troca, **parar e reportar**, não "consertar" adicionando um `case` novo sem minha confirmação — pode ser um tipo esquecido intencionalmente ou um bug real |
| Nenhuma mudança de assinatura pública de `getAssetValuation`, `ValuationResult`, ou `AssetValuationParams` — todos os 4 itens são internos ao arquivo | Confirmar com `grep -r "getAssetValuation"` que nenhum consumidor externo quebra |

## Arquivos afetados

- `src/lib/calculations.ts` (único arquivo de produção alterado)
- Testes existentes de `calculations.ts` (se existirem em `src/lib/__tests__/` ou equivalente) — rodar e, se necessário, atualizar expectativas que dependiam do comportamento antigo do REIT (só depois da decisão do item bloqueante acima)

## Proibido

- Prosseguir com o Item 1 (Gordon REIT) sem eu confirmar a opção A ou B acima.
- Alterar qualquer fórmula Bazin/Graham/Gordon além do que está explicitamente descrito aqui.
- Tocar em qualquer arquivo fora de `calculations.ts` e seus testes.
- Reportar "concluído" sem colar o output literal dos 3 gates.

## Governança de roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | ✅ | Gate obrigatório |
| `fuente-solution-architect` | ✅ | Decisão de unificação de fórmula financeira |
| `fuente-investidor-profissional` | ✅ | Validar que a mudança no REIT não altera precificação de forma inesperada |
| `fuente-business-architect` | ❌ | Sem mudança de capacidade/processo |
| `fuente-product-manager` | ✅ | Classificação de severidade acima |
| `fuente-product-marketing` | ❌ | Sem copy/posicionamento |
| `fuente-ux-designer` | ❌ | Sem UI |
| `fuente-investidor-iniciante` | ❌ | Sem onboarding/UI |
| `fuente-advogado-lgpd-gdpr` | ❌ | Sem dado pessoal |

## Gates de verificação final (obrigatórios — colar output literal, nunca parafrasear)

```bash
npx tsc --noEmit
npm run test
npm run build
```

## Mensagem de commit

```
refactor(calculations): unificar Gordon REIT, extrair Lynch, helper unavailable, remover dead code [Itens 1,2,8,9]
```
