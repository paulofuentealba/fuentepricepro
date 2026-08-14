# PROMPT 102 (Discovery) — Parser Dinâmico de Import de Transações (CSV/XLS/XLSX)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

**Este é um prompt de DISCOVERY, seguindo o mesmo modelo dos Prompts
75-77 (PostHog/Stripe/Admin).** Escopo grande, várias decisões de
arquitetura e produto — não implementar nada nesta rodada. Entregável
é um documento de plano, não código. Aplicar TODAS as 9 skills, com
destaque para `fuente-solution-architect`, `fuente-architecture-review`,
`fuente-product-manager`, `fuente-ux-designer`, e
`fuente-investidor-iniciante`/`fuente-investidor-profissional` (o
parser precisa lidar bem tanto com extrato de corretora institucional
quanto com planilha caseira de iniciante).

---

## Contexto e Objetivo (de Paulo)

Hoje o import de transações depende de um template CSV fixo e rígido
(`useWatchlistCsvImport.ts`, 4 colunas exatas: `Ticker, Type, Quantity,
AveragePrice`). Objetivo: parser dinâmico, resiliente a formatos
diferentes (CSV/XLS/XLSX), com identificação semântica de colunas via
heurística, e feedback visual em tempo real.

**Nota de escopo, já identificada em auditoria anterior (Prompt 98,
Item 3, ainda não decidido):** o CSV atual de 4 colunas é usado tanto
para export quanto import (par simétrico usado por
`buildWatchlistCsv`). Esta investigação de import dinâmico e a decisão
pendente do export completo (Opção A/B do Prompt 98) **têm sobreposição
real** — não tratar como projetos totalmente isolados. Este discovery
deve incluir uma recomendação explícita de como as duas iniciativas se
encaixam (o import dinâmico substitui o CSV de 4 colunas? Convive com
ele? O export completo do Item 3 do Prompt 98 deveria gerar um arquivo
no mesmo formato que este parser dinâmico sabe ler de volta?).

## Requisitos Funcionais (especificados por Paulo — usar como
especificação, não como sugestão a ser reinterpretada)

### A. Identificação Dinâmica de Colunas (Smart Parsing)
Reconhecer semanticamente, via aliases/heurística de correspondência
de termos (não exigir nome exato de coluna):
- **Ativo/Ticker**: `Ativo, Papel, Código, Ticker, Descrição, Instrumento`
- **Tipo de Operação**: `Tipo, Operação, C/V, Natureza` — reconhecendo
  `Compra, Venda, C, V, Buy, Sell`
- **Quantidade**: `Quantidade, Qtd, Qtde, Volume`
- **Preço Unitário**: `Preço, Valor, PU, Preço Unitário, Valor Unitário, Cotação`
- **Taxas/Custos** (opcional, default 0): `Taxas, Custos, Corretagem, Emolumentos, ISS, Total Taxas`
- **Data do Negócio**: `Data, Data Pregão, Data Operação, Negociação`

Normalização obrigatória:
- Números BR (`1.000,50`) e internacional (`1,000.50`).
- Separador de CSV `,` e `;`.
- Formatos de data variados (não especificado por Paulo — investigar
  formatos mais comuns nos exports de corretoras BR já suportadas pelo
  projeto, `BrokerNoteUploader.tsx` provavelmente já lida com isso para
  PDF — ver se há normalização de data reaproveitável).

### B. Validação de Ativos Suportados
- Ativos fora do escopo da plataforma (cripto, derivativos, fundos não
  integrados) não devem quebrar o processo — vão para uma lista de
  "ignorados/pendências", processo continua para o resto do arquivo.

### C. Feedback Visual em Tempo Real
- Durante processamento: log/progresso linha a linha, mensagem
  humanizada (ex: *"Importando: compra de 200 ações da BBSE3 do dia
  15/08/2025 com valor unitário de R$ 35,00 cada"*).
- Ao concluir: resumo com total importado com sucesso + lista de
  itens ignorados com motivo (ex: *"Bitcoin: não importado porque o
  ativo ainda não é suportado pela plataforma."*).

## Tarefas de Investigação (antes de desenhar a solução)

1. **Mapear o que já existe** que possa ser reaproveitado (Regra 1):
   - `useWatchlistCsvImport.ts` — parser atual, o que dele sobrevive?
   - `BrokerNoteUploader.tsx` — já faz parsing de nota de corretagem
     (PDF, 14 formatos de corretora BR) — tem heurística de
     reconhecimento de campo que possa informar o design do novo
     parser genérico? Reaproveitar utilitários de normalização de
     número/data se existirem lá.
   - Alguma lib de parsing de planilha já no projeto (`xlsx`/SheetJS,
     `papaparse` — checar `package.json`) vs. precisar adicionar nova
     dependência.
2. **Avaliar viabilidade client-side vs. server-side**: arquivos XLS/
   XLSX podem ser grandes — processar no client (`.tsx`, biblioteca
   tipo SheetJS) trava a UI se não for feito com cuidado (web worker?)
   ou processar via `createServerFn`/Cloud Function é mais robusto mas
   adiciona latência de upload. Recomendar uma abordagem com
   justificativa, considerando que o projeto já tem padrão de
   `.server.ts` para lógica pesada.
3. **Definir a lista de "ativos suportados"** usada para validação
   (item B) — hoje isso vive onde no código? (`AssetType` em
   `domain.ts`? Alguma lista de exchanges/mercados suportados?) —
   mapear antes de desenhar a lógica de "ignorar não suportado".

## Entregáveis Deste Discovery (documento, não código)

1. **Lógica do Parser Dinâmico**: estratégia de mapeamento de colunas
   (algoritmo de matching — exato, fuzzy, distância de edição?),
   normalização de número/data, com pseudocódigo ou diagrama.
2. **Fluxo de Validação**: como estruturar a checagem de ativo
   suportado vs. não suportado, e onde essa lista de referência vive.
3. **Componente de UI & Estado**: proposta de estrutura de
   hooks/estado para exibir progresso linha a linha + modal/resumo
   final — pode reaproveitar algum padrão de progress/toast já
   existente no projeto (Regra 1) antes de propor componente novo.
4. **Recomendação de encaixe com o Prompt 98 Item 3** (export CSV) —
   ver Nota de Escopo acima.
5. **Client-side vs. server-side**: recomendação justificada (tarefa 2).
6. **Estimativa de escopo**: este discovery deve terminar com uma
   visão de quantos prompts de execução separados esse trabalho
   provavelmente vai precisar (parser core, UI de feedback, validação
   de ativos, testes) — não tentar prever tudo em detalhe, só dar a
   Paulo uma noção de tamanho antes dele aprovar a implementação.

## Proibido Nesta Rodada

- Não implementar nenhum parser, componente ou lógica de import real —
  é documento de plano.
- Não adicionar dependência nova (`xlsx`, etc.) ao `package.json` ainda
  — só recomendar, se for o caso, como parte do plano.
- Não decidir sozinho a relação entre este trabalho e a pendência do
  Prompt 98 Item 3 — apresentar a recomendação e esperar confirmação
  de Paulo antes de qualquer prompt de execução ser gerado a partir
  deste discovery.
