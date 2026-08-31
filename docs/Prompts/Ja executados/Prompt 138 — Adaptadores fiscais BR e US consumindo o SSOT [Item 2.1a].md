Prompt 138 — Adaptadores fiscais BR e US consumindo o SSOT [Item 2.1a]

CONTEXTO
Primeira implementação real de lógica dentro de src/lib/tax/br/ e
src/lib/tax/us/ (fundação criada no Prompt 137, aee9478..próximo).
Referência de tipos: src/lib/tax/types.ts (TaxContext, TaxSimulationPosition,
TaxSimulationResult) — já existe, não recriar.

CORREÇÃO DE ABORDAGEM ANTES DE COMEÇAR — leia isto com atenção

O desenho inicial deste item (documentado no roadmap geral da Fase 2)
sugeria "consolidar" a lógica fiscal espalhada para dentro de
src/lib/tax/. Isso está ERRADO à luz da Regra 4 do projeto: TODA
calculação financeira vive em src/lib/calculations.ts como SSOT único.
netAfterTax, dividendTaxRate, isUsAsset, JCP_TAX_RATE e
US_DIVIDEND_TAX_RATE JÁ SÃO esse SSOT, já exportados, já usados por 17
arquivos diferentes. "Mover" essas funções para src/lib/tax/ quebraria
Regra 4 (duplicaria/relocaria o SSOT) e teria um raio de impacto de 17
arquivos que teriam que atualizar imports — risco alto para ganho zero.

DECISÃO CORRETA, JÁ TOMADA: src/lib/tax/br/ e src/lib/tax/us/ não
reimplementam nem realocam nada. Eles são ADAPTADORES FINOS que CONSOMEM
netAfterTax/dividendTaxRate/isUsAsset de calculations.ts e traduzem o
resultado para o shape de TaxSimulationResult (Prompt 137), pronto para
uso futuro por telas de "Realidade Fiscal". calculations.ts continua
sendo a única fonte de alíquota e regra de cálculo.

Confirmado agora, direto no código (não apenas no relatório da Auditoria
129, que já tem várias fases de distância):
- isUsAsset(type, currency): boolean — já exportada, calculations.ts:116
- US_DIVIDEND_TAX_RATE = 0.3 — já exportada, linha 112
- JCP_TAX_RATE = 0.15 — já exportada, linha 114
- netAfterTax(gross, type, currency, customTaxRate, isJCP) — já exportada
- dividendTaxRate(type, currency, customTaxRate, isJCP) — já exportada

TAREFA

1. src/lib/tax/br/dividends.ts
   Função pura simulateBrDividendTax(positions: TaxSimulationPosition[]):
   TaxSimulationResult
   - Para cada posição BR (dividendo comum ou FII — AMBOS são 0% via
     dividendTaxRate quando isJCP=false e isUsAsset=false, confirmar isso
     é intencional e não precisa de módulo separado para FII nesta etapa),
     usa netAfterTax(grossAmount, type, currency, customTaxRate, isJCP:false)
     para obter netAmount e deriva withheldTax = grossAmount - netAmount.
   - NÃO reimplementa a fórmula — só chama a função do SSOT e empacota
     o resultado no shape de TaxSimulationResult.

2. src/lib/tax/br/jcp.ts
   Função pura simulateBrJcpTax(positions: TaxSimulationPosition[]):
   TaxSimulationResult
   - Mesmo padrão, mas com isJCP: true, usando JCP_TAX_RATE (15%) via a
     mesma netAfterTax do SSOT.

3. src/lib/tax/us/withholding.ts
   Função pura simulateUsWithholdingTax(positions: TaxSimulationPosition[]):
   TaxSimulationResult
   - Mesmo padrão, usando isUsAsset(type, currency) para confirmar a
     posição é elegível e netAfterTax para aplicar os 30%.
   - Se uma posição não for isUsAsset mas estiver marcada jurisdiction:'US'
     no TaxContext, isso é inconsistência de dado de entrada — retornar
     erro estruturado (não lançar exceção, não silenciar), campo a
     definir no plano.

4. src/lib/tax/index.ts — adicionar os 3 exports novos aos já existentes
   (types, br, us).

REQUISITOS INEGOCIÁVEIS
1. As 3 funções são PURAS. Sem I/O, sem Firestore, sem Date.now() (usar
   parâmetro de data se necessário).
2. NENHUMA das 3 reimplementa dividendTaxRate, netAfterTax ou isUsAsset —
   só chamam as funções reais de calculations.ts. O gate de arquitetura
   deste prompt é justamente garantir isso.
3. TaxSimulationResult (Prompt 137) continua sendo o único formato de
   saída — não inventar um segundo formato de retorno.
4. Se uma posição tiver dados insuficientes (gross ausente, tipo
   incompatível com a jurisdição do módulo), reportar isso de forma
   estruturada no resultado (campo já pensado ou a adicionar no plano) —
   nunca silenciar, nunca chutar zero.
5. Os 17 arquivos que hoje usam netAfterTax/dividendTaxRate/isUsAsset
   diretamente NÃO SÃO TOCADOS neste prompt. Nenhum import muda em
   nenhum consumidor existente.

INVESTIGAR ANTES (Regra 7)
1. Confirmar se FII realmente cai no mesmo caminho 0% de dividendo comum
   BR via dividendTaxRate hoje, ou se há alguma distinção de tipo
   (FII vs STOCK_BR) que precise de tratamento diferente no adaptador —
   ler a função completa, não assumir pela leitura anterior.
2. Propor o formato exato do "erro estruturado" para posição com dado
   insuficiente ou jurisdição incompatível — nome de campo, tipo, onde
   entra em TaxSimulationResult (o shape do Prompt 137 não previu isso
   explicitamente; reportar se precisa de extensão pequena do tipo).
3. Confirmar que TaxSimulationPosition (Prompt 137: ticker, type,
   jurisdiction, grossAmount, netAmount, withheldTax, taxRate) já tem
   todos os campos de ENTRADA necessários para os adaptadores, ou se
   falta algo (ex.: customTaxRate opcional do usuário, isJCP como flag
   de entrada em vez de só saída).
Apresentar plano com essas respostas ANTES de codar (Regra 8).

TESTES OBRIGATÓRIOS
- Cada uma das 3 funções: resultado bate exatamente com chamar
  netAfterTax/dividendTaxRate diretamente para o mesmo input (prova de
  não-duplicação — comparar valores calculados, não só formato)
- BR dividendo comum: taxRate efetivo 0%
- BR JCP: taxRate efetivo 15%
- US: taxRate efetivo 30%
- FII: confirmar o comportamento decidido na investigação 1, com teste
  explícito (não deixar implícito)
- posição com dado insuficiente: erro estruturado, sem exceção não
  tratada, sem valor zero silencioso
- as 3 funções são puras: mesma entrada, mesma saída em 2 execuções

PROIBIDO
- Reimplementar qualquer fórmula de imposto já existente em calculations.ts
- Alterar qualquer um dos 17 arquivos consumidores existentes de
  netAfterTax/dividendTaxRate/isUsAsset
- Criar constante de alíquota nova (JCP, US, etc.) — usar as já
  exportadas
- Silenciar posição com dado insuficiente com valor zero
- I/O dentro de qualquer uma das 3 funções

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-solution-architect | SIM | garante o padrão adaptador em vez de realocação do SSOT |
| fuente-architecture-review | SIM | gate central deste prompt — contra duplicação de Regra 4 |
| fuente-investidor-profissional | SIM | precisão do tratamento fiscal por classe de ativo |
| fuente-advogado-lgpd-gdpr | SIM | resultado alimenta futuras telas de simulação tributária |
| fuente-product-manager | SIM | escopo mínimo desta etapa (sem isenção 20k ainda) |
| fuente-ux-designer | NÃO | sem UI nesta etapa |
| fuente-investidor-iniciante | NÃO | sem superfície visível |
| fuente-business-architect | NÃO | capacidade já modelada no Prompt 137 |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(tax): adaptadores BR e US consumindo netAfterTax/dividendTaxRate do SSOT [Item 2.1a]

---

Envie o plano com as 3 respostas do "Investigar Antes" antes de codar. Em
especial quero ver a leitura completa da lógica de FII em dividendTaxRate
— não aceitar "provavelmente 0%" sem confirmação linha a linha.

NOTA PARA DEPOIS: a isenção de R$ 20 mil / ganho de capital e o DARF
continuam greenfield puro (zero código existe hoje) — isso é o próximo
prompt (2.1b), separado deste, porque é regra nova sendo escrita pela
primeira vez, não adaptação de algo que já existe. Não misturar os dois
neste prompt.
