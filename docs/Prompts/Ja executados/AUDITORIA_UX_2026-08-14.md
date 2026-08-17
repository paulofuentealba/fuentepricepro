# Auditoria de Frontend & UX — Varredura Completa do App

**Data:** 14 de agosto de 2026
**Escopo:** Todas as 10 abas do sidebar do app (`/app` até `/app/docs`)
**Metodologia:** Regra 9 do `AGENTS.md` (papéis explícitos) + skills `frontend-design`, `fuente-ux-designer`, `fuente-investidor-iniciante`, `fuente-investidor-profissional`, `dataviz`
**Artifact interativo:** https://claude.ai/code/artifact/0dedca39-7592-4c80-8af4-0d5fd23bcbe4

---

## Nota de método

A maior parte das telas foi testada com a massa de dados de desenvolvimento (botão "Restore Mock Data", dev-only, 18 ativos), não com uma conta real de produção — alguns números (ex: yield médio de 10,5% no Snowball) são artefato do fixture, não do produto. O Radar Global já usa dado ao vivo da Brapi e revelou um problema de classificação de dado real. Onde não foi possível verificar visualmente (paleta de cores dos gráficos, contraste exato), isso é dito explicitamente em vez de estimado — não houve captura de screenshot pixel-a-pixel nesta sessão (pane do navegador indisponível para composição de frame); toda leitura foi via árvore de acessibilidade/DOM/JS.

---

## 0. Governança — Regra 9 (AGENTS.md)

Papéis considerados nesta atividade, com justificativa de aplicabilidade — nenhum omitido silenciosamente.

| Papel | Status | Justificativa |
|---|---|---|
| `fuente-ux-designer` | **Aplicado** | Lente principal — benchmarks StatusInvest/Investidor10/Snowball/Simply Safe/Koyfin, densidade, mobile-first, WOW effect. |
| `fuente-investidor-iniciante` | **Aplicado** | Jargão sem explicação, ansiedade gerada por cor/copy, guiamento. |
| `fuente-investidor-profissional` | **Aplicado** | Auditabilidade do cálculo, densidade de dado, exportação, rigor fiscal. |
| `fuente-solution-architect` | **Aplicado** | Causa raiz dos 2 bugs (hooks, regra Firestore) é arquitetural, não só visual. |
| `fuente-architecture-review` | N/A | Não houve revisão de PR/diff de código nesta rodada — é varredura de produto rodando, não de código proposto. |
| `fuente-business-architect` | N/A | Fora do escopo — não avaliei modelo de negócio/pricing. |
| `fuente-product-manager` | N/A | Escopo era UX/frontend, não priorização de backlog — mas a seção 4 alimenta isso. |
| `fuente-product-marketing` | N/A | Não avaliei copy de venda/landing — pedido foi sobre o app logado. |
| `fuente-advogado-lgpd-gdpr` | N/A | Nenhuma coleta/exposição de dado pessoal nova foi observada nesta varredura. |

---

## 1. Achados críticos — não são "polish", são bugs reais

Encontrados ao vivo navegando o app, não por leitura estática de código.

### 1.1 Crash de rota inteira — hooks fora de ordem no `NextPaymentBanner` — ✅ Corrigido nesta sessão

**Onde:** `src/components/ceiling/watchlist/NextPaymentBanner.tsx:127-131`

`useState(0)` e o `useEffect` de reset de página vinham *depois* de `if (sortedList.length === 0) return null`. Sempre que a lista de próximos pagamentos alterna entre vazia e não-vazia em renders seguidos, o React viola a Regra dos Hooks e derruba a árvore inteira — na prática, a rota `/app/screener` quebrou completamente (caiu no error boundary genérico) na primeira navegação real desta varredura.

Corrigido: hooks movidos para antes do early return. `tsc`/`vitest` (340 testes)/`build` confirmados limpos, commit e push feitos para `dev` (commit `2dee04c`).

### 1.2 Regra do Firestore bloqueia o Feature Gates para todo mundo, exceto admin — 🔴 Crítico, não corrigido

**Onde:** `firestore.rules:35-38` · consumido por `src/lib/featureGates.ts` (`useFeatureGates`)

```
match /config/featureGates {
  allow read: if request.auth.token.isAdmin == true;
  allow write: if false;
}
```

Mas `useFeatureGates()` é chamado para **todo usuário** (inclusive convidado) para decidir gates como `freeAssetLimit`, `cashflowUnlocked` etc. Como nenhum usuário real é admin, todo mundo recebe `permission-denied` (confirmado no console em várias abas) e cai silenciosamente no fallback `DEFAULT_FEATURE_GATES` hardcoded.

**Consequência prática:** o painel Admin → Feature Gates (Prompt 88) não tem nenhum efeito em produção hoje — qualquer toggle salvo lá nunca chega a um usuário real, porque o cliente nunca consegue ler o documento atualizado. Isso não é uma opinião de UX, é uma regra de acesso que provavelmente deveria ser `allow read: if true;` (mesmo padrão já usado em `enrichedFundamentals` na linha 30-31), mantendo `allow write: if false` como já está. **Não alterado** — é uma mudança de regra de segurança em produção, aguardando sinal verde explícito antes de tocar.

### 1.3 ETF classificado como "Ação" no Radar Global (dado real, não mock) — 🟠 Alto

**Onde:** `/app/globalradar` — ticker BIVB39 ("Ishares Core S&P 500 Etf")

Com dado ao vivo da Brapi, o BDR do ETF IVV apareceu com `Tipo: Ação` e `Setor: N/A`. Mesma família de bug do FII/REIT já corrigido nos Prompts 86/89 (ordem de classificação) — aqui é um BDR de ETF (sufixo 39) caindo no fallback de ação em vez de ETF/BDR. Vários outros tickers na mesma tabela mostram `Margem +0.0%` e `DY 0,0%` simultaneamente (DIVO11, BIVB39, NDIV11) — padrão consistente com dado de valuation ausente sendo exibido como zero em vez de "indisponível", o que é enganoso (zero parece um dado real, não um "não calculado").

---

## 2. Varredura por aba

Ordem do sidebar. "Aprovar / Ajustar / Bloquear" segue o formato de saída do `fuente-ux-designer`.

### Independência Financeira (Home) — `/app` — Aprovar com ajuste

- **UX/Iniciante:** número-herói "R$ 519.680,07" com legenda "acumulados · configure sua meta..." é só texto, sem botão — o CTA mais importante da tela (configurar meta de renda) fica invisível como ação. Milestone "✓ Primeiros R$ 100 mil" é um ótimo toque de gamificação (exatamente o que o `fuente-investidor-iniciante` pede) — mas só um milestone aparece; vale conferir se o de "50% da renda coberta" também dispara.
- **Mobile-first:** a tabela "Sua carteira" usa `<table>` puro (800px de largura real) dentro de um wrapper com scroll horizontal contido — mas **sem coluna fixa** (confirmado: `position: static` na 1ª coluna/célula). Ao rolar para ver P&L/Yield em mobile, o usuário perde de vista qual ativo é qual — anti-padrão "Tabela Infinita Mobile". A coluna "Variação" mostrou `—` em 100% das linhas testadas.

### Minha Carteira — `/app/myportfolio` — Aprovar

- **UX/Iniciante:** melhor tela do app para o iniciante: "COMPRA SEGURA" / "SUPERAVALIADO" em linguagem direta, sem jargão cru na superfície; cor 🟢🟡🔴 funcional. Filtro rápido "Descontados / Caros" é exatamente o "modo binário" que o iniciante precisa. ETFs sem consenso mostram `--` sem explicação — um iniciante pode achar que é erro; um tooltip "Bazin/Graham/Gordon não se aplicam a ETFs" resolveria em uma linha.
- **Profissional:** alocação por tipo, patrimônio consolidado, renda projetada separada por USD/BRL — bom nível. Falta visível (não testável sem export real): confirmar que o export CSV/Excel traz as 40+ colunas cruas, não só o resumo — critério de bloqueio do `fuente-investidor-profissional` se vier resumido.

### Screener — `/app/screener` — Ajuste (expectativa de nome)

- **Produto/Nomenclatura:** em toda referência de mercado (StatusInvest, Investidor10, Simply Safe), "Screener" significa *filtrar uma lista de muitos ativos* por critério (DY mínimo, setor, P/VP). Esta aba é, na prática, a calculadora de um único ticker por vez (busca → consenso). Isso já existe e funciona bem — é o rótulo que promete algo que a tela não entrega. O "Radar Global" é quem de fato filtra/lista oportunidades. Vale considerar renomear esta aba (ex: "Calculadora"/"Valuation") ou fundir a expectativa de screener de fato na aba Radar Global.
- **Iniciante:** empty state é exemplar: "Busque um ticker e defina seu yield alvo para ver o preço teto e a margem de segurança" — orientação clara, sem jargão não-explicado na primeira tela.

### Mesa de Decisão — `/app/comparator` — Aprovar

Empty state também exemplar ("Mesa de Decisão Vazia" + ação clara). Limite de 3 ativos lado a lado é uma decisão de densidade sensata para mobile sem sacrificar comparação — não testado o comportamento em telas <375px com 3 ativos simultâneos, recomenda-se checagem visual manual.

### Radar de Risco — `/app/riskradar` — Aprovar (melhor tela para o perfil profissional)

- **Profissional:** Concentração por Ativo + Exposição Setorial em tabelas com status semântico ("Seguro"/"Atenção"/"Risco de Concentração") — nível Bloomberg-lite genuíno, bate o critério do `fuente-investidor-profissional`. Único ruído de dado: "Large Value" (categoria de estilo Morningstar de um ETF, VYM) aparece misturado na coluna "Setor" ao lado de setores GICS reais (Real Estate, Financials) — dilui o alerta de concentração setorial, que deveria olhar só setor econômico.
- **Mobile-first:** único caso testado onde a tabela **de fato** encolhe para caber em 375px sem overflow (351px medido) — é o padrão certo. Compare com a tabela da Home para ver a inconsistência entre telas do mesmo app.

### Radar Global — `/app/globalradar` — Ajuste (ver achado 1.3)

Slider de yield alvo, filtro BR/US, ordenação, "Net Yield após impostos" já rotulado — boa transparência fiscal na superfície. Esta é a tela mais próxima de um "screener" de verdade no app (ver nota da aba Screener). Problema de dado real documentado no achado crítico 1.3.

### Fluxo de Caixa — `/app/cashflow` — Aprovar (validar paleta)

- **Profissional:** IRR anualizado com benchmark contra CDI e Selic lado a lado é um recurso genuinamente institucional — poucos apps de varejo BR mostram isso. Realizado vs. Projetado bem separado e com nota de metodologia explícita.
- **Dataviz — não verificado visualmente:** 3 gráficos (mensal, acumulado, investido-vs-recebido). Não foi possível capturar screenshot nesta sessão, então não há confirmação de contraste/paleta colorblind-safe por inspeção visual — recomenda-se rodar o validador do skill `dataviz` (`scripts/validate_palette.js`) contra as cores reais usadas nesses 3 charts antes de dar como fechado.

### Aporte Inteligente — `/app/smartallocation` — Aprovar

5 estratégias combináveis (até 2), com hint claro do limite. Disclaimer legal presente e bem localizado. Nota técnica menor: existe uma segunda cópia do formulário inteira em inglês, presente no DOM mas com `display:none` (não visível, não afeta o usuário) — parece um artefato de um variante mobile/desktop montado simultaneamente; não é bug visível, mas vale um code review rápido para confirmar que não é HTML/JS morto sendo enviado ao cliente à toa.

### Efeito Bola de Neve — `/app/snowballeffectsimulator` — Aprovar

Copy de abertura em uma frase, sem jargão, explica exatamente o que a simulação faz. Toggle DRIP nomeado por extenso ("Reinvestimento Automático de Dividendos") em vez de só a sigla — bom exemplo de "jargão sempre explicado" do playbook do iniciante. Gráfico com "Ponto de Virada" (crossover) rotulado no próprio chart é uma boa aplicação de "estrutura = informação".

### Wiki — `/app/docs` — Ajuste (copy vs. cálculo)

Conteúdo educacional é genuinamente forte (fórmulas com exemplo numérico, glossário, lista de corretoras suportadas por CNPJ). Um problema real confirmado ao vivo, que já havia aparecido na investigação do Prompt 90: o texto do "Consenso Fuente" diz *"Ao extrair a **média** de Bazin, Graham e Gordon"* — mas `calculations.ts` implementa **mediana**, não média. Para o perfil profissional isso é o tipo de inconsistência que mina confiança ("o texto descreve uma fórmula diferente da que roda") — é só copy, fácil de corrigir, mas vale fechar junto com a decisão de modelagem do Graham-para-FII já registrada no relatório do Prompt 90.

---

## 3. Padrões recorrentes (atravessam múltiplas abas)

**Mobile-first é inconsistente entre telas.** Radar de Risco encolhe corretamente para 375px sem scroll (comportamento-alvo da Regra 5). A tabela "Sua carteira" da Home mantém 800px fixos dentro de um scroll horizontal sem coluna fixa (anti-padrão). Isso sugere que a Regra 5 foi aplicada tela a tela, não como padrão de componente — um `ResponsiveTable`/hook compartilhado (Regra 1 — reusabilidade) resolveria as duas de uma vez e evitaria a próxima tela repetir o mesmo erro.

**Valor ausente exibido como zero em vez de "indisponível".** No Radar Global, tickers sem valuation calculável mostram `+0.0%` de margem e `0,0%` de DY em vez de um estado explícito ("Dado insuficiente"). Zero é um valor com significado (ativo no preço exato do teto) — reaproveitá-lo como "não calculado" é ambíguo para os três perfis: iniciante pode achar que é o preço justo real, profissional não confia no número sem saber se é zero de verdade ou ausência de dado.

---

## 4. Priorização sugerida

| Item | Esforço | Por quê agora |
|---|---|---|
| Regra do Firestore em `config/featureGates` | Trivial (1 linha) | Sem isso, o painel Admin do Prompt 88 é decorativo — zero efeito em produção. |
| Coluna fixa nas tabelas mobile (padrão compartilhado) | Médio | Afeta a primeira tela que todo usuário logado vê (Home). |
| Zero → "indisponível" no Radar Global/onde mais ocorrer | Pequeno | Risco de decisão errada por um usuário lendo "0%" como dado real. |
| Copy "média" → "mediana" na Wiki + tooltip de consenso | Trivial | Inconsistência que um investidor profissional pega na primeira leitura. |
| Investigar classificação BIVB39/ETFs no Radar Global | Pequeno–médio | Mesma família do bug FII/REIT já corrigido — provavelmente mesmo fix. |
| Nomenclatura "Screener" vs. conteúdo real | Decisão de produto | Não é bug, mas desalinha expectativa vs. benchmarks (StatusInvest etc.) — decisão do Paulo, não técnica. |
| Validar paleta dos 3 gráficos do Cash Flow | Pequeno | Não verificável sem renderização visual nesta sessão — rodar o validador do skill dataviz. |

---

## O que não foi possível verificar nesta rodada

Limitações do ambiente, não do produto: captura de screenshot real (pane do navegador indisponível para composição de frame — toda leitura foi via árvore de acessibilidade/DOM/JS, não pixel a pixel); contraste de cor exato (WCAG AA) sem inspeção visual; comportamento com uma conta autenticada real de produção (tudo rodou como convidado com dado local mock, exceto o Radar Global, que usou dado ao vivo da Brapi). Recomenda-se uma segunda passada com screenshot real antes de considerar a auditoria visual 100% fechada.
