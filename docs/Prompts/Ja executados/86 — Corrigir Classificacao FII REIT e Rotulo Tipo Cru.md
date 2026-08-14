# 86 — Corrigir Classificação FII/REIT (Ordem de Verificação) + Rótulo de Tipo Cru na Tabela

## Bug 1 — FIIs brasileiros classificados como REIT

**Causa raiz confirmada** em `src/lib/api/classify.server.ts`,
`classifyYahoo()`:

```ts
export function classifyYahoo(q: {...}): AssetType {
  const t = (q.quoteType || "").toUpperCase();
  const name = `${q.longname || ""} ${q.shortname || ""}`.toUpperCase();
  if (t === "ETF") return "ETF";
  if (t === "MUTUALFUND") return "ETF";
  if (/REIT|REALTY|REAL ESTATE/.test(name)) return "REIT";  // ← roda ANTES da checagem de ticker BR
  if (q.symbol.endsWith(".SA")) return classifyBr(q.symbol.replace(".SA", ""));
  return "STOCK_US";
}
```

A checagem por palavra-chave em inglês no **nome** do ativo roda antes da
checagem de ticker brasileiro (`.SA`). Fundos brasileiros cujo próprio
nome comercial contém "Reit" ou "Real Estate" (ex: "Fundo De Investimento
Imobiliario **Atrio Reit** Recebiveis Imobiliarios" → ARRI11; "**TRX
Real Estate** Fundo De Investimento..." → TRXF11) disparam o match da
regex por acidente, mesmo sendo FIIs de verdade — `classifyBr()` (que
classificaria corretamente como FII pelo sufixo "11" do ticker) nunca
chega a ser chamado.

Esse bug só afeta ativos resolvidos via Yahoo Finance (fallback quando o
Brapi não cobre o ticker) — `fetchFromBrapi` já chama `classifyBr()`
direto, sem esse problema.

### Correção

Inverter a ordem: checar `.SA` (ticker brasileiro) **primeiro**, e só
aplicar a heurística de nome em inglês pra tickers que não são
brasileiros:

```ts
export function classifyYahoo(q: {...}): AssetType {
  const t = (q.quoteType || "").toUpperCase();
  if (t === "ETF") return "ETF";
  if (t === "MUTUALFUND") return "ETF";
  if (q.symbol.endsWith(".SA")) return classifyBr(q.symbol.replace(".SA", ""));
  const name = `${q.longname || ""} ${q.shortname || ""}`.toUpperCase();
  if (/REIT|REALTY|REAL ESTATE/.test(name)) return "REIT";
  return "STOCK_US";
}
```

**Investigar antes de finalizar**: confirmar que nenhum ativo americano
legítimo depende da ordem antiga (ex: um ETF/REIT US com ticker que,
por acidente, também bateria com `classifyBr()` — improvável dado que
`classifyBr` só reconhece o padrão `[A-Z]{4}\d{1,2}` que não é comum em
tickers US, mas confirmar com teste).

## Bug 2 — Tipo de ativo exibido cru ("STOCK_BR") em vez do rótulo traduzido

**Causa raiz confirmada** em `src/components/horizonte/PortfolioTableV2.tsx`:

```tsx
<span className="..." style={{...}}>
  {item.type}
</span>
```

Renderiza o valor bruto do enum `AssetType` (ex: `"STOCK_BR"`) direto na
tela, sem passar pelo dicionário — viola Regra 2 (i18n obrigatório). **O
rótulo já existe pronto**, não precisa criar nada novo:

```ts
// src/lib/i18n/dict.ptBR.ts (e en/es), já existe:
types: {
  STOCK_US: "Stock", STOCK_BR: "Ação", REIT: "REIT", FII: "FII",
  FII_INFRA: "FII-Infra", FIAGRO: "FIAGRO", ETF: "ETF", FIXED_INCOME: "Renda Fixa",
} as Record<AssetType, string>
```

### Correção

Trocar `{item.type}` por `{t.types[item.type]}` — o componente já importa
`useI18n()`/`t` (usado em outros lugares do mesmo arquivo), só precisa
usar aqui também.

## Regras obrigatórias

- Bug 1: não alterar `classifyBr()` nem o Brapi — só a ordem em
  `classifyYahoo()`.
- Bug 2: não criar chave i18n nova — `t.types` já cobre todos os 8
  valores de `AssetType`.
- Ativos já salvos na carteira do usuário com `type: "REIT"` incorreto
  (gravado antes da correção) **não são corrigidos retroativamente por
  este prompt** — isso exigiria uma migração de dado à parte. Reportar
  essa limitação, não tentar resolver aqui.

## Testes obrigatórios

1. `classifyYahoo` com um objeto sintético reproduzindo ARRI11 (nome
   contendo "Reit", `symbol` terminando em ".SA") → deve retornar `"FII"`,
   não `"REIT"`.
2. `classifyYahoo` com um REIT americano de verdade (ex: nome contendo
   "Realty", símbolo sem ".SA") → continua retornando `"REIT"`
   (regressão).
3. Snapshot/teste de render de `PortfolioTableV2` confirmando que a
   coluna Classe mostra "Ação" pra um item `STOCK_BR`, não a string crua.

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot da tabela confirmando "Ação"/"FII" em vez de
   "STOCK_BR"/"REIT" indevido, pros tickers reais do Paulo (ARRI11,
   TRXF11, BBAS3, BBSE3)

## Ao terminar

Atualizar `docs/SSOT.md`, registrando a limitação de dado retroativo
(ativos já classificados errado precisam de correção manual/migração
futura). Trabalhar em `dev`.
