Prompt 141 — Ganho de capital em venda de FII, 20% flat sem isencao [Item 2.1d]

CONTEXTO
Completa o pipeline de cálculo fiscal da Fase 2 (dividendo BR/JCP/US no
138, ganho realizado no 139, isenção/compensação de ações no 140). Este é
o último item de CÁLCULO puro antes da primeira tela de "Realidade
Fiscal" — depois deste prompt, a Fase 2 passa a ter todo o motor pronto
para consumo por UI.

Consome RealizedGainEvent[] do Prompt 139, com assetType já disponível
desde a extensão feita no Prompt 140 (event.assetType ou
assetTypeByTicker) — mesmo padrão de resolução, não reinventar.

REGRA DECLARADA — a mais simples de todo o módulo fiscal, mas com um
limite que precisa ficar explícito

Venda de FII negociado em bolsa por pessoa física:
- Tributação de 20% sobre o ganho de capital, SEM isenção de valor de
  venda (diferente de ações — aqui não existe teto de R$ 20 mil).
- SEM compensação com prejuízo de ações (são categorias diferentes na
  legislação — prejuízo de FII só compensa ganho de FII, não de ação, e
  vice-versa).
- Prejuízo de FII PODE ser compensado com ganho de FII em meses futuros
  (mesmo princípio de carryforward do Prompt 140, mas numa trilha
  separada, nunca somada à de ações).

LIMITE A DECLARAR, NÃO IMPLEMENTAR — confirmado por busca ampla antes
deste prompt: não existe hoje, em lugar nenhum do código, distinção entre
FII negociado em bolsa com mais de 50 cotistas/sem concentração (regra
padrão, tratada aqui) e a exceção legal de fundos fechados/concentrados
que perdem benefícios. Isso é uma simplificação PRÉ-EXISTENTE do produto
(já vale para a regra de rendimento do Prompt 138, que também não trata
esse caso) — este prompt herda a mesma simplificação por consistência,
não introduz uma nova. Marcar isso no código com o mesmo padrão de
"REGRA PENDENTE DE REVISAO JURIDICA" já usado para ETF no Prompt 140.

TAREFA

1. src/lib/tax/br/fiiCapitalGains.ts

   Função pura calculateFiiCapitalGainsTax(events: RealizedGainEvent[],
   priorLossCarryforward?: number, assetTypeByTicker?: ...):
   MonthlyFiiCapitalGainsResult[]

   Mesmo padrão de agrupamento mensal do Prompt 140 (chave "AAAA-MM" via
   getLocalDateISOString), MAS:
   - Filtra SÓ eventos com assetType === "FII" (não FIAGRO, não
     FII_INFRA — investigar se essas duas têm a mesma regra de FII
     comum ou regra própria antes de incluir ou excluir, não assumir).
   - NÃO existe verificação de teto de R$ 20k — todo mês com ganho é
     potencialmente tributável, independente do volume vendido.
   - Prejuízo de mês vira carryforward SEMPRE (não existe "mês isento"
     nesta regra — reler o requisito acima, é diferente de ações de
     propósito).
   - Ganho tributável = ganho do mês - carryforward disponível (mesma
     mecânica de abatimento do Prompt 140).
   - taxDue = taxableGain * 0.20 (20%, não 15%).

2. src/lib/tax/types.ts — adicionar
   export interface MonthlyFiiCapitalGainsResult {
     month: string;
     totalSales: number;
     totalGain: number;
     lossCarryforwardUsed: number;
     lossCarryforwardRemaining: number;
     taxableGain: number;
     taxDue: number; // 20% sobre taxableGain
     unclassifiedTickers?: string[];
   }
   (sem campo isExempt — não existe isenção nesta regra; se o plano achar
   melhor manter o campo por consistência de shape com
   MonthlyCapitalGainsResult sempre false, reportar o trade-off antes de
   decidir)

3. Reusar a MESMA função de resolução de assetType do Prompt 140
   (getEventAssetType, se estiver exportada; se não estiver, investigar
   antes de duplicar) — não escrever uma segunda versão da mesma lógica
   de fallback.

REQUISITOS INEGOCIÁVEIS
1. Função PURA. Mesmo padrão de todo o módulo fiscal até aqui.
2. NÃO reimplementar o cálculo de gain — consome RealizedGainEvent.gain
   já calculado (Prompt 139).
3. Ticker sem assetType resolvível: MESMO comportamento corrigido no
   Prompt 140 — excluído do cálculo, reportado em unclassifiedTickers,
   NUNCA assumido como FII por padrão silenciosamente.
4. O carryforward de FII é uma trilha COMPLETAMENTE SEPARADA da de ações
   — nunca somar, nunca misturar. Se o chamador passar
   priorLossCarryforward, esse valor é especificamente de FII, não
   compartilhado com calculateMonthlyCapitalGainsTax.
5. Alíquota fixa 20% como constante nomeada exportada
   (BR_FII_CAPITAL_GAINS_RATE = 0.20), não número mágico inline.
6. Marcação de revisão jurídica pendente sobre a exceção de
   fundo-fechado/concentração, no código, mesmo padrão do Prompt 140.

INVESTIGAR ANTES (Regra 7)
1. FIAGRO e FII_INFRA seguem a mesma regra de venda de FII comum (20%
   flat sem isenção) ou têm regra própria? Não assumir — se a legislação
   ou o próprio código não permitir confirmar com segurança, tratar como
   FORA de escopo deste prompt (excluir do filtro, reportar como
   unclassified) em vez de aplicar a regra de FII por analogia sem
   certeza.
2. Confirmar se getEventAssetType (ou equivalente) do Prompt 140 está
   exportado e reusável, ou se é função privada do módulo
   monthlyExemption.ts — se privada, propor onde ela deveria morar para
   ser compartilhada pelos dois módulos sem duplicação (ex.: mover para
   um arquivo utilitário comum em src/lib/tax/).
3. Confirmar novamente, por busca própria no código atual (não só
   confiar na resposta do Prompt 140), que não há qualquer tratamento de
   fundo fechado/50 cotistas em nenhum lugar do produto — para o
   comentário de limite declarado ser preciso.
Apresentar plano com essas respostas ANTES de codar (Regra 8).

TESTES OBRIGATÓRIOS
- Mês com venda de FII e ganho, sem carryforward: 20% sobre o ganho
  total, SEM checagem de teto de valor (testar explicitamente com venda
  de valor baixo E ganho positivo — deve tributar mesmo assim, ao
  contrário do comportamento de ações)
- Mês com prejuízo de FII: vira carryforward, taxDue=0
- Mês com ganho de FII e carryforward de FII disponível: abate primeiro,
  tributa o resto a 20%
- Sequência de meses intercalados (prejuízo → ganho → ganho): carryforward
  de FII propagado corretamente
- Ganho de FII NÃO é afetado por carryforward de AÇÕES e vice-versa —
  teste cruzado explícito chamando as duas funções (calculateFiiCapitalGainsTax
  e calculateMonthlyCapitalGainsTax) com os mesmos eventos brutos e
  confirmando que cada uma só processa seu próprio tipo de ativo
- Ticker sem assetType resolvível: excluído, reportado em
  unclassifiedTickers, não contamina o cálculo (mesmo padrão de teste do
  Prompt 140, adaptado)
- Array vazio: resultado vazio, sem erro
- Pureza: mesma entrada, mesma saída em 2 execuções

PROIBIDO
- Aplicar isenção de R$ 20 mil à venda de FII (essa regra é exclusiva de
  ação, não existe para FII)
- Misturar carryforward de FII com o de ações
- Assumir tratamento de FIAGRO/FII_INFRA sem confirmação — se incerto,
  excluir e reportar, não aplicar por analogia
- Assumir ticker sem tipo como FII por padrão
- Número mágico 0.20 inline sem constante nomeada
- I/O dentro de calculateFiiCapitalGainsTax

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | regra tributária real, mesmo padrão de exigência do 140 |
| fuente-investidor-profissional | SIM | precisão da regra de FII, distinta da de ações |
| fuente-solution-architect | SIM | decide reuso de getEventAssetType entre módulos |
| fuente-architecture-review | SIM | gate contra mistura de carryforward entre categorias |
| fuente-product-manager | SIM | escopo declarado sobre FIAGRO/FII_INFRA e fundo fechado |
| fuente-investidor-iniciante | SIM | a ausência de isenção para FII é contraintuitiva vs. a regra de ações que acabou de ser construída — risco de confusão do usuário também, não só do código |
| fuente-ux-designer | NÃO | sem UI nesta etapa |
| fuente-business-architect | NÃO | capacidade já modelada na Fase 2 |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(tax): ganho de capital em venda de FII a 20 por cento sem isencao [Item 2.1d]

---

Envie o plano com as 3 respostas do "Investigar Antes" antes de codar. A
resposta que mais me importa é a da investigação 1 — FIAGRO e FII_INFRA
não podem entrar por analogia sem confirmação; prefiro excluir e reportar
a aplicar a regra errada com confiança.
