# PROMPT — Correção Pontual: Itens 3 e 4 do Tier 2 (Sweep v3) — Violação Regra 2 (Zero Hardcode)
> Copiar e colar no chat `[EXECUÇÃO]` do Antigravity.

## 🛑 MODO DE OPERAÇÃO
Modo de CORREÇÃO. Os Itens 5, 6 e 7 do Tier 2 já foram aprovados e podem ser commitados separadamente
(ou junto com esta correção, sua escolha de sequência). Os Itens 3 e 4, como implementados, **não
serão aprovados** — funcionam corretamente nos testes, mas violam a Regra 2 (Zero Hardcode) do
AGENTS.md: criaram tabelas de tradução paralelas e hardcoded em vez de consumir o sistema de i18n
real (`useI18n()` + `dict.ptBR.ts`/`dict.en.ts`/`dict.es.ts`). Corrija os dois antes de novo pedido
de aprovação.

## Diagnóstico exato do problema

**Item 3 — `CASHFLOW_CSV_HEADERS` em `src/lib/cashflow.ts`:** é um objeto literal hardcoded dentro
do próprio módulo. As chaves `csvHeaders` que vocês adicionaram em `dict.ptBR.ts`/`dict.en.ts`/
`dict.es.ts` (dentro de `tabs.cashflow.csvHeaders`) **nunca são lidas por nenhum código** — existem
soltas, sem consumidor. Duas fontes de verdade pro mesmo texto, uma delas morta.

**Item 4 — `DURATION_DICT` em `src/lib/formatters.ts`:** tabela de tradução nova, inteiramente
hardcoded dentro do arquivo, sem nenhuma ligação com `dict.*.ts`. Mais grave que o Item 3, porque
nem sequer criou entradas correspondentes no dicionário oficial — é um sistema de i18n paralelo,
específico deste arquivo, que a Regra 2 existe pra proibir.

**Achado que facilita a correção do Item 4:** `dict.ptBR.ts` **já tem** as chaves exatas necessárias
em `common.year`, `common.years`, `common.month`, `common.months`, `common.lessThanOneMonth`,
`common.durationSeparator` — não precisa criar namespace novo, só usar o que já existe (confirme se
`dict.en.ts`/`dict.es.ts` têm as mesmas chaves preenchidas em `common`; se não tiverem, preencha
antes de religar o consumo).

---

## ITEM 3 (correção) — `buildCashFlowCsv` deve consumir `dict.*.ts` via parâmetro

**Arquivo:** `src/lib/cashflow.ts`.

**Plano de correção:**
- Remover o objeto `CASHFLOW_CSV_HEADERS` hardcoded do módulo.
- Alterar `buildCashFlowCsv(data, currency, locale)` para receber os headers como parâmetro
  (ex.: `headers: string[]`) em vez de derivar de uma tabela local — o chamador (o componente que já
  tem acesso a `useI18n()`) passa `t.cashFlow.csvHeaders` (ajuste o caminho exato conforme a chave
  real usada no dicionário — confirme se é `tabs.cashflow.csvHeaders` ou outro namespace antes de
  decidir a assinatura final).
- Investigar qual componente hoje chama `exportCashFlowCsv`/`buildCashFlowCsv` — ele precisa ter
  `useI18n()` no escopo (component React) pra passar os headers reais. Se `exportCashFlowCsv` for
  chamada de um lugar sem acesso ao hook, propague os headers como parâmetro adicional subindo a
  cadeia de chamada, não reintroduza hardcode como atalho.
- Manter `exportCashFlowCsv` como está estruturalmente (função separada de `buildCashFlowCsv`, boa
  decisão de testabilidade que já foi tomada) — só troca a fonte dos headers.
- Atualizar os testes existentes em `cashflow.test.ts` (já cobrem os 3 idiomas) para passar os
  headers vindos do dicionário real (`import { ptBR } from "../i18n/dict.ptBR"` etc.) em vez de
  depender da constante removida — isso também serve como teste de regressão que garante que a
  chave do dicionário realmente existe e está preenchida nos 3 idiomas.

**Risco:** baixo — é só trocar a fonte do dado, a lógica de montagem do CSV continua igual.

---

## ITEM 4 (correção) — `formatMonthsAsYearsMonths` deve consumir `dict.*.ts` via parâmetro

**Arquivo:** `src/lib/formatters.ts`.

**Plano de correção:**
- Remover `DURATION_DICT` hardcoded do módulo.
- Alterar a assinatura para receber as strings de duração como parâmetro (ex.: um objeto
  `{ year, years, month, months, separator, lessThanOneMonth }`) — ou, alternativa mais simples se o
  padrão do projeto preferir, receber o objeto de tradução completo (`t: typeof ptBR`) e ler
  `t.common.year` etc. diretamente. Confirme qual padrão já é usado por outras funções em
  `formatters.ts` que aceitam tradução (se houver precedente, siga-o; se não houver, prefira receber
  só as strings necessárias, não o dicionário inteiro, pra manter a função desacoplada de i18n como
  dependência direta).
- Atualizar o chamador em `HorizonteHero.tsx:264` para passar as strings de `t.common.*` (via
  `useI18n()`, que o componente já usa) em vez de só o `locale`.
- Confirmar se `dict.en.ts` e `dict.es.ts` já têm as chaves `common.year`/`years`/`month`/`months`/
  `lessThanOneMonth`/`durationSeparator` preenchidas (o relatório anterior já mostrou boas traduções
  em EN/ES pra esses termos — reaproveite o texto já validado, não retraduza do zero). Se alguma
  chave estiver faltando em EN/ES, adicione antes de religar o consumo.
- Atualizar os testes existentes em `formatters.test.ts` (já cobrem EN/ES) para passar as strings
  vindas do dicionário real, mesmo racional do Item 3.
- Investigar se `formatMonthsAsYearsMonths` tem outros chamadores além de `HorizonteHero.tsx` antes
  de finalizar a assinatura — se houver mais de um, todos precisam ser atualizados juntos.

**Risco:** baixo-médio — mexe na assinatura de uma função pura; testar contra todos os chamadores
identificados antes de considerar concluído.

---

## Roles Governança (Rule 9)

| Role | Engajado? | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | Gate obrigatório — esta correção nasce de uma violação de regra de arquitetura (Regra 2) identificada na revisão anterior |
| fuente-ux-designer | NÃO | Sem mudança visual, só de fonte de dado |
| fuente-advogado-lgpd-gdpr | NÃO | Sem dado pessoal envolvido |
| Demais roles | NÃO | Correção técnica pontual de conformidade i18n, sem decisão de produto/negócio |

## Gates de Verificação (obrigatórios, output literal)

1. `npx tsc --noEmit`
2. `npm run test`
3. `npm run build`

Traga o diff completo (`git diff src/`) dos Itens 3 e 4 corrigidos, junto com os 3 gates, antes de
eu aprovar. Se quiser, pode commitar os Itens 5, 6 e 7 separadamente antes desta correção chegar —
não há dependência entre eles.
