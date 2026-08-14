# RESULTADO — 96 — Corrigir copy "média"→"mediana" na Wiki (3 locales) + tooltip de ETF sem consenso em Minha Carteira

## Item A — Copy "média"→"mediana"

### Grep completo (item c do prompt) — todas as ocorrências de "média"/"average"/"promedio" no contexto de Bazin/Graham/Gordon/Consenso, em `src/` inteiro

| Arquivo:linha | Texto encontrado | Correto/Errado | Ação |
|---|---|---|---|
| `dict.ptBR.ts:80` (`tooltips.consensus`) | "Média dos modelos de valuation de Graham, Bazin e Gordon." | ❌ Errado | **Corrigido** → "Mediana..." |
| `dict.ptBR.ts:856` (`docs.consensus.description`) | "Ao extrair a média de Bazin, Graham e Gordon..." | ❌ Errado | **Corrigido** → "Ao extrair a mediana..." |
| `dict.en.ts:78` (`tooltips.consensus`) | "Average of Graham, Bazin and Gordon valuation models." | ❌ Errado — **confirmado que o mesmo erro conceitual existe em EN**, não só em pt-BR | **Corrigido** → "Median of..." |
| `dict.en.ts:849` (`docs.consensus.description`) | "By averaging Bazin, Graham, and Gordon..." | ❌ Errado | **Corrigido** → "By taking the median of..." |
| `dict.es.ts:80` (`tooltips.consensus`) | "Promedio de los modelos de valoración de Graham, Bazin y Gordon." | ❌ Errado — **confirmado que o mesmo erro conceitual existe em ES também** | **Corrigido** → "Mediana de..." |
| `dict.es.ts:856` (`docs.consensus.description`) | "Al promediar Bazin, Graham y Gordon..." | ❌ Errado | **Corrigido** → "Al tomar la mediana de..." |
| `dict.en.ts:844` (`docs.bazinFormula`) | "Ceiling Price = **Average** Dividend (Last Years) / 0.06" | ✅ Correto — falso positivo | Não alterado — o modelo de Bazin genuinamente usa a **média dos dividendos pagos** como input; isso não tem relação com o método de agregação do consenso |
| `dict.es.ts:856` (`docs.bazinFormula`) | "Precio Techo = Dividendo **Promedio** (Últimos Años) / 0.06" | ✅ Correto — falso positivo | Não alterado — mesmo motivo acima |
| `src/routes/guides.dividend-valuation.tsx:58,66` | "average annual dividend" / "average dividend" (explicando a fórmula de Bazin) | ✅ Correto — falso positivo | Não alterado — mesmo motivo acima, é conteúdo de landing page explicando Bazin, não o consenso |

**Exemplo numérico:** confirmado que **não existe** um exemplo numérico do tipo "some os 3 valores e divida por 3" atrelado ao parágrafo do Consenso Fuente em nenhuma das 3 locales — o parágrafo é só descritivo. Nenhuma reescrita de exemplo foi necessária (o risco (c) do prompt não se materializou).

## Item B — Tooltip de ETF sem consenso em Minha Carteira

**Localização:** `src/components/ui/ValuationRadar.tsx:31-40` — quando `consensus === null` (ex: ETFs, onde Bazin/Graham/Gordon não produzem valor), o componente renderizava só o rótulo + `"--"`, sem nenhuma explicação.

**Fix:** reaproveitado o **mesmo padrão de `HoverCard`/`HoverCardTrigger`/`HoverCardContent`** já usado 20 linhas abaixo no mesmo arquivo, para o breakdown do consenso (Regra 1 — primitivo de tooltip já existente no projeto, nenhum novo criado). Novo texto curto: `t.valuation.consensusUnavailableTooltip`, adicionado às 3 locales:
- pt-BR: "Bazin, Graham e Gordon não se aplicam a este tipo de ativo — não há preço-teto a calcular."
- en: "Bazin, Graham and Gordon don't apply to this asset type — there's no ceiling price to calculate."
- es: "Bazin, Graham y Gordon no se aplican a este tipo de activo — no hay precio techo que calcular."

O texto descreve o **comportamento atual** do sistema ("não se aplicam a este tipo de ativo"), sem prometer ou sugerir mudança futura de modelagem — conforme instrução explícita do prompt, não resolve nem antecipa a decisão em aberto do Prompt 90 (se Graham deveria valer para FIIs).

## Gates de Verificação Final — output literal

```
$ npx tsc --noEmit
src/components/horizonte/HorizonteHero.tsx(262,66): error TS2554: ...
src/components/layout/MobileBottomNav.tsx(18,61): error TS2339: ...
```
2 erros pré-existentes, não relacionados (arquivos não tocados nesta rodada). Confirma também que os 3 dicionários seguem estruturalmente idênticos (`satisfies typeof en` não quebrou).

```
$ npm run test
 Test Files  51 passed | 1 skipped (52)
      Tests  349 passed | 12 skipped (361)
```

```
$ npm run build
✓ built in 889ms
```

## Governança de Roles (Regra 9)

Aplicado exatamente como o prompt definiu: `fuente-architecture-review`, `fuente-investidor-iniciante` (tooltip do item B), `fuente-investidor-profissional` (inconsistência copy-vs-cálculo), `fuente-ux-designer` (reuso do padrão de tooltip), `fuente-product-manager`. Não aplicados: `fuente-solution-architect`, `fuente-advogado-lgpd-gdpr`, `fuente-business-architect`, `fuente-product-marketing`.

## Entregável

Commit `fix(content): correct median wording in Fuente Consensus wiki (3 locales) + ETF consensus tooltip [Auditoria UX - Wiki + Minha Carteira]`, push para `dev`.
