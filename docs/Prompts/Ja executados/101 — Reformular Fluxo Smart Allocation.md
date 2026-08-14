# PROMPT 101 — Reformular Fluxo do Smart Allocation
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

Aplicar `fuente-solution-architect` e `fuente-ux-designer`
explicitamente (Regra 9). Este prompt reformula o comportamento
central da tela — apresentar o plano de implementação (Regra 8) antes
de codar, especificamente para os itens 1 e 4 abaixo (mudança de
quando/como o cálculo reage), que têm maior risco de regressão.

## Contexto — Causa Raiz Já Confirmada

`src/components/ceiling/SmartAllocation.tsx`:
- Linha 66: `strategies` inicia como `["yield"]` — "Max Yield" vem
  pré-selecionado, confirmado na captura de Paulo.
- `targets` (o "Target Allocation %" mostrado na tela) vem de
  `settings.smartAllocationTargets` — **configuração persistida do
  usuário, completamente desacoplada** do campo "Available capital" e
  da(s) estratégia(s) selecionada(s). Por isso a captura de Paulo
  mostra percentuais preenchidos mesmo com o campo de capital vazio —
  não é o resultado de nenhum cálculo reativo, é só o que já estava
  salvo antes.
- Linha 289: o botão "Generate allocation" já é `disabled` quando
  `!capital || Number(capital) <= 0 || !hasCurrency[currency]` — mas
  **não** considera `strategies.length === 0` na condição (porque hoje
  `strategies` nunca fica vazio, sempre tem `["yield"]` por padrão).

## Especificação do Novo Comportamento (5 itens de Paulo)

Duas computações diferentes precisam ficar claras e não devem ser
confundidas uma com a outra:
- **(A) Target Allocation (%)** — a distribuição percentual por classe
  de ativo. Deve ser **reativa/automática**, recalculada sempre que
  capital OU estratégia mudam, sem precisar de clique.
- **(B) "Generate Allocation"** — a recomendação final de compra por
  ativo específico (quais tickers, quantas cotas/ações). Continua
  sendo ação manual via botão, mas com gate de validação mais completo.

### 2.1 — Suggested Allocation não deve calcular sem capital preenchido
- Hoje "Suggested Allocation" (botão amarelo) parece disparar algo
  mesmo com capital vazio. Investigar exatamente o que esse botão faz
  (`onClick` handler) antes de alterar — reportar o achado.
- Fix: (A) Target Allocation só deve ser preenchido/exibido quando
  `capital > 0` E ao menos 1 estratégia estiver selecionada — ver 2.4.

### 2.2 — Allocation Strategy sem seleção padrão
- Mudar estado inicial de `strategies` de `["yield"]` para `[]`.
- `isDefaultStrategies` (linha 255) e `handleResetStrategies` (linha
  251) precisam refletir esse novo estado vazio como "default", não
  `["yield"]`.
- Usuário deve escolher explicitamente ao menos 1 estratégia (até 2,
  regra já existente "pick up to 2" mantida).

### 2.2.1 — Disclaimer amarelo vira aviso discreto dentro do acordeon
- O bloco amarelo atual ("This is a suggestion based on your profile...
  not an investment recommendation") deixa de ser um card de destaque
  próprio e passa a ser um texto discreto (ex: tamanho de fonte menor,
  cor `text-muted-foreground`, sem card com borda/fundo colorido)
  **dentro** do acordeon "Target Allocation (%)" — próximo ao cabeçalho
  da seção, não mais competindo visualmente com o resto da tela.
- Manter o texto do disclaimer como está (é linguagem regulatória —
  não reescrever sem necessidade).

### 2.3 — Botão "Generate allocation" move pro final + gate mais completo
- Reposicionar o botão para o final da seção (depois de "Max
  Concentration (%)", antes do resultado/breakdown), conforme a marcação
  na captura de Paulo.
- Atualizar a condição `disabled` para incluir também
  `strategies.length === 0`:
  ```
  disabled={!capital || Number(capital) <= 0 || !hasCurrency[currency] || strategies.length === 0 || isGenerating}
  ```
- Este botão continua sendo o disparador da computação (B) — a
  recomendação final de compra —, não mais responsável por popular (A).

### 2.4 — Target Allocation (%) preenchido automaticamente
- Trocar a fonte de `targets` de `settings.smartAllocationTargets`
  (config persistida solta) para um cálculo **derivado** de
  `capital` + `strategies` selecionadas, recalculado via `useMemo`
  toda vez que qualquer um dos dois mudar.
- Investigar se já existe alguma função/mapa que traduza
  "estratégia → pesos por classe de ativo" em algum lugar do código
  (ex: dentro de `doGenerate`, ou em `calculations.ts`) antes de criar
  lógica nova (Regra 1) — se existir, reaproveitar para alimentar o
  `useMemo` reativo; se não existir, esta é a peça central de lógica
  nova deste prompt e precisa ser desenhada com cuidado (múltiplas
  estratégias combinadas = média ponderada? Prioridade de uma sobre
  outra? — não decidir sozinho, propor a regra de combinação e
  perguntar antes de implementar se não houver precedente claro no
  código).
- `settings.smartAllocationTargets` deixa de ser a fonte principal —
  avaliar se ainda faz sentido persistir o resultado calculado (ex:
  para lembrar a última alocação gerada) ou se deve ser removido do
  `useUserSettings` — reportar a decisão tomada e por quê.
- Os sliders/inputs de cada classe de ativo continuam editáveis
  manualmemente pelo usuário (ajuste fino sobre a sugestão automática),
  mas o valor inicial ao trocar capital/estratégia deve ser o
  calculado, não o persistido antigo.

### 2.5 — Max Concentration (%) — opcional, mas considerado no cálculo final
- Confirmar que hoje `maxConcentration`
  (`settings.maxConcentrationPerAsset`) já é lido em algum lugar da
  lógica de `doGenerate`/geração de recomendação — se não for,
  incorporar como restrição no cálculo (B): nenhum ativo individual
  recomendado deve ultrapassar esse percentual do capital total a
  investir, redistribuindo o excedente entre os demais ativos elegíveis
  da mesma estratégia.
- Campo permanece opcional (sem valor = sem restrição de concentração
  máxima).

## Plano — Apresentar Antes de Codar (Regra 8)

Antes de implementar 2.4, responder e apresentar:
1. Existe hoje alguma função de "estratégia → pesos"? Onde?
2. Proposta de regra de combinação quando 2 estratégias são
   selecionadas ao mesmo tempo (ex: "Max Yield" + "Defensive").
3. Decisão sobre o destino de `settings.smartAllocationTargets`
   (manter como cache da última geração vs. remover).

## Gate de Saída

- `npx tsc --noEmit`, `npx vitest run` (testes novos cobrindo: capital
  vazio não gera nada, seleção de estratégia dispara recálculo
  reativo, botão desabilitado sem estratégia selecionada, Max
  Concentration restringindo o resultado final), `npm run build`.
- Teste manual do fluxo completo: sem estratégia selecionada →
  selecionar 1 → ver Target Allocation preencher sozinho → editar
  capital → ver recalcular → clicar Generate Allocation → resultado
  final respeitando Max Concentration se preenchido.

## Proibido

- Não decidir sozinho a regra de combinação de 2 estratégias sem
  precedente no código — perguntar antes.
- Não remover a possibilidade de ajuste manual dos sliders de Target
  Allocation — o cálculo automático é o ponto de partida, não trava o
  campo.
