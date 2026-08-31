# PROMPT — Diagnóstico: Classificação Ausente de FIAGRO / FII_INFRA
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO — SÓ DIAGNÓSTICO NESTA RODADA

**Você não tem permissão para alterar nenhum arquivo de código nesta rodada.**
Nenhum `create_file`, nenhum `str_replace`, nenhum `git commit`. Sua única
entrega é o relatório desta investigação, no formato da Seção 4.

Motivo: já confirmei o bug e a causa raiz por conta própria (ver Seção 1) —
o que falta é decidir **a estratégia de correção**, e isso exige dados que
só existem consultando APIs/fontes reais, não uma decisão de arquitetura
que dá pra tomar de cabeça.

---

## 1. O Que Já Está Confirmado (não reinvestigar isto)

- `src/lib/api/brapi.server.ts` linha 78 chama `classifyBr(clean)` **sem**
  o parâmetro `apiType` — logo, `classifyBr` nunca usa o branch de `apiType`
  (linhas 54-60 de `classify.ts`), sempre cai no fallback heurístico de
  sufixo de ticker.
- O fallback heurístico (`classify.ts` linha 68-73) só sabe devolver `"FII"`
  ou `"STOCK_BR"` para tickers terminados em `11` — **não existe nenhum
  caminho de código, em nenhum arquivo do projeto, que retorne `"FIAGRO"`
  ou `"FII_INFRA"`.** Esses dois tipos existem em `AssetType`
  (`domain.ts:5`) e são consumidos em `calculations.ts`,
  `suggestedAllocation.ts`, `cashflow.ts`, `dividendLabel.ts`,
  `realizedIncome.ts`, `buyAndHoldChecklist.ts` — mas nunca são atribuídos
  por classificação automática.
- Impacto financeiro real, não só de rótulo: `calculations.ts:778-781`
  usa spread de risco diferente por tipo no modelo Bazin — `FII_INFRA` usa
  2.0, `FIAGRO` usa 3.0, e o default (o que todo FIAGRO recebe hoje por
  engano) é 2.5. Todo FIAGRO na plataforma está com preço-teto calculado
  com spread de risco 0.5 p.p. mais baixo do que deveria.
- Caso relatado por Paulo: FGAA11 (FIAGRO real) aparece classificado como
  FII na interface.

---

## 2. O Que Precisa de Investigação Real (não decidir sem checar)

### 2.1. A Brapi expõe o subtipo do fundo em algum campo que não estamos lendo?
- Faça uma chamada real (`fundamental=true`) para pelo menos 5 tickers
  FIAGRO conhecidos (FGAA11, KNCA11, VGIA11, RZAG11, JGPX11 ou equivalentes
  que você confirmar como FIAGRO reais) e 3 FII_INFRA conhecidos (ex:
  KDIF11, JURO11, ou equivalentes).
- Imprima o JSON bruto completo de `res` (a resposta root, não só os campos
  que já mapeamos) para cada um. Procure especificamente por qualquer campo
  que diferencie categoria de fundo — `sector`, `industry`, `fundType`,
  `category`, nome do fundo (`longName`/`shortName` frequentemente contém
  "FIAGRO" ou "Fundo de Investimento nas Cadeias Produtivas Agroindustriais"
  no nome oficial).
- Reporte: existe algum campo textual confiável para diferenciar os 3 tipos
  (FII comum, FII_INFRA, FIAGRO) vindo da própria Brapi? Se sim, qual campo
  e qual o padrão de valor.

### 2.2. A HG Brasil (já paga, já integrada) tem esse dado em algum endpoint?
- A integração atual (`hgBrasil.server.ts`) só chama
  `/v2/finance/dividends` e só extrai campos de evento de dividendo
  (`amount`, `paymentDate`, `approvedDate`, `type` do provento). **Nunca
  inspecionamos o JSON bruto completo da resposta** — pode haver campos
  de categoria/segmento do fundo que hoje são ignorados no parsing.
- Passo 1: para os mesmos 8 tickers de teste (2.1), imprima o
  `firstResult` **bruto e completo** de `/v2/finance/dividends` — não só
  os campos já mapeados — e procure por qualquer campo de categoria/nome
  do fundo.
- Passo 2: a HG Brasil tem outros endpoints no plano pago que este projeto
  já tem chave ativa mas não usa hoje (ex: `/v2/finance/quotations`,
  `/v2/finance/stock_price`, ou similar — consultar documentação oficial
  da HG Brasil). Verifique se algum desses expõe categoria/segmento de
  fundo. Se usar um endpoint novo, reporte o custo de quota adicional
  (a chave já é de plano pago com limite — não estourar sem avisar).
- Reporte: existe campo confiável em algum endpoint HG Brasil já pago? Se
  sim, endpoint + campo + padrão de valor.

### 2.3. A CVM (já integrada no projeto para VPA/LPA/vacância de FII) tem esse dado?
- O projeto já consome CVM via `src/lib/api/cvm.server.ts` — investigue se
  o endpoint usado ou outro endpoint público da CVM (`INF_TRIMESTRAL` ou
  cadastro de fundos) expõe a categoria regulatória do fundo (FII / FI-Agro
  / FI-Infra são categorias regulatórias distintas na CVM, não só nomes de
  mercado).
- Se existir, isso seria a fonte mais confiável (dado regulatório oficial,
  não heurística de nome/ticker) — mas confirme se está dentro do escopo
  de dados que a integração atual já busca ou exigiria nova chamada.

### 2.4. Existe uma lista pública B3 de fundos por categoria (como já fizemos para B3_STOCK_UNIT_PREFIXES)?
- A B3 publica listas de "Fundos Listados" segmentadas por categoria
  (FII / FI-Agro / FI-Infra). Investigue se há um endpoint público ou
  arquivo de referência estável o suficiente para servir de allowlist,
  no mesmo espírito do `B3_STOCK_UNIT_PREFIXES` já existente em
  `classify.ts` — com a mesma ressalva de manutenção periódica documentada
  no comentário do arquivo.
- Se optar por essa rota, estime a ordem de grandeza: quantos FIAGROs e
  quantos FII_INFRA existem hoje listados na B3 (não são ~16 como as Stock
  Units — provavelmente dezenas a centenas, e crescendo). Isso importa para
  decidir se uma lista estática é viável ou se precisa de fonte dinâmica.

---

## 3. Não Decida a Estratégia Sozinho

Depois de levantar 2.1, 2.2, 2.3 e 2.4, **não escolha a solução por conta
própria.** Apresente as opções encontradas com trade-offs (confiabilidade
da fonte, custo de manutenção, latência adicional se exigir nova chamada de
API) para eu e Paulo decidirmos. Isso é decisão de arquitetura de dados —
Regra 7 do `AGENTS.md` (investigar antes de agir) se aplica com força total
aqui.

---

## 4. Formato de Saída Obrigatório

### Seção A — Evidência Bruta
JSON (ou trecho relevante) da resposta real da Brapi para os 8 tickers de
teste, destacando qualquer campo candidato a diferenciador de subtipo.

### Seção B — Resultado da Investigação HG Brasil
JSON bruto do `firstResult` de `/v2/finance/dividends` completo (não só os
campos já mapeados hoje), qualquer campo candidato encontrado, e se
responder 2.2 exigiria endpoint novo além do já usado — com o custo de
quota estimado se for o caso.

### Seção C — Resultado da Investigação CVM
O que existe, o que não existe, endpoint específico se encontrado.

### Seção D — Resultado da Investigação B3 (lista pública)
Existe ou não; se existir, tamanho estimado da lista e estabilidade da
fonte.

### Seção E — Opções de Correção (sem escolher uma)
Tabela: Opção | Fonte de Dado | Confiabilidade | Custo de Manutenção |
Latência Adicional | Cobertura (FIAGRO apenas, FII_INFRA apenas, ambos)

### Seção F — Escopo do Bug Hoje
Quantos ativos atualmente na base de usuários (se der pra estimar via
Firestore, só leitura — Regra 3) estão com `type: "FII"` mas deveriam ser
FIAGRO/FII_INFRA. Se não for viável estimar isso com segurança e sem
escrita, diga isso explicitamente em vez de inventar um número.

---

## 5. Lembrete Final

Isto é diagnóstico, não correção. Nenhum arquivo de código muda nesta
rodada. Volte com as Seções A-E preenchidas e pare aí.
