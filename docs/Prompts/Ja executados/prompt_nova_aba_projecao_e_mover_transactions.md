# PROMPT — Nova aba "Projeção" (cotas + renda) + mover Transactions para My Position
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Consultar `fuente-ux-designer`, `fuente-solution-architect`,
> `fuente-investidor-iniciante`, `fuente-investidor-profissional` antes de
> implementar (Regra 9) — vou citar onde cada um se aplica.

---

## 🛑 MODO DE OPERAÇÃO

Plano de implementação antes de codar (Regra 8). Gates obrigatórios ao
final. Sem commit/push sem aprovação.

---

## 1. Decisão de arquitetura de informação (já aprovada, contexto)

Estrutura de abas hoje: `Highlights | My Position | Dividends | ...`.

**Nova estrutura:**
```
Highlights | My Position (+ Transactions) | Dividends | Projeção | ...
```

- `Transactions` deixa de ser aba própria e passa a viver dentro de `My
  Position` (posição real + histórico de transações + eventos societários
  = mesma categoria: "o que já aconteceu de fato").
- `Projeção` é aba nova, logo depois de `Dividends`, e é estritamente
  "o que ainda pode acontecer" — categoria diferente de `My Position`
  (fato) e `Dividends` (renda já recebida). Não misturar as três.

**Motivo (não repita, só para contexto do porquê):** projeção ao lado de
posição real confundiria o iniciante (achar que é parte do estado real) e
quebraria a exigência de rótulo claro histórico-vs-estimativa do perfil
profissional (Regra de "zero suavização silenciosa").

---

## 2. Mover Transactions para My Position

- Remover `Transactions` como aba de nível superior.
- Incorporar seu conteúdo dentro da aba `My Position`, como uma seção
  abaixo do que já existe ali (posição atual, preview, etc.) — não como
  sub-aba nova, como seção na mesma página com scroll.
- Preservar toda a funcionalidade existente da tela de Transactions (CSV
  import, edição de transação individual, etc.) — é só reposicionamento,
  não reescrita.
- **Mobile:** confirmar que a contagem final de abas de nível superior
  (uma a menos agora) continua funcionando com o padrão já exigido —
  scroll horizontal com snap e indicador visual, nunca compressão que
  quebra label (skill `fuente-ux-designer`, seção 2.2). Como esta mudança
  *reduz* a contagem de abas, é uma boa oportunidade para confirmar que o
  padrão de scroll continua correto mesmo com menos itens (não deve virar
  abas fixas sem scroll se isso mudar o comportamento de swipe que outras
  telas dependem).

---

## 3. Nova aba "Projeção" — especificação de cálculo (importante: sem chute de preço)

**O que a aba mostra:** evolução projetada de **quantidade de cotas** e
**renda mensal**, assumindo reinvestimento total dos proventos e aportes
mensais opcionais. **Não projeta valorização do preço da cota** — isso foi
decisão explícita de Paulo (projetar preço é adivinhação; projetar
cotas/renda via reinvestimento composto é matemática determinística dado
o yield atual).

### 3.1 Inputs do usuário
- Período: `1 ano` / `3 anos` / `5 anos` (toggle, igual ao padrão já usado
  em "If You Had Invested...")
- Aporte mensal (opcional, default pode ser vazio/zero)

### 3.2 Dados de partida (não recalcular do zero — usar SSOT existente)
- Quantidade de cotas atual: já disponível via `useValuedPortfolio` /
  posição consolidada do ativo. **Não duplicar essa leitura** — reusar o
  hook/seletor que a aba `My Position` já usa (Regra 1, Regra 4).
- Yield atual: usar `currentDy` (já existe em `asset.metrics`, populado
  por HG Brasil/Dados de Mercado conforme o fix recente) ou o yield
  implícito de `dividendHistory`/`dividends3y` já calculado — **não
  reimplementar cálculo de yield paralelo**. Se não houver certeza de qual
  campo é o canônico para esse propósito, pare e pergunte antes de decidir
  sozinho.
- Preço atual da cota: mesmo valor já exibido em `Position Value`/preço de
  mercado do ativo — reusar, não buscar de novo.

### 3.3 Fórmula de simulação (mês a mês, N = 12/36/60)

Para cada mês `m` de 1 a N:
```
renda_do_mes = cotas_acumuladas × (yield_atual_anual / 12) × preco_atual_da_cota
novas_cotas_por_aporte = aporte_mensal / preco_atual_da_cota
novas_cotas_por_reinvestimento = renda_do_mes / preco_atual_da_cota
cotas_acumuladas += novas_cotas_por_aporte + novas_cotas_por_reinvestimento
```

**Premissa explícita (deve aparecer no aviso da UI, não só no código):**
`preco_atual_da_cota` e `yield_atual_anual` são mantidos **constantes**
durante toda a simulação — a projeção não tenta prever se o preço ou o
yield vão subir, cair, ou mudar. É reinvestimento composto sobre condições
de hoje, não previsão de mercado.

### 3.4 Saídas exibidas
- Gráfico de duas linhas ao longo do período: cotas acumuladas e renda
  mensal (eixos separados, sem depender de eixo Y visível — mostrar valor
  no ponto/tooltip é suficiente, como no protótipo já validado).
- Cards de resumo: cotas hoje → cotas ao final do período; renda mensal
  hoje → renda mensal ao final do período; total investido (posição atual
  + soma dos aportes mensais no período, sem incluir reinvestimento —
  deixar claro que reinvestimento não é "dinheiro novo do bolso").
- Aviso de risco **no topo do painel**, não rodapé — já validado no
  protótipo: "Simulação baseada no yield atual e no valor da cota de hoje.
  Não considera variação futura de preço."
- Rodapé: disclaimer padrão já usado em "If You Had Invested..." (ilustrativo,
  sem taxas/impostos, desempenho passado não garante resultado futuro).

### 3.5 i18n

Todo texto novo passa pelos 3 dicionários (PT-BR, EN, ES) — Regra 2, zero
hardcode. Isso inclui os rótulos dos cards, o aviso de risco, e o
disclaimer se algum texto for novo em relação ao que já existe.

---

## 4. Componente de gráfico

Usar Recharts (já no stack, conforme `AGENTS.md`) — não introduzir nova
biblioteca de gráficos para isso. Duas linhas, sem eixo Y numérico visível
obrigatório (tooltip no hover/tap resolve, seguindo o padrão mobile
touch-friendly já exigido).

---

## 5. Testes obrigatórios

Criar/atualizar arquivo de teste para a função de simulação (pura, sem
side-effects — deve ser extraível como função testável independente do
componente React):

1. Simulação com aporte mensal zero: cotas crescem só por reinvestimento,
   valor bate com cálculo manual para um caso simples (ex: 12 meses, yield
   fixo, sem aporte).
2. Simulação com aporte mensal > 0: cotas crescem por aporte + reinvestimento
   combinados.
3. Simulação com yield 0 (edge case): cotas crescem só por aporte, renda
   permanece 0 durante todo o período.
4. Simulação com 0 cotas iniciais e aporte > 0: começa do zero, ainda
   funciona sem erro.

---

## 6. O que NÃO fazer

- Não projete preço de cota subindo/caindo — só reinvestimento sobre
  condições atuais, conforme especificado.
- Não duplique leitura de yield/preço/cotas — reuse os hooks/seletores que
  `My Position` já consome.
- Não misture a aba `Projeção` com `My Position` ou `Dividends` — fica
  como aba própria, terceira posição depois de `Dividends`.
- Não introduza nova lib de gráficos — Recharts.
- Sem commit, sem push.

---

## 7. Gates obrigatórios

```bash
npx tsc --noEmit
echo %ERRORLEVEL%
npx vitest run
npm run build
```

---

## 8. Entrega final

1. Diff de: remoção da aba Transactions + incorporação em My Position;
   nova aba Projeção (componente + função de simulação pura + testes).
2. Os 4 testes da Seção 5, passando.
3. Screenshots antes/depois (mobile + desktop) confirmando: (a) contagem
   de abas e comportamento de scroll mobile após remover Transactions; (b)
   a nova aba Projeção renderizando corretamente nos dois breakpoints.
4. Confirmação de qual campo foi usado como yield canônico (Seção 3.2) —
   se teve dúvida e decidiu sozinho, sinalize isso explicitamente para
   revisão.
5. Gates literais.
6. Sem commit, sem push — aguardando revisão de Paulo e Claude.
