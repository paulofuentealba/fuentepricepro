# PROMPTS — Fase 2 / Tier 2: i18n & Dívida Técnica (18 Achados em 3 Lotes)
> Copiar e colar cada lote INTEGRALMENTE no chat `[EXECUÇÃO]` do Antigravity, um de cada vez.
> Não avance para o lote seguinte sem autorização explícita após o fechamento do lote anterior.

Base: reconfirmação validada em `dev` (commit `37097ac`, pós-Tier 1/Lote 2). 12 itens CONFIRMADOS,
1 ALTERADO (A.8, parcialmente já resolvido), 5 adicionais mapeados (E.1–E.5).

---
---

# LOTE 1 — i18n: Troca Direta de String por Chave (9 itens, baixo risco)

## 🛑 MODO DE OPERAÇÃO
Plano/diff/gates individuais por item, não misturar commits. 3 gates reais, output literal completo,
sempre. Itens deste lote são substituições diretas (string hardcoded → chave i18n existente ou nova),
sem mudança de lógica de formatação — risco de regressão mínimo, mas ainda assim item por item.

Ordem: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9**.

## ITEM 1 — `useAssetCardDerived.ts:49-56` (A.3): Template de Compartilhamento Social em Inglês Fixo
Mensagem de compartilhamento (`buildAssetShareText`) 100% hardcoded em inglês. Criar chaves
`t.result.shareTemplate*` (ou equivalente) nos 3 dicionários, com placeholders para ticker, preço
teto e YoC, e usar o `locale` já recebido pela função para escolher o template correto.

## ITEM 2 — `AddToWatchlistDialog.tsx:115` (A.4): Texto do Prompt de Login Hardcoded
Mensagem do `openAuthModal` ("Sign in to save this asset...") hardcoded em inglês. Criar chave
dedicada (ex.: `t.watchlist.signInToSave` ou reaproveitar padrão existente de outras chamadas de
`openAuthModal` no projeto, se houver) nos 3 dicionários.

## ITEM 3 — `Header.tsx:136-140` (A.9): Badge de Câmbio USD/BRL sem Formatador Canônico
Substituir `` `USD/BRL R$ ${fx.USDBRL.toFixed(2)}` `` por `formatCurrency(fx.USDBRL, "BRL", locale)`,
mantendo o prefixo "USD/BRL" fora da função de formatação (é um rótulo, não parte do valor).

## ITEM 4 — `CashFlowEmptyState.tsx:12-38` (A.10a): Ternário Binário `isEn` sem Suporte a Espanhol
Substituir os ternários `isEn ? "..." : "..."` por chaves i18n reais nos 3 dicionários
(`t.cashflow.emptyTitle`, `t.cashflow.emptyAddFirstAsset` ou nomes equivalentes já usados no projeto).

## ITEM 5 — `FixedIncomePanel.tsx:24` (A.10b): `" do CDI"` Hardcoded em Português
Substituir a concatenação `` `${item.rate}% do CDI` `` por uma chave i18n com placeholder
(`t.fixedIncome.rateOfCdi` ou equivalente) nos 3 idiomas.

## ITEM 6 — `FIProgressCard.tsx:102, 191` (E.2): Títulos Hardcoded em Português
`"Independência financeira"` e `"Valores consolidados com base na cotação atual."` fora de
`t.fiMode.*`. Criar as chaves faltantes nos 3 dicionários.

## ITEM 7 — `ValuationAssumptionsModal.tsx:151` (E.3): Texto de Auditoria Hardcoded
`"Cálculos sincronizados com bases auditadas (CVM / SEC EDGAR / BACEN SGS)."` fixo em português.
Criar chave dedicada nos 3 dicionários — atenção: nomes de fontes de dados (CVM, SEC EDGAR, BACEN
SGS) não são texto a traduzir, mantenha-os fora de qualquer interpolação que os altere.

## ITEM 8 — `AssetDynamicFaqAccordion.tsx:34, 37` (E.4): Fallbacks em Português no FAQ
`t.assetFaq?.title || "Dúvidas Frequentes"` e subtítulo equivalente. Confirme se `t.assetFaq.title`
e `.subtitle` já existem nos 3 dicionários (podem só estar faltando em 1 ou 2 idiomas, causando o
fallback) antes de decidir se é caso de criar chave nova ou só completar dicionário incompleto.

## ITEM 9 — `TransactionsPanel.tsx:244` (E.5): Fallback de Saldo em Português
`` t.transactions.runningBalance?.replace(...) ?? `Saldo: ${tx.runningBalance} cotas` ``. Mesmo
padrão do Item 8 — investigue se é chave ausente em algum dicionário ou fallback deliberado mal
localizado, antes de corrigir.

## Governança (Regra 9)
Tabela individual por item no relatório de conclusão.

---
---

# LOTE 2 — i18n: Lógica de Formatação e Locale (7 itens, risco médio — aguardar aprovação do Lote 1)

## 🛑 MODO DE OPERAÇÃO
Mesma disciplina do Lote 1. Estes itens exigem mudança de lógica (não só troca de string), então
cada um precisa de plano explícito antes do diff, como nos lotes do Tier 1.

Ordem: **1 → 2 → 3 → 4 → 5 → 6 → 7**.

## ITEM 1 — `FIProgressCard.tsx:31-38` (A.1): Contagem Regressiva Hardcoded em Português
`"ano"/"anos"`, `"mês"/"meses"` e o conectivo `" e "` concatenados diretamente. Isso precisa de
pluralização real via i18n (não só uma chave simples) — investigue se o projeto já tem um padrão de
pluralização estabelecido em algum outro componente (`formatMonthsAsYearsMonths` em `formatters.ts`
já resolve exatamente esse problema em português — confirme se dá pra generalizar essa função para os
3 idiomas em vez de duplicar lógica nova aqui, respeitando Regra 1 de reusabilidade).

## ITEM 2 — `ValuationAssumptionsModal.tsx:124, 132` (A.2): Prefixo `R$` e `.toFixed(2)` Fixos
Valores de `fuenteConsensus` e `activeCeiling` sempre formatados como reais com ponto decimal,
independente do ativo ser USD ou do locale ser en/es. Substituir por
`formatCurrency(valor, asset.currency, locale)` — confirme que o componente tem acesso a
`asset.currency` (ou `item.currency`) no escopo; se não tiver, investigue como propagar sem quebrar
a assinatura do componente.

## ITEM 3 — `MaskedInput.tsx:21-33` (A.5): Locale Espanhol Tratado como Padrão Anglo-Saxão
`isPT = locale === "ptBR"` força `es` a usar separadores de milhar/decimal no padrão inglês (errado
— espanhol usa `.` para milhar e `,` para decimal, igual português). Além disso, o símbolo de moeda
fallback (`isPT ? "R$ " : "$ "`) acopla símbolo ao idioma da interface em vez de à moeda do ativo.
Este é o item mais delicado do lote — trate os dois problemas separadamente:
(a) Corrigir a lógica de separadores para os 3 locales corretamente (`ptBR` e `es`: `.`/`,`; `en`:
`,`/`.`).
(b) Confirmar que todo call-site de `MaskedInput` já passa `currencySymbol` explicitamente (o que
tornaria o fallback acoplado ao idioma irrelevante na prática) — se algum call-site não passa,
avaliar se o fallback deveria vir da moeda do contexto, não do locale da interface.

## ITEM 4 — `GoalPlanner.tsx:106` (A.6): Bug de `.split("{{qty}}")` Retornando String Vazia
Criar chave canônica `t.result.sharesNeededLabel` ("Cotas Necessárias" / "Shares Needed" / "Acciones
Necesarias") nos 3 dicionários e substituir a lógica frágil de `.split()` pela leitura direta dessa
nova chave.

## ITEM 5 — `AssetDataDisplay.tsx:91` (A.7): `margin.toFixed(1)` sem Formatação Locale-Aware
Substituir por `formatNumber(margin, locale, 1)`, seguindo o mesmo padrão já usado por `PriceTag` e
`YieldIndicator` no mesmo arquivo (mencionado no achado original — confirme que esses dois
componentes vizinhos realmente usam `formatNumber`/`formatCurrency` antes de replicar o padrão).

## ITEM 6 — `RiskRadar.tsx:27, 193` (A.8): Fallback em PT + Ticker sem `displayTicker`
Este item está PARCIALMENTE resolvido (enums de tipo já traduzidos via `t.types`). Restam dois
pontos: (a) linha 27, fallback `t.emptyStates?.goToPortfolio || "Ir para a Carteira"` — criar/
confirmar a chave nos 3 idiomas para eliminar a necessidade do fallback; (b) linha 193, ticker cru
sem `displayTicker(a.ticker)` na tabela de concentração — aplicar a função já usada em todo o
resto do projeto para normalizar exibição de ticker.

## ITEM 7 — `DividendHeatmapCard.tsx:23-37, 101` (E.1): Moeda e Meses Hardcoded
Tooltip usa `` `R$ ${amount.toFixed(2)}` `` fixo em reais (deveria respeitar a moeda do ativo/locale
via `formatCurrency`), e `monthsShort` tem fallback manual em português (`["Jan", "Fev", ...]`) em
vez de usar `toIntlLocale(locale)` com `Intl.DateTimeFormat` (mesmo padrão já usado em outros
componentes de calendário do projeto, ex.: `CashFlowCalendar.tsx`).

## Governança (Regra 9)
Tabela individual por item no relatório de conclusão.

---
---

# LOTE 3 — Limpeza de Código Morto (3 itens, baixíssimo risco — aguardar aprovação do Lote 2)

## 🛑 MODO DE OPERAÇÃO
Mesma disciplina. Itens triviais, mas ainda item por item com gates completos — remoção incorreta de
import "não usado" que na verdade é usado indiretamente é um erro real, então não pular a verificação.

Ordem: **1 → 2 → 3**.

## ITEM 1 — `SummaryCard.tsx` (B.1): Arquivo Órfão
Confirmar novamente (imediatamente antes de executar, não confiar na reconfirmação de horas atrás)
que não há nenhum import de `src/components/ceiling/watchlist/SummaryCard.tsx` em nenhum lugar do
projeto, então `git rm` do arquivo.

## ITEM 2 — `CashFlowHeader.tsx:7` (B.2): Tipo `ViewMode` Não Utilizado
Remover a exportação do tipo `ViewMode` — confirmar que nenhum outro arquivo importa esse tipo por
nome antes de remover (o comentário no código já admite que é desuso, mas confirme mesmo assim).

## ITEM 3 — `AssetCard.tsx:1-57` (B.3): Imports Mortos e Fragmentados
(a) Remover `ceilingPrice` e `safetyMargin` do import de `@/lib/calculations` (confirmados sem uso
no corpo do componente). (b) Consolidar os imports fragmentados de `lucide-react` (3 declarações
separadas → 1), `react` (2 declarações → 1), e `@/lib/calculations` (2 declarações → 1) em imports
únicos por módulo — isso é puramente cosmético/organização, não deve mudar nenhum comportamento.

## Governança (Regra 9)
Tabela individual por item no relatório de conclusão.

---

## Lembrete Final (aplicável aos 3 lotes)
Comece pelo Lote 1, Item 1. Itens 8 e 9 do Lote 1 exigem investigação (dicionário incompleto vs.
fallback deliberado) antes de codar. Item 3 do Lote 2 é o mais delicado do pacote inteiro — trate com
o mesmo cuidado que o Item 5 do Tier 1 (mutação de Firestore) recebeu. Ao fechar cada lote, aguarde
autorização explícita antes de iniciar o próximo.
