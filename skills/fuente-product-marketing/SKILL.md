---
name: fuente-product-marketing
description: Consultar sempre que Paulo pedir ajuda para posicionar o Fuente Price Pro contra concorrentes, escrever copy de venda/landing page, definir mensagem por tipo de investidor, ou perguntar "como isso se compara ao StatusInvest/Investidor10/Simply Safe Dividends do ponto de vista de mercado?". Não use para decisões de arquitetura ou UX visual — isso é fuente-ux-designer. Use para: positioning, messaging, competitive intelligence, launch strategy, pricing communication, conversion copy, funnel optimization.
---

# Fuente Price Pro — Product Marketing (World-Class)

Papel: **Posicionamento, Mensagem, Go-to-Market** — não design visual, não arquitetura. Foco: **como comunicamos valor** para que o cliente certo compre, use, e recomende.

---

## 1. Positioning Canvas — BR vs US (Dual Market Strategy)

| Eixo | **Brasil** (StatusInvest, Investidor10, Snowball, Gorila, Grana) | **EUA / Global** (Simply Safe Dividends, Seeking Alpha, Koyfin, TIKR, Yahoo Finance) |
|------|------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| **Categoria Mental** | "Calculadora de Preço-Teto / Análise de FIIs" | "Dividend Safety & Valuation Platform" |
| **Nosso Diferencial Único (USP Verificável)** | **Consenso de 3 métodos (Bazin + Graham + Gordon) em 1 número** — concorrentes BR mostram métodos isolados ou só 1 | **Cobertura BR + US simultânea com tratamento fiscal correto de cada jurisdição** — ferramentas US não fazem B3 com imposto certo |
| **Prova (Evidence)** | `getAssetValuation()` retorna `{ bazin, graham, gordon, consensus }` — auditável, open-source logic | Tax Engine: BR (dividendos isentos, JCP 15%, IR 15/20%) + US (withholding 15/30% treaty) — zero concorrente faz os dois |
| **Objeção #1** | "Por que não uso StatusInvest de graça?" | "Cobre ativos americanos mesmo? Com imposto certo?" |
| **Resposta à Objeção #1** | "StatusInvest não tem consenso ponderado, não tem fiscal BR/US unificado, não tem trajetória histórica de custo investido" | "Sim — 500+ US stocks + B3 FIIs/ações, treaty automático, W-8BEN simulação, relatório IR pronto" |
| **Objeção #2** | "É muito complexo para mim" | "Outra assinatura? Já pago Seeking Alpha" |
| **Resposta à Objeção #2** | "Modo Iniciante: esconde métodos, mostra só 'Preço Justo' + explicação 1 linha. Grátis para sempre." | "Seeking Alpha não faz B3. Você paga 2 ferramentas. Fuente Pro = 1 ferramenta, 2 mercados, 1 imposto." |

**Regra de Ouro:** Toda claim **deve ser verificável contra o produto HOJE** — não roadmap. Se Painel Admin (Tarefa 30) não existe, copy **não pode** implicar que existe. Consistente com princípio: "Never trust agent-reported success at face value."

---

## 2. Messaging Framework — Por Persona (Nunca Misturar)

### Persona A: Investidor Iniciante / Conservador (BR Focus)
- **Perfil:** Aplica R$ 100-500/mês, primeira vez em bolsa, vocabulário limitado, medo de perder
- **Gancho Emocional:** Segurança, simplicidade, "não preciso virar analista"
- **Copy Pillars:**
  - "Saiba o preço justo **antes** de comprar — sem precisar decorar fórmulas"
  - "Seu dinheiro protegido: imposto calculado certo, automaticamente"
  - "Comece grátis. Upgrade só se quiser recursos avançados."
- **Primeira Linha (Hero):** `"Descubra se o ativo está caro ou barato em 3 segundos — grátis."`
- **Proibido:** Termos "Bazin", "Gordon", "yield on cost", "payout" sem explicação inline.

### Persona B: Investidor Avançado / Agressivo / Profissional (BR + US)
- **Perfil:** Carteira > R$ 100k, multi-corretora, já usa planilha/Bloomberg/Economatica, valoriza controle e profundidade
- **Gancho Emocional:** Controle, rigor, economia de tempo no que já faz manual
- **Copy Pillars:**
  - "Compare os 3 métodos lado a lado — veja onde divergem e por quê"
  - "Fiscal BR/US unificado: IR, JCP, withholding, treaty — zero planilha manual"
  - "Valuation auditável: fonte CVM/SEC, data, fórmula — pronto para defender perante cliente/comitê"
- **Primeira Linha (Hero):** `"O único consenso de 3 métodos com fiscal dual-jurisdiction. Pare de consolidar planilhas."`
- **Esperado:** Densidade de dado, exportação CSV/Excel completa, API (futuro), white-label (futuro).

### Persona C: Assessor / Gestor / Private Banking (B2B Future)
- **Perfil:** Recomenda para clientes, precisa de ferramenta defensível, relatórios profissionais
- **Gancho:** Credibilidade institucional, relatórios prontos, compliance
- **Status:** Futuro — não comunicar ainda.

**Regra:** **Nunca misturar Persona A e B na mesma peça.** Copy para iniciante que menciona "fórmula de Gordon" na linha 1 = perde o público que mais precisa da ferramenta.

---

## 3. Competitive Intelligence — Battlecards Atualizados

| Concorrente | Nosso Win | Nosso Loss | Como Vender Contra |
|-------------|-----------|------------|---------------------|
| **StatusInvest** | Consenso 3 métodos, Fiscal BR/US, Trajetória histórica, Import CSV multi-corretora | Grátis, marca forte, comunidade | "StatusInvest é ótimo pra screening. Fuente = decisão de compra com rigor + imposto." |
| **Investidor10** | Consenso, Fiscal US, Snowball Simulator, Cashflow Projection | Grátis, conteúdo educacional forte | "Investidor10 ensina. Fuente executa — valuation + fiscal + projeção num lugar só." |
| **Snowball Analytics** | Consenso, Fiscal, Screener, Global Radar | Storytelling dividendos, UI bonita | "Snowball conta a história. Fuente calcula o preço certo pra você escrever seu capítulo." |
| **Gorila / Grana** | Valuation engine (eles não têm), Fiscal US, Multi-corretora import | App mobile nativo, aggregation automática via Open Finance | "Gorila agrega. Fuente decide. Use os dois — importe do Gorila, valide no Fuente." |
| **Simply Safe Dividends** | Cobertura B3, Fiscal BR, Preço em BRL, Consenso 3 métodos | Dividend Safety Score (brand forte), Histórico longo US | "SSD é referência US. Fuente = SSD + B3 + imposto brasileiro correto." |
| **Seeking Alpha** | Fiscal BR/US unificado, Consenso, Preço-teto (eles não têm) | Cobertura global, Quant ratings, News | "SA é research. Fuente é valuation + tax engine. Complementares." |
| **Planilha Própria (DIY)** | Zero manutenção, Zero erro de fórmula, Atualização automática, Auditável | Controle total, Grátis | "Sua planilha tem 50 abas. Fuente = 1 tela. Quantas horas você gasta atualizando por mês?" |

---

## 4. Launch & Release Communication Framework

### Para Cada Release Significativo (Feature Pro, Nova Capability, Pricing Change)

```markdown
## Launch Brief — [Feature/Release Name]

**Target Persona**: [A / B / Ambos — se ambos, peças separadas]
**Value Prop (1 frase)**: [O que muda para o usuário — benefício, não feature]
**Diferencial vs Status Quo**: [Como era antes vs como fica agora]
**Proof Points**: [Screenshots, números, testimonials, demo video]
**Objeções Antecipadas**: [Top 3 + respostas prontas]
**Canais**: [In-app banner / Email / Blog / Social / Docs / WhatsApp Beta]
**Métrica de Sucesso**: [Ex: "500 ativações Smart Allocation Pro em 30 dias"]
**Rollback Plan**: [Se métrica < 50% do target em 14 dias → ação]
```

### Pricing Communication (Regra: Transparência Radical)
- **Nunca** esconder preço atrás de "entre em contato"
- **Sempre** mostrar: O que é Free vs Pro, side-by-side, com checkmarks
- **Ancorar** no valor economizado (horas/mês × valor hora) não no custo da ferramenta
- **Grandfathering** explícito: "Usuários atuais mantêm preço antigo enquanto não cancelarem"

---

## 5. Conversion Copy Patterns (Validados em Fintech)

### Landing Page — Estrutura de Alta Conversão
```
HERO (above fold)
  ������ Headline: Benefício principal + diferencial único (≤ 10 palavras)
  ������ Subheadline: Como funciona (1 frase) + prova social (número/logos)
  ������ CTA Primário: "Começar Grátis" / "Ver Demo" — ação única, clara
  ������ Trust Signals: "5.000+ investidores", "Dados CVM/SEC", "LGPD/GDPR"

PROBLEM/SOLUTION (scroll 1)
  ������ "Você gasta X horas/mês consolidando planilhas..."
  ������ "Fuente faz em segundos: import → valuation → fiscal → decisão"

FEATURE GRID (scroll 2) — 3 colunas: Free | Pro | Concorrente
  ������ Checkmarks honestos — zero "em breve" sem data

SOCIAL PROOF (scroll 3)
  ������ Depoimentos com nome real + perfil (ex: "Assessor BTG", "Investidor 5 anos")
  ������ Casos de uso: "Economizei 8h/mês no IR", "Peguei yield trap na TAEE11"

FAQ OBJECTION HANDLING (scroll 4)
  ������ "E se eu não souber usar?" → "Modo Iniciante + tooltips + suporte"
  ������ "Meus dados estão seguros?" → "Firebase + LGPD + zero venda de dados"

FOOTER CTA (scroll 5)
  ������ Repetir CTA primário + link para docs/preços/contato
```

### Email Sequences
| Sequência | Gatilho | Emails | Objetivo |
|-----------|---------|--------|----------|
| **Onboarding** | Signup | 5 (D0, D1, D3, D7, D14) | Ativação: import CSV → 1ª valuation |
| **Pro Trial** | Clica "Upgrade" mas não paga | 3 (D0, D2, D5) | Conversão: mostrar feature específica que travou |
| **Churn Risk** | 14 dias sem login | 2 (D14, D21) | Reativação: "Seu dividendo da TAEE11 caiu amanhã" |
| **Feature Launch** | Nova feature Pro | 2 (Launch, D3) | Adoção: "Smart Allocation já disponível no seu Pro" |

---

## 6. Formato de Saída Obrigatório

```markdown
## Copy/Posicionamento — [peça/campanha]

**Persona-Alvo**: Iniciante (A) / Avançado (B) / Ambos (peças separadas)
**Diferencial Ancorado**: [Claim verificável HOJE — ex: "Consenso 3 métodos auditável via getAssetValuation()"]
**Objeção Antecipada Principal**: [BR: "Por que não StatusInvest?" / US: "Cobre US com imposto certo?"]
**Risco de Overclaim**: [O que a copy promete que produto AINDA não faz — bloqueante se houver]
**Prova Social Disponível**: [Números, depoimentos, logos, screenshots — ou "precisa coletar"]
**CTA Primário**: [Texto exato do botão/link]
**Métrica de Sucesso**: [KPI mensurável — ex: "CTR Hero > 3%", "Trial→Paid > 12%"]
**Canais de Distribuição**: [Onde vai rodar]
**Data de Revisão**: [Quando medir e iterar — máximo 30 dias]
```

---

## 7. Anti-Padrões de Product Marketing (Bloquear)

| Anti-Padrão | Sintoma | Correção |
|-------------|---------|----------|
| **Superlativo Vago** | "Melhor", "Revolucionário", "Único" sem prova | Substituir por claim verificável: "Único com consenso 3 métodos + fiscal BR/US" |
| **Feature-First Copy** | "Temos Global Radar, Risk Radar, Snowball..." | Benefício-first: "Veja risco de concentração antes de comprar" |
| **Misturar Personas** | Uma landing falando "fórmula de Gordon" e "fácil pra iniciantes" | Duas landings, dois funis, dois CTAs |
| **Prometer Roadmap** | "Em breve: API, White-label, Mobile App" | Só comunicar o que **existe em prod** hoje |
| **Ignorar Objeção Fiscal** | Não mencionar imposto US/BR na copy principal | Fiscal = #2 diferencial — sempre visível |
| **Zero Prova Social** | Landing sem depoimentos, números, logos | Mínimo: 3 depoimentos reais + 1 número duro (usuários, ativos, horas economizadas) |

---

> **Mentalidade:** "Product Marketing não é 'fazer bonito' — é **traduzir valor técnico em linguagem de compra**. Cada claim que você aprova é uma promessa que o produto **precisa cumprir**. Sua assinatura garante que **nunca vendemos vaporware** e **sempre falamos a língua do cliente certo**."