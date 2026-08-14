# PROMPT 90 — Investigação: Fuente Consensus com Comportamento Suspeito (Bazin/Graham/Gordon)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

**Este é um prompt de INVESTIGAÇÃO, não de correção.** Não altere
`calculations.ts` nem nenhum outro arquivo nesta rodada. A saída é um
relatório de diagnóstico. Regra 8 se aplica com força total aqui:
já houve um caso de suspeita de bug de fórmula que, na leitura estática
do código, aparenta estar matematicamente correto (mediana verdadeira,
não "repetição do menor valor") — então a causa raiz pode estar nos
DADOS de entrada, não na fórmula, e só investigação com dado real
revela isso.

---

## Contexto

Paulo observou no produto: quando os 3 métodos (Bazin, Graham, Gordon)
estão disponíveis para um ativo, o "Fuente Consensus" parece repetir o
menor dos 3 valores em vez de combiná-los de forma mais robusta. Quando
apenas 2 de 3 estão disponíveis, o comportamento observado é uma média.
Para FIIs, alguns ativos têm Graham calculável e outros não.

Leitura estática de `src/lib/calculations.ts:421-431` mostra que a
lógica de consenso já implementa **mediana verdadeira** (não mínimo):
ímpar → valor do meio do array ordenado; par → média dos dois valores
centrais. Matematicamente, isso não deveria produzir "sempre o menor
valor" quando há 3 métodos válidos.

**Isso significa que a causa mais provável não é a fórmula da
mediana em si, mas um destes três cenários:**

1. Os inputs (`bazin`, `graham`, `gordon`) para os ativos que Paulo
   observou tendem a ficar próximos entre si de um jeito que faz a
   mediana parecer "repetir" um valor — coincidência de dados, não bug.
2. Existe uma segunda implementação de consenso em algum outro lugar do
   código (violação de SSOT — Regra 4) que NÃO é a de
   `calculations.ts`, e que de fato usa `Math.min()` em vez de mediana
   — a tela que Paulo está vendo pode não estar consumindo
   `getAssetValuation` de verdade.
3. **Questão de modelagem financeira, não de bug**: Graham (fórmula de
   Benjamin Graham, `√(22.5 × LPA × VPA)`) foi desenhado para ações —
   depende de Lucro Por Ação e Valor Patrimonial Por Ação. FIIs não têm
   essas métricas no sentido tradicional de uma empresa. Se a ingestão
   de dados da CVM está populando `eps`/`bvps` para alguns FIIs com
   algum proxy que não corresponde ao conceito real, o Graham pode
   estar entrando no consenso de FIIs onde **conceitualmente não
   deveria participar**, distorcendo a mediana.

## Tarefas de Investigação

### 1. Confirmar SSOT — existe segunda implementação de consenso?
- Buscar em todo `src/` por qualquer cálculo de "consenso"/"preço
  teto"/"ceiling" que NÃO passe por `getAssetValuation` /
  `consensusPrice` de `calculations.ts`. Prestar atenção especial a
  telas específicas de FII (se existir alguma tela ou componente
  dedicado a FIIs com lógica própria).
- Se encontrar, reportar arquivo + linha + a fórmula usada ali. Não
  corrigir ainda.

### 2. Reproduzir com dado real — escolher 5 ativos
- Escolher 5 FIIs reais da base (via Firestore ou console de teste) que
  tenham os 3 métodos calculáveis, e 5 FIIs que tenham só 2 (Graham
  ausente). Para cada um, logar/imprimir (não precisa ser UI, pode ser
  script standalone ou teste temporário):
  - `bazin`, `graham`, `gordon` (valores brutos retornados por
    `getAssetValuation`)
  - `eps` e `bvps` de entrada usados para calcular o Graham daquele FII
    especificamente — de onde vieram esses números (qual fonte de
    dado: CVM, Brapi, outra)
  - O `consensus` final retornado
  - O valor que a UI realmente exibe pra esse ativo (comparar se bate
    com o `consensus` calculado, ou se diverge — isso sozinho já
    resolveria a hipótese 2 acima)

### 3. Avaliar se `eps`/`bvps` fazem sentido para FII
- Documentar de onde vem o `eps`/`bvps` usado no Graham para os FIIs
  do passo 2 — qual campo da API/CVM está sendo mapeado para essas
  variáveis.
- Reportar, para os 5 FIIs com Graham calculável: o valor de
  `eps`/`bvps` usado bate conceitualmente com "Lucro Por Ação"/"Valor
  Patrimonial Por Ação" de uma ação, ou é uma métrica de fundo (ex:
  Rendimento por Cota, VP da Cota) sendo encaixada num campo que
  originalmente foi desenhado para ações?
- **Não decidir sozinho se Graham deveria ou não se aplicar a FIIs** —
  essa é uma decisão de modelagem financeira que precisa ser validada
  com Paulo (e idealmente contra a role `fuente-investidor-profissional`)
  antes de qualquer mudança de comportamento. Só reportar os fatos
  encontrados.

## Formato de Saída

Uma tabela por ativo investigado:

| Ticker | Bazin | Graham | Gordon | eps usado | bvps usado | Fonte eps/bvps | Consensus (calculado) | Consensus (exibido na UI) | Divergência? |
|---|---|---|---|---|---|---|---|---|---|

Seguida de uma conclusão textual respondendo diretamente:
1. A UI está de fato consumindo `getAssetValuation`, ou existe segunda
   implementação?
2. Nos casos onde a mediana "parece repetir um valor", isso é
   coincidência matemática legítima ou hipótese 2/3 confirmada?
3. O `eps`/`bvps` usado no Graham para FIIs é conceitualmente válido ou
   é um proxy questionável vindo da ingestão de dados?

## Proibido Nesta Rodada
- Não alterar `calculations.ts` nem nenhuma fórmula.
- Não mudar comportamento do Graham para FIIs sem essa investigação
  completa e sem aprovação explícita de Paulo sobre a questão de
  modelagem (item 3 acima) — mesmo que a causa pareça óbvia durante a
  investigação.
