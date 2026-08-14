# Prompt para Claude Code / Antigravity — 4 Correções de UI/i18n na Home

## 1. Corrigir `formatMonthsAsYearsMonths` — vazamento de português em qualquer locale

`src/lib/formatters.ts`: a função tem "ano"/"anos"/"mês"/"meses"/"menos de 1
mês" hardcoded, sem parâmetro de locale. Adicionar suporte aos 3 idiomas:

```ts
export function formatMonthsAsYearsMonths(months: number, locale: Locale): string
```

- PT-BR: mantém o comportamento atual ("X anos e Y meses", "menos de 1 mês")
- EN: "X years and Y months", "less than 1 month"
- ES: "X años y Y meses", "menos de 1 mes"

Usar chaves i18n nos 3 dicionários em vez de string solta dentro da função
(criar sob `t.common.*` ou seção equivalente já usada por outros
formatters do arquivo — verificar convenção existente antes de decidir
onde). Atualizar todos os callers (`HorizonteHero.tsx` e qualquer outro)
pra passar o `locale` atual (via `useI18n()`).

**Regra 2 é zero-tolerância** — string solta em qualquer idioma dentro de
função de formatação é exatamente o tipo de bug que o catálogo de
tokens/i18n desta sessão existe para evitar.

## 2. Investigar e corrigir elemento "R$ 0,00" vazio no topo do sidebar

Screenshot real (Paulo) mostra uma caixa vazia com "R$ 0,00" no topo do
menu lateral, acima de "My Portfolio" — sem label, sem contexto,
visualmente quebrado.

**Investigar antes de corrigir**: o valor bate exatamente com "Contribution
this month R$ 0,00" que já aparece corretamente no hero — forte suspeita
de um elemento duplicado, mal posicionado via CSS (`position: absolute`
vazando de contexto, z-index, ou portal renderizando no lugar errado).
Abrir DevTools, inspecionar o elemento real na posição indicada, confirmar
a causa antes de remover/corrigir. Reportar a causa raiz encontrada.

## 3. Adicionar aba "Independência Financeira" no sidebar

`src/components/layout/Sidebar.tsx`: hoje não existe nenhum item de
navegação apontando para a home (`/app/`, o dashboard Horizonte) — o
usuário só chega lá via URL direta ou primeiro login. Adicionar como
**primeiro item** da lista `tabs` (antes de "My Portfolio"):

```ts
{ key: "home", path: "/app/", label: t.tabs.financialIndependence, icon: /* escolher ícone condizente, ex: Compass ou TrendingUp já usado em outro lugar do menu — não duplicar ícone já usado por outro item */ }
```

## 4. Renomear "Horizonte FI" → "Independência Financeira" (i18n, não hardcode)

Decisão confirmada por Paulo (validada com as personas
`fuente-investidor-iniciante`/`fuente-investidor-profissional` — "FI" colide
com a abreviação de mercado "Fundo de Investimento", gera confusão real).

- Criar chave `t.tabs.financialIndependence` (reaproveitada também no item
  3 acima, mesmo texto no menu e no hero):
  - PT-BR: "Independência Financeira"
  - EN: "Financial Independence"
  - ES: "Independencia Financiera"
- `HorizonteHero.tsx`: substituir as 2 ocorrências hardcoded de
  `"Horizonte FI"` (linhas ~269 e ~293) por essa chave i18n.
- **Não renomear** nomes de arquivo/componente (`HorizonteHero.tsx`,
  `NewContributionDialog.tsx`, etc.) nem o termo "Horizonte" em
  comentários internos de código — é só o texto visível ao usuário que
  muda.

## 5. Renomear label do menu "Calculator"/"Calculadora" → "Screener"

`src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`: a chave
`tabs.calculator` (hoje "Calculadora"/"Calculator"/"Calculadora") está
mal nomeada desde sempre — a rota é `/app/screener`. Duas opções:
- **A (mais simples)**: só trocar o valor da chave existente
  `tabs.calculator` para "Screener" nos 3 idiomas (termo já usado como
  padrão de indústria, não costuma ser traduzido).
- **B (mais correto a longo prazo)**: renomear a chave em si de
  `calculator` para `screener` em todo o código que a referencia.

Decidir pela opção B se o esforço for baixo (poucos usos da chave),
reportar quantos arquivos referenciam `t.tabs.calculator` antes de
decidir. Não deixar a chave com nome `calculator` e valor "Screener" —
isso é dívida técnica de nomenclatura que confunde o próximo a mexer no
código.

## Regras obrigatórias

- Não alterar nenhuma lógica de cálculo — é só copy/i18n/navegação.
- Testar os 3 idiomas (PT/EN/ES) pros itens 1, 3, 4 e 5.
- Manter `design-tokens.test.ts` passando.

## Verificação obrigatória (evidência real)

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot da home em inglês confirmando "years and months" em vez de
   "anos e meses"
3. Causa raiz real do elemento "R$ 0,00" vazio, com evidência (screenshot
   do DevTools)
4. Screenshot do sidebar com a nova aba "Financial Independence"/
   "Independência Financeira" e o item renomeado "Screener"

## Ao terminar

Atualizar `docs/SSOT.md` (não `PROMPTS_LOG.md`, que foi descontinuado)
com o resumo. Trabalhar em `dev`.
