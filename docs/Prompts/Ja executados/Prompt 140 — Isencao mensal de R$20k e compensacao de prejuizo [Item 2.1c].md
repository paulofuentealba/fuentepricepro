Prompt 140 — Isencao mensal de R$20k e compensacao de prejuizo [Item 2.1c]

CONTEXTO
Consome RealizedGainEvent[] do Prompt 139 (b5a6d88) — a fundação de ganho
de capital realizado. Este prompt decide, pela primeira vez no produto,
"o usuário deve DARF sobre venda de ações ou não" — é a pergunta mais
sensível de toda a Fase 2. Por isso o escopo é deliberadamente restrito e
DECLARADO por escrito, não implícito.

ESCOPO DECLARADO — leia antes de codar

A legislação real de ganho de capital em ações no Brasil tem exceções que
este prompt NÃO VAI cobrir, e isso precisa ficar visível para o usuário,
não escondido atrás de um cálculo que parece completo:

COBERTO nesta etapa:
- Isenção de R$ 20.000,00 em vendas de AÇÕES no mercado à vista, por mês
  calendário (soma do VALOR DE VENDA de todas as ações no mês, não do
  ganho) — se ultrapassar, o ganho inteiro do mês fica sujeito a imposto,
  não só o excedente.
- Compensação de prejuízo: prejuízo em um mês pode abater ganho de meses
  seguintes, indefinidamente, DENTRO da mesma categoria (ações comuns —
  não misturar com day-trade nem com FII, que têm regras próprias e não
  fazem parte deste prompt).
- Alíquota de 15% sobre o ganho líquido tributável (operações comuns,
  não day-trade).

EXPLICITAMENTE FORA DE ESCOPO nesta etapa — declarar isso na UI futura
(Prompt 141+), não fingir que o cálculo é completo:
- Day-trade (alíquota 20%, sem isenção de R$ 20k, IR retido na fonte de
  1% "dedo-duro") — regra diferente, prompt futuro se houver demanda.
- FII (sem isenção, 20% flat sobre qualquer ganho) — prompt futuro
  dedicado, mencionado no Prompt 139.
- ETF (tratamento varia — alguns seguem regra de ação, outros não) — não
  tratar neste prompt, reportar no plano qual comportamento o código vai
  ter para ETF (bloquear/avisar em vez de calcular errado).
- Ações no exterior (regra de IRPF completamente diferente da de B3) —
  fora de escopo, TaxSimulationPosition/RealizedGainEvent deste módulo
  são para jurisdiction BR.
- Doações, heranças, ganho de capital em imóveis — não se aplica aqui,
  citado só para deixar claro o limite.

Este prompt é greenfield sobre greenfield (nada disso existe hoje,
confirmado por busca ampla antes de escrever este prompt — zero
ocorrências de "20000", "capitalGain" em todo o src/).

TAREFA

1. src/lib/tax/br/monthlyExemption.ts

   Função pura calculateMonthlyCapitalGainsTax(events: RealizedGainEvent[],
   priorLossCarryforward?: number): MonthlyCapitalGainsResult[]

   Para cada mês calendário presente nos eventos (agrupar por
   AAAA-MM a partir de saleDate — usar o MESMO padrão de chave de
   groupRealizedIncomeByMonth em realizedIncome.ts se ele servir de
   referência, sem duplicar a função em si, que é de proventos):

   a. Somar totalSales = soma do proceeds (valor de venda, não o gain)
      de todas as vendas de ação daquele mês.
   b. Somar totalGain = soma do gain de todas as vendas daquele mês
      (pode ser negativo).
   c. Se totalSales <= 20000: mês ISENTO. taxDue = 0, independente do
      gain. O gain do mês (se positivo) NÃO entra na compensação de
      prejuízo de meses futuros — isenção não é prejuízo, é isenção.
   d. Se totalSales > 20000: mês NÃO isento.
      - Se totalGain <= 0: prejuízo do mês, taxDue = 0, e o valor
        absoluto do prejuízo fica disponível para abater ganho de meses
        FUTUROS (carryforward).
      - Se totalGain > 0: abater primeiro o carryforward de prejuízo
        acumulado de meses anteriores (se houver), depois aplicar 15%
        sobre o que sobrar. Se o carryforward for maior que o ganho do
        mês, taxDue = 0 e o carryforward remanescente continua disponível.

2. src/lib/tax/types.ts — adicionar
   export interface MonthlyCapitalGainsResult {
     month: string; // "AAAA-MM"
     totalSales: number;
     totalGain: number;
     isExempt: boolean;
     lossCarryforwardUsed: number;
     lossCarryforwardRemaining: number;
     taxableGain: number;
     taxDue: number; // 15% sobre taxableGain
   }

3. Processar os meses em ordem cronológica, propagando o carryforward de
   prejuízo mês a mês (o resultado de um mês afeta o cálculo do próximo).

REQUISITOS INEGOCIÁVEIS
1. Função PURA. Sem I/O, sem Date.now() (todo mês vem de saleDate dos
   eventos de entrada).
2. NÃO reimplementar o cálculo de gain — consome RealizedGainEvent.gain
   já calculado pelo Prompt 139, não recalcula proceeds/costBasis aqui.
3. A regra do item 1c é a mais fácil de errar por simplificação: isenção
   é sobre o VALOR DE VENDA total do mês, não sobre o ganho. Um mês pode
   ter vendido R$ 15.000 com ganho de R$ 8.000 e estar isento (venda
   abaixo de 20k), mesmo o ganho sendo alto. Testar explicitamente esse
   caso — é o erro mais provável de acontecer por analogia errada com
   "isenção de imposto de renda" genérica.
4. Isenção de um mês NÃO gera prejuízo nem crédito para os próximos meses
   — é estado neutro, não compensável. Testar isso explicitamente (um
   mês isento com prejuízo real não deve alimentar carryforward).
5. Se ETF aparecer nos eventos de entrada, o comportamento decidido na
   investigação do item 3 abaixo deve ser aplicado de forma consistente
   — nunca calcular como se fosse ação comum sem essa decisão explícita.
6. priorLossCarryforward (prejuízo de PERÍODOS ANTERIORES ao primeiro mês
   dos eventos, ex.: anos fiscais anteriores) é parâmetro OPCIONAL de
   entrada — este módulo não é responsável por persistir/rastrear isso
   entre sessões, só por aceitá-lo como dado de entrada quando fornecido.

INVESTIGAR ANTES (Regra 7)
1. Confirmar o padrão de chave de agrupamento mensal usado em
   groupRealizedIncomeByMonth (formato exato da string "AAAA-MM", fuso
   horário considerado ou não) para manter consistência entre os dois
   módulos, mesmo sem reusar a função.
2. RealizedGainEvent (Prompt 139) não carrega assetType nem jurisdiction
   — confirmar como este prompt vai saber que um evento é "ação sujeita a
   esta regra" vs. FII vs. ETF. Se a informação não estiver disponível na
   entrada, propor extensão mínima (ex.: um segundo parâmetro
   assetTypeByTicker: Record<string, AssetType>) — não assumir que tudo
   que chega é ação sem verificação.
3. Decidir e reportar o comportamento para ETF: tratar como ação (mesma
   regra), excluir do cálculo com aviso, ou gerar erro estruturado
   (mesmo padrão de TaxSimulationError do Prompt 138)? Trazer os dois
   lados antes de decidir.
Apresentar plano com essas respostas ANTES de codar (Regra 8).

TESTES OBRIGATÓRIOS
- Mês com vendas totais <= R$ 20.000 e ganho positivo: isento, taxDue=0,
  MESMO com ganho alto relativo à venda (o caso do item 3 dos requisitos)
- Mês com vendas totais <= R$ 20.000 e PREJUÍZO: isento, e esse prejuízo
  NÃO entra no carryforward (testar explicitamente que o próximo mês não
  recebe esse valor)
- Mês com vendas > R$ 20.000 e prejuízo: não isento, taxDue=0, prejuízo
  vai para carryforward
- Mês com vendas > R$ 20.000 e ganho, sem carryforward anterior: 15%
  sobre o ganho total
- Mês com vendas > R$ 20.000 e ganho, COM carryforward suficiente para
  zerar: taxDue=0, carryforward reduzido corretamente
- Mês com vendas > R$ 20.000 e ganho, COM carryforward que só abate
  parcialmente: 15% sobre o restante depois do abatimento
- Sequência de 3+ meses com prejuízo, isenção e ganho intercalados:
  carryforward propagado corretamente mês a mês
- priorLossCarryforward fornecido como entrada: usado corretamente no
  primeiro mês da sequência
- Nenhum evento de entrada: array vazio, sem erro
- Pureza: mesma entrada, mesma saída em 2 execuções

PROIBIDO
- Recalcular gain/proceeds/costBasis — usar RealizedGainEvent como está
- Aplicar a isenção sobre o GANHO em vez do VALOR DE VENDA
- Deixar prejuízo de mês isento vazar para o carryforward
- Implementar regra de day-trade, FII ou ações no exterior neste prompt
- Tratar ETF sem decisão explícita reportada no plano
- I/O dentro de calculateMonthlyCapitalGainsTax

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | é a regra que decide "devo DARF ou não" — máxima exposição regulatória do roadmap até aqui |
| fuente-investidor-profissional | SIM | validação da regra fiscal real, não simplificação por analogia |
| fuente-solution-architect | SIM | propagação de carryforward mês a mês é o ponto de maior risco de bug |
| fuente-architecture-review | SIM | gate contra recalcular gain fora do Prompt 139 |
| fuente-product-manager | SIM | escopo declarado (o que fica de fora) é decisão de produto, não só técnica |
| fuente-investidor-iniciante | SIM | a diferença entre isenção por venda vs. por ganho é o erro mais provável de mal-entendido do usuário também, não só do código |
| fuente-ux-designer | NÃO | sem UI nesta etapa |
| fuente-business-architect | NÃO | capacidade já modelada na Fase 2 |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(tax): isencao mensal de 20k e compensacao de prejuizo para acoes BR [Item 2.1c]

---

Envie o plano com as 3 respostas do "Investigar Antes" antes de codar. A
resposta que mais importa é a da investigação 2 — sem saber diferenciar
ação de FII/ETF nos eventos de entrada, este módulo não pode ser
confiável, porque aplicaria a regra errada silenciosamente para o tipo
errado de ativo.

AVISO PARA A FASE DE UI FUTURA (não é tarefa deste prompt, só registro):
quando isso virar tela, o disclaimer 'tax' (Prompt 132/137) sozinho não
basta — a tela precisa declarar explicitamente o que NÃO está coberto
(day-trade, FII, exterior), para o usuário não presumir cobertura total
onde não há.
