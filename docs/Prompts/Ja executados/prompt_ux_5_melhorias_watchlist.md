# PROMPT — 5 melhorias de UX: Fundamental Indicators, Update Holdings, Corporate Event, Portfolio Summary, Ticker Header
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Escopo visual/UX — consultar `fuente-ux-designer`, `frontend-design`,
> `fuente-investidor-iniciante` e `fuente-investidor-profissional` para
> cada item antes de implementar (Regra 9).

---

## 🛑 MODO DE OPERAÇÃO

Plano de implementação por item antes de codar (Regra 8). Gates
obrigatórios ao final (`tsc`, `vitest run`, `build`). Sem commit/push sem
aprovação.

---

## 1. Fundamental Indicators — cards truncando no desktop

**Problema:** grid de métricas (`P/...`, `Ac...`, `Cu...`) trunca labels no
desktop. Mobile está correto (empilha, cada card recebe largura total).

**Correção:**
- Não usar `text-truncate`/`overflow:hidden` nos labels desses cards —
  informação essencial nunca deve depender de hover/tooltip pra ser lida
  (anti-padrão "Tooltip Dependency", skill `fuente-ux-designer` seção 6).
- Trocar grid de colunas fixas por `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`
  (ou valor equivalente que comporte o maior label sem quebrar) nos 4
  grupos (Valuation & Price, Dividends & Income, Profitability &
  Efficiency, Real Estate & Assets).
- Testar especificamente em breakpoints intermediários (tablet/desktop
  estreito), não só mobile e desktop wide — é onde geralmente esse tipo de
  bug aparece.
- **Não alterar nada no comportamento mobile** — está correto hoje,
  confirme com screenshot antes/depois em pelo menos 375px de largura.

---

## 2. Update Holdings — mover Quantity/Average Price/Investing Since para cards no topo

**Problema:** esses 3 campos hoje competem visualmente com "My Goals"
(yield/renda alvo) dentro do mesmo painel "Update Holdings" — são
categorias de informação diferentes (posição real vs. meta).

**Correção:**
- Extrair `Quantity owned`, `Average price`, `Investing Since` do formulário
  "Update Holdings" e apresentá-los como cards de leitura rápida no topo da
  página (mesmo padrão visual do bloco "MY PORTFOLIO" que já existe — ver
  referência de estilo em `src/components/ceiling/watchlist/` se já houver
  componente similar reutilizável; não crie um novo padrão visual do zero,
  Regra 1 — Reusabilidade Primeiro).
- O painel "Update Holdings" (o formulário editável) mantém só o que faz
  sentido editar ali — se `Quantity`/`Average price`/`Investing Since`
  também precisam permanecer editáveis nesse formulário (não apenas como
  leitura no topo), confirme se a extração é "adicionar exibição no topo"
  ou "mover e remover do formulário". Se não tiver certeza, pergunte antes
  de decidir sozinho — não é uma decisão puramente visual, pode afetar o
  fluxo de edição.
- Preview (`Ceiling Price`, `Total Cost`, `Projected Annual Income`, `Yield
  on Cost`) permanece como está.

---

## 3. Corporate Event (Split/Grouping) — evoluções

**Manter a feature** — é SSOT travado (Regra 4, "SPLIT events as explicit
ledger entries", decisão já aprovada). As melhorias abaixo são aditivas,
não uma reformulação:

1. **Confirmação em 2 passos:** aplicar o evento muda quantidade/custo
   médio retroativamente e é irreversível pela UI hoje. Adicionar um passo
   de confirmação explícito antes de `Apply Event` executar (modal/sheet
   de confirmação com resumo do que vai mudar — não um segundo clique no
   mesmo botão).
2. **Preview do impacto no preço-teto:** o preview atual já mostra posição
   atual → nova posição. Adicionar também o impacto esperado na Fuente
   Consensus (se aplicável — split muda a escala de preço, então o
   preço-teto por cota também muda proporcionalmente). Confirme com
   `fuente-solution-architect` se isso é só recálculo de exibição ou se
   precisa tocar em `getAssetValuation`.
3. **Copy mais acessível (Iniciante):** "Ratio (Factor)" é jargão sem
   explicação. Adicionar texto auxiliar dinâmico abaixo do campo, tipo
   "Cada 1 cota vira {N}" que atualiza conforme o valor digitado — sem
   remover o campo técnico (perfil profissional ainda precisa do número
   exato).

---

## 4. Portfolio Summary — card de evolução do valor da cota/ativo

**Adicionar** um card novo no mesmo grid de destaque do topo (`QTY`,
`SAFETY MARGIN`, `PROJECTED ANNUAL INCOME`, `POSITION VALUE`, `YIELD ON
COST`):

- **Nome:** algo como "Cota desde a compra" ou "Ativo desde a compra"
  (ajustar copy conforme i18n — Regra 2, sem hardcode).
- **Conteúdo:** preço médio pago vs. preço atual, com variação percentual.
  Se houver espaço/tempo, considerar um sparkline pequeno (linha, não
  candlestick — mobile-friendly) do preço no período — mas isso é opcional
  nesta rodada; o número com variação % já resolve o problema central
  (separar "ganhei porque comprei mais" de "ganhei porque o preço subiu").
- **Fonte/proveniência:** se incluir sparkline, expor período e fonte do
  dado ao lado (ex: "12m, fonte: Yahoo") — perfil profissional exige
  auditabilidade, gráfico bonito sem proveniência não passa (skill
  `fuente-investidor-profissional`, anti-padrão "Dados Sem Fonte").
- Layout: manter os cards existentes como estão, adicionar este como novo
  item no grid — não redesenhar o grid inteiro por causa de 1 card novo.

---

## 5. Ticker Header — remover ou redesenhar o preço solto

**Decisão:** remover o preço do header do ticker (`AFHI11 ... R$ 92,14`)
**se** ele já aparecer de forma contextualizada em outro lugar da mesma
tela (parece que sim — no bloco "MY PORTFOLIO"/Position Value). Confirme
isso antes de remover — se não houver outro lugar visível na mesma tela
mostrando o preço atual do ativo, **não remova**, e em vez disso
redesenhe:
- Preço alinhado à linha de base do título (não flutuando isolado)
- Com variação do dia ao lado: `R$ 92,14 ▲ +0,8%` (cor semântica: verde
  alta, vermelho queda — nunca decorativa)

---

## Testes e verificação

Esses são componentes de UI, não lógica de negócio — não exigem testes
unitários novos necessariamente, mas:
- Rode a suíte completa (`npx vitest run`) para garantir que nenhum teste
  de snapshot/render existente quebrou.
- Para o item 3 (Corporate Event), se a confirmação em 2 passos mudar o
  fluxo de forma que testes existentes de `CorporateEventFields.test.tsx`
  dependam da ordem de cliques, atualize os testes de acordo.
- Screenshots antes/depois obrigatórios para os itens 1, 2, 4 e 5 — mobile
  E desktop, já que o item 1 é especificamente uma regressão de desktop
  que não pode se repetir nos outros.

## Gates obrigatórios

```bash
npx tsc --noEmit
echo %ERRORLEVEL%
npx vitest run
npm run build
```

## Entrega final

1. Diff de cada item, separado por seção.
2. Screenshots antes/depois (mobile + desktop) para itens 1, 2, 4, 5.
3. Confirmação explícita das duas perguntas em aberto (item 2: mover vs.
   duplicar Quantity/Average Price/Investing Since; item 5: preço já existe
   em outro lugar da tela ou não).
4. Gates literais.
5. Sem commit, sem push — aguardando revisão de Paulo e Claude.
