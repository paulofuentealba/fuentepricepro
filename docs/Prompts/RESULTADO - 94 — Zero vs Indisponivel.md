# RESULTADO — 94 — Padronizar exibição de "indisponível" em vez de zero para dado de valuation ausente

## 1. Investigação obrigatória — resultado ANTES do fix (Seção 2 do prompt)

**Camada B confirmada — nenhuma mudança em `calculations.ts` foi necessária.**

Evidência: `getAssetValuation()` (`src/lib/calculations.ts:358-391`) já retorna, junto com `margin: 0` (literal) quando o cálculo não é possível, um flag explícito `isUnavailable: true` **no mesmo objeto de retorno**:

```ts
if (currentPrice <= 0 || avgDividend <= 0) {
  return {
    bazin: null, graham: null, gordon: null, gordonConfidence: null, consensus: null,
    activeCeiling: currentPrice > 0 ? currentPrice : 0,
    margin: 0,
    dividendYield: 0,
    positive: true,
    isUnavailable: true,   // <- já existe, já é exposto
    ...
  };
}
```

Ou seja: a SSOT (Regra 4) **já distingue** "sem dado" de "margem zero real" — o dado não é ambíguo na fonte. A ambiguidade só existia porque `src/components/ceiling/DividendRadar.tsx` (o componente por trás do `/app/globalradar`) ignorava `valuation.isUnavailable` e renderizava `margin`/`ceiling`/`dy` mesmo quando eram os literais de fallback. **Não parei a execução** porque nenhuma linha de `calculations.ts` precisou mudar — a correção é inteiramente na camada de exibição, consumindo um sinal que já existia.

## 2. O que já existia e foi reaproveitado (Regra 1 — sem duplicar)

Antes de criar `formatPercentOrUnavailable` em `src/lib/formatters.ts` (como o prompt sugeria), busquei se já existia equivalente. **Já existia, em forma de componente**, em `src/components/ceiling/shared/AssetDataDisplay.tsx`:

- `PriceTag` — retorna `<span>—</span>` para `value === null || undefined || isNaN(value)`.
- `SafetyMarginBadge` — mesmo padrão para `margin`.
- `YieldIndicator` — mesmo padrão para `value` (DY).

E o padrão de uso `isUnavailable ? null : valorReal` **já é o padrão estabelecido** em outros dois lugares do app:
- `src/components/ceiling/AssetComparator.tsx:242-243` — `ceilingPrice: val.isUnavailable ? null : val.activeCeiling`, `safetyMargin: val.isUnavailable ? null : val.margin`.
- `src/components/ceiling/result/ResultStats.tsx:309,343` — `{!isUnavailable && ceiling > 0 ? <valor real> : <texto "Cálculo indisponível">}`.

**Decisão:** não criei uma função nova (`formatPercentOrUnavailable`) — seria uma segunda forma de fazer a mesma coisa que os 3 componentes acima já fazem (violaria a própria Regra 1 que o prompt pede para respeitar). Apliquei o **mesmo padrão já estabelecido** (`isUnavailable ? null : valor`) no único lugar que faltava: `DividendRadar.tsx`.

## 3. Fix aplicado

`src/components/ceiling/DividendRadar.tsx`:
- Novo campo `isValuationUnavailable: valuation.isUnavailable` no objeto de linha transformado.
- No render: `margin`, `dyValue` e `ceilingValue` passam a ser `null` quando `isValuationUnavailable`, antes de chegar em `SafetyMarginBadge`/`YieldIndicator`/`PriceTag` — que já sabem renderizar "—".
- **`asset.safetyMargin`/`asset.dy` numéricos (0 de fallback) foram mantidos intactos** para o hook `useAssetFilterSort` (usado para contar "Descontados"/"Caros" e para sort) — esse hook tem o tipo `safetyMargin: number` (não nulável) e faz aritmética direta (`b.safetyMargin - a.safetyMargin`, `it.safetyMargin > 0`). Alargar esse tipo para aceitar `null` é uma mudança mais ampla, usada por outras telas, fora do escopo deste prompt — por isso usei um flag paralelo só para a exibição, sem tocar no hook compartilhado.

## 4. Limitação remanescente, declarada (não corrigida nesta rodada)

Como o número (`asset.safetyMargin`) usado pelo filtro/contador continua sendo `0` para ativos com valuation indisponível, esses ativos ainda **contam** no bucket "Caros" (`oppFilter === "over"` usa `safetyMargin <= 0`) do `WatchlistFilterBar`, mesmo não tendo valuation real. É uma ambiguidade menor, remanescente, fora do escopo cirúrgico deste prompt (que era a exibição da célula, não a lógica de contagem/filtro compartilhada) — registrando explicitamente para não parecer que "sumiu" silenciosamente.

## 5. Tabela de telas verificadas (item (a) do prompt)

| Tela | Componente | Já usa `isUnavailable`? | Ação |
|---|---|---|---|
| Radar Global (`/app/globalradar`) | `DividendRadar.tsx` | ❌ Não usava | **Corrigido nesta rodada** |
| Screener (`/app/screener`) | `ResultStats.tsx` | ✅ Já usava (linhas 309, 343) | Nenhuma ação necessária |
| Mesa de Decisão (`/app/comparator`) | `AssetComparator.tsx` | ✅ Já usava (linhas 242-243) | Nenhuma ação necessária |
| Minha Carteira (`/app/myportfolio`) | `AssetCard.tsx` | ✅ Já usava (repassa `valuation.isUnavailable` para `ResultStats`, linha 553) — confirmado também visualmente na Auditoria UX original (ETFs mostravam `--`, não `0%`) | Nenhuma ação necessária |
| Home (`/app`) | `PortfolioTableV2.tsx` | N/A — esta tabela **não exibe margem/preço-teto**, só Posição/Preço Médio/Variação/P&L/DY. A coluna "Variação" já usa `changePct == null ? "—" : ...` (linha 236) — **não é o mesmo bug**; o "—" visto na Auditoria UX era porque a massa de dado DEV não popula cotação em tempo real (`quotes[ticker]?.changePct`), não um bug de zero-vira-indisponível. Isso resolve também a suspeita levantada no Prompt 95 (mesma causa raiz?) — **não é a mesma causa, é dado de mock ausente.** | Nenhuma ação necessária, achado repassado ao Prompt 95 |
| Radar de Risco (`/app/riskradar`) | — | N/A — esta tela não exibe margem/preço-teto/DY, só pesos e status de concentração | Nenhuma ação necessária |

## 6. Gates de Verificação Final — output literal

```
$ npx tsc --noEmit
src/components/horizonte/HorizonteHero.tsx(262,66): error TS2554: ...
src/components/layout/MobileBottomNav.tsx(18,61): error TS2339: ...
```
2 erros pré-existentes, não relacionados (arquivos não tocados nesta rodada).

```
$ npm run test
 Test Files  51 passed | 1 skipped (52)
      Tests  349 passed | 12 skipped (361)
```
(349 = 343 da rodada anterior + 6 novos testes em `AssetDataDisplay.test.tsx`, cobrindo explicitamente: `null`/`undefined`/`NaN` → "—" e `0` genuíno → valor real, para os 3 componentes.)

```
$ npm run build
✓ built in 957ms
```

## 7. Governança de Roles (Regra 9)

Aplicado exatamente como o prompt definiu: `fuente-architecture-review`, `fuente-solution-architect` (decisão de camada A vs. B), `fuente-ux-designer` (densidade/travessão consistente), `fuente-investidor-iniciante`, `fuente-investidor-profissional`. Não aplicados: `fuente-advogado-lgpd-gdpr`, `fuente-business-architect`, `fuente-product-marketing`.

## 8. Entregável

Commit `fix(formatting): show unavailable instead of zero for missing valuation data [Auditoria UX 1.3 + Padrão 3]`, push para `dev`.
