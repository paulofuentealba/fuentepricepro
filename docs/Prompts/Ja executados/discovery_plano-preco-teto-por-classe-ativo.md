# Calibração de Preço-Teto por Classe de Ativo — Avaliação & Plano de Ação
## Fuente Price Pro — Insumo para Épico 2 (Intelligence)

**Papéis exercidos:** `fuente-solution-architect` (desenho), `fuente-investidor-profissional` (rigor), `fuente-product-manager` (priorização)
**Data:** 2026-08-15

---

## Governança de Roles (Regra 9)

| Role | Engajado? | Papel |
|---|---|---|
| `fuente-solution-architect` | ✅ | Onde a lógica vive, contrato de dados, SSOT |
| `fuente-investidor-profissional` | ✅ | Teste de credibilidade institucional das fórmulas |
| `fuente-product-manager` | ✅ | Classificação de esforço e sequenciamento |
| `fuente-advogado-lgpd-gdpr` | ⚪ | Não se aplica — nenhum dado pessoal novo, só dado de mercado/premissa |
| `fuente-ux-designer` | ⚪ | Fica para quando houver protótipo de UI dos novos inputs (não é ainda) |
| `fuente-architecture-review` | ⚪ | Gate do plano formal — entra depois deste documento ser aprovado |
| Demais roles | ⚪ | Não aplicável nesta etapa (é engenharia de fórmula, não copy/marketing/onboarding) |

---

## 1. Opinião — Vale a Pena?

**Sim, com uma ressalva estrutural importante.** A proposta é exatamente o que separa uma ferramenta "varejo" de uma "institucional" (critério do `fuente-investidor-profissional`, Seção 2): hoje o Fuente já tem Bazin/Graham/Gordon genéricos — essa proposta os **especializa por classe de ativo**, que é precisamente a lacuna que nenhum concorrente (StatusInvest, Investidor10, Snowball) cobre de forma unificada BR+US. É um reforço direto do moat já mapeado no projeto.

**A ressalva:** isso não é uma feature nova — é uma **evolução da SSOT financeira** (`src/lib/calculations.ts`). Se implementado errado, multiplica o risco que a Regra 4 do `AGENTS.md` existe para prevenir: cada classe de ativo virando uma "fórmula solta" espalhada pelo código é o oposto do que queremos. A arquitetura correta é **um dispatcher por `assetClass` dentro do SSOT existente**, não 5 motores paralelos.

**Veredito (`fuente-investidor-profissional`):**
- **Passaria no Teste de Credibilidade Institucional?** Parcial hoje → Sim, se implementado com a transparência de inputs que a persona exige (nunca "número mágico" — cada fórmula precisa expor Fonte | Data | Fórmula | Peso).
- **Gancho de Conversão para Pro:** Forte. Consenso calibrado por classe de ativo é exatamente o tipo de rigor que faz um profissional trocar a planilha própria pelo Fuente.
- **Risco de Perda deste Perfil:** se as fórmulas novas forem implementadas como "caixa-preta" (sem mostrar `g`, `r`, spread sobre NTN-B/Treasury, etc. como editável), o profissional não confia e não indica.

---

## 2. Onde Isso Vive na Arquitetura (SSOT)

Hoje `getAssetValuation(asset, method)` já recebe `asset` (que carrega `type`/`assetClass`). A extensão correta:

```typescript
// src/lib/calculations.ts — extensão do SSOT existente, não arquivo novo paralelo

type AssetClass = 'STOCK_BR' | 'STOCK_US' | 'FII' | 'FI_AGRO' | 'FI_INFRA' | 'REIT' | 'ETF';

// Dispatcher — cada classe usa seu próprio conjunto de fórmulas,
// mas todas passam pelo MESMO ponto de entrada e MESMO contrato de saída.
function getAssetValuation(asset: Asset, method: ValuationMethod): ValuationResult {
  switch (asset.assetClass) {
    case 'STOCK_BR':   return valuateStockBR(asset, method);   // Gordon, Bazin JCP líquido, Graham, DDM 2 estágios
    case 'STOCK_US':   return valuateStockUS(asset, method);   // Total Shareholder Yield, Gordon multi-estágio, FCFE, PEG
    case 'FII':
    case 'FI_AGRO':
    case 'FI_INFRA':   return valuateFundoImobiliario(asset, method); // Bazin spread NTN-B, Gordon inflacionário, Cap Rate, P/VP dinâmico
    case 'REIT':        return valuateREIT(asset, method);      // AFFO Yield, DDM AFFO, NAV, spread Treasury 10y
    case 'ETF':          return valuateETF(asset, method);       // Bogle, Bazin DY histórico, ERP, Shiller PE
  }
}
```

**Por que dispatcher e não 5 arquivos soltos:** garante que `useValuedPortfolio` continue sendo o único consumidor de estado salvo (Regra 4 intacta), e que o **contrato de saída** (`ValuationResult` — inputs, fórmula, peso, fonte, data) seja idêntico entre classes, mesmo que o cálculo interno varie. Isso é o que o `fuente-investidor-profissional` exige na Seção 2 do seu framework: "toda métrica auditável", independente de qual das 20 fórmulas foi usada.

**Consenso (`Fuente Consensus`):** hoje é mediana entre métodos. Com múltiplas fórmulas por classe, o consenso passa a ser **mediana dos métodos aplicáveis àquela classe especificamente** — não todos os métodos genéricos. Isso já é uma mudança de comportamento que precisa de ADR (é decisão 🟡/🔴 pelo framework do `fuente-solution-architect`).

---

## 3. O Que Pode Ser Calculado Automaticamente

A regra geral: **tudo que já vem de fonte externa confiável e objetiva** (CVM, SEC EDGAR, Yahoo, Brapi, BACEN/Tesouro) deve ser automático — nunca pedir ao usuário o que o sistema já sabe buscar.

| Dado | Fonte já existente no projeto | Classe(s) que usa |
|---|---|---|
| DY histórico, proventos pagos (Dividendos/JCP brutos) | Brapi / dados de corretora já importados | Ações BR, ETFs BR |
| LPA, VPA, ROE, Payout | CVM `INF_TRIMESTRAL` | Ações BR, Graham |
| EPS, BVPS, Piotroski F-Score | SEC EDGAR XBRL | Stocks US |
| FFO/AFFO reportado (quando a empresa divulga) | SEC EDGAR XBRL (campos de real estate) | REITs |
| Selic, IPCA, NTN-B (yield da curva) | BACEN | Bazin Spread NTN-B (FIIs/Fi-Infra/Fi-Agro) |
| US Treasury 10 anos | Fonte a adicionar (ver Gap 1 abaixo) | REITs |
| Recompras de ações (buybacks) reportadas | SEC EDGAR (10-Q/10-K, já que XBRL cobre) | Total Shareholder Yield (Stocks US) |
| Vacância física, NOI, receita de locação (FIIs de tijolo) | CVM `INF_TRIMESTRAL` de FIIs (parcial — ver Gap 2) | Cap Rate Reverso |
| P/L e P/VP histórico do índice (para ETFs) | Fonte a adicionar (ver Gap 3) | Shiller PE, Bogle |
| Retenção 15%/30% (JCP/Withholding) | Já implementado (regra fiscal fixa, não input) | Ações BR / Stocks US |
| Repasse inflacionário contratual (IPCA/IGP-M) | Índice já disponível via BACEN — mas **qual índice usar por ativo é dado do contrato do fundo**, não universal (ver Seção 4) | FIIs de Tijolo/Fi-Infra |

**Gaps de fonte a resolver antes de automatizar 100%:**
1. **US Treasury 10y** — não está no pipeline de 8 fontes hoje. Precisa de uma fonte adicional (ex: FRED API, gratuita e confiável, mesmo padrão de fontes públicas já usado).
2. **NOI/vacância de FIIs de tijolo** — CVM `INF_TRIMESTRAL` traz dado financeiro consolidado, mas nem sempre segrega NOI de forma limpa por fundo; pode exigir parsing adicional do relatório gerencial (fora do escopo automatizável 100% no curto prazo — marcar como "estimado" com badge, seguindo o padrão anti-suavização-silenciosa do `fuente-investidor-profissional`).
3. **P/L e P/VP histórico do índice** (para Shiller PE, Bogle) — não é dado de ativo individual, é dado de índice (ex: IBOV, S&P500). Precisa de série histórica própria — Brapi/Yahoo podem servir para nível atual, mas série de 10+ anos para CAPE pode exigir fonte dedicada.

---

## 4. O Que Precisa Ser Pedido ao Usuário (Premissas, Não Dados de Mercado)

Seguindo o padrão de mercado já adotado (Regra do `fuente-investidor-profissional`: "Controle de premissas... tudo ajustável, versionado, persistido"), o usuário **não fornece dado de mercado** (isso é sempre automático) — ele ajusta **premissas de julgamento** que não têm resposta objetiva única:

| Premissa | Por que não é automatizável | Classe(s) |
|---|---|---|
| **Taxa de desconto `r`** (prêmio de risco sobre Selic/Treasury) | É escolha de perfil de risco do investidor, não fato de mercado | Todas (Gordon) |
| **Yield alvo do Bazin** (tradicional 6%, mas "ajustável ao objetivo") | Já é doc explícita como ajustável — depende do objetivo pessoal | Ações BR, ETFs de dividendo |
| **`g_curto` e `g_longo`** no DDM 2 estágios | Projeção de crescimento é julgamento, não dado histórico puro (mesmo com histórico como referência) | Ações BR em expansão |
| **Spread sobre NTN-B/Treasury** (ex: 1,5%–2,5% Fi-Infra vs 2,5%–4,0% Papel) | O documento já dá faixas — o ponto exato dentro da faixa é decisão de risco do usuário por tipo de crédito do fundo | FIIs/Fi-Agro/Fi-Infra, REITs |
| **Desconto sobre NAV aceito** (5%–15% em juros altos) | Depende do apetite de entrada do investidor no ciclo atual | REITs |
| **Índice de repasse contratual** (IPCA vs IGP-M) **por ativo específico** | Isso, tecnicamente, **é dado de mercado** (está no contrato do fundo) — mas não está estruturado em nenhuma fonte automatizável hoje. Curto prazo: pedir ao usuário como metadado do ativo (uma vez, não recorrente). Médio prazo: mapear manualmente os FIIs mais líquidos numa tabela de referência interna. | FIIs de Tijolo/Fi-Infra |
| **Margem de segurança Graham** | Documento já cita "ajustada" — variação de tolerância do investidor | Ações BR deep value |
| **Classificação do FII/REIT** (Tijolo vs Papel vs Híbrido) | Não é sempre trivial de derivar 100% automaticamente do CNPJ/ticker — pode precisar de confirmação pontual na primeira vez que o ativo entra na carteira | FIIs, REITs |

**Princípio de UX que decorre disso (para quando `fuente-ux-designer` for engajado depois):** toda premissa deve ter um **valor-padrão sugerido pelo próprio documento fornecido** (ex: Bazin 6%, spread 1,5%–2,5%), e o usuário só precisa mexer se discordar — nunca uma tela em branco pedindo 8 números antes de mostrar qualquer preço-teto.

---

## 5. Plano de Ação (Sequenciado)

Este plano **não substitui** a priorização atual do roadmap (Fase 0 instrumentação → Fase 1 Stripe → Fase 2 fiscal cross-border → Fase 4 retenção). Ele é **insumo específico para o Épico 2 (Intelligence)**, hoje em 0%, e deve ser sequenciado dentro dele — não compete com Fase 0/1 que já estão em andamento/priorizadas.

| Fase | Escopo | Esforço relativo | Depende de |
|---|---|---|---|
| **2.0 — ADR do dispatcher de valuation por classe** | Formalizar a extensão do SSOT (Seção 2 acima) como ADR em `docs/architecture/adrs/`. Definir contrato `ValuationResult` único para todas as classes. | Pequeno (documento) | Nenhuma — pode começar já |
| **2.1 — Ações BR (Gordon + Bazin JCP líquido + Graham ajustado)** | Maior cobertura de dado já disponível (CVM completo). Prioridade 1 por ser o núcleo atual da base de usuários. | Médio | 2.0 |
| **2.2 — FIIs/Fi-Agro/Fi-Infra (Bazin Spread NTN-B + Gordon inflacionário)** | Segunda prioridade — já há dado CVM parcial, BACEN já integrado para Selic/IPCA. Cap Rate Reverso fica para depois (depende do Gap 2 de NOI). | Médio-Alto | 2.0, resolução parcial do Gap 2 (NOI) |
| **2.3 — Stocks US (Total Shareholder Yield + Gordon multi-estágio + FCFE)** | SEC EDGAR já integrado — bom terreno. Buybacks via XBRL precisam de mapeamento de campo específico. | Médio | 2.0 |
| **2.4 — REITs (AFFO Yield + DDM AFFO + NAV + Spread Treasury)** | Depende do Gap 1 (Treasury 10y) — resolver fonte antes de iniciar. | Médio-Alto | 2.0, Gap 1 |
| **2.5 — ETFs (Bogle + Bazin DY histórico + ERP + Shiller PE)** | Mais complexo por depender de série histórica de índice (Gap 3) — deixar por último, é o que menos diferencia o produto no curto prazo (usuário PF de ETF é menos denso em uso do Fuente hoje). | Alto | 2.0, Gap 3 |
| **2.6 — UI de Premissas Ajustáveis + Badge de Auditoria (Simples/Avançado)** | Ver Seção 7 (atualizada) — frontend só exibe o que o backend já decidiu; nenhuma lógica de default/preset/rótulo vive no cliente. | Médio | `fuente-ux-designer` (concluído — ver Seção 7), 2.0 |

**Classificação de prioridade (`fuente-product-manager`):** dentro do Épico 2, a sequência 2.1 → 2.3 → 2.2 → 2.4 → 2.5 reflete volume de usuário atual (BR e US stocks são o núcleo hoje) e disponibilidade de dado (menos gaps de fonte = menos bloqueio). FIIs poderia empatar com Stocks US em prioridade de negócio — mas fica atrás por depender de resolução de gap de dado (NOI), que é trabalho de descoberta antes de codar.

---

## 6. O Que NÃO Fazer (Riscos a Evitar)

- **Não** criar 5 arquivos de cálculo paralelos (`calculationsBR.ts`, `calculationsUS.ts`, etc.) — quebra Regra 4 (SSOT) e Regra 1 (reusabilidade) do `AGENTS.md`. O dispatcher dentro de `calculations.ts` é o desenho correto.
- **Não** implementar nenhuma fórmula nova com premissa fixa "hardcoded" (ex: spread sempre 2%) — todas as faixas do documento são **padrão sugerido, não valor fixo**, conforme exigido pelo `fuente-investidor-profissional`.
- **Não** avançar para 2.4/2.5 (REITs/ETFs) sem resolver os Gaps de fonte primeiro — implementar com dado "chutado" quebra a regra de zero-suavização-silenciosa e é pior que não ter a feature.
- **Não** tratar isso como trabalho isolado de fórmula — cada nova classe implica em `i18n` (rótulos das fórmulas em 3 idiomas), export CSV (novas colunas), e Consenso recalculado — sempre revisar as 9 regras de ouro por fase, não só a Regra 4.

---

## 7. UI de Premissas — Simples/Avançado (Backend = Inteligência, Frontend = Exibição)

**Princípio arquitetural não-negociável desta fase (confirmado por Paulo):** toda decisão de "qual é o valor padrão", "qual preset aplicar", "como nomear a premissa para o usuário", e "qual badge de confiança mostrar" é **inteligência**, e inteligência vive no backend/domain layer — nunca no componente React. O frontend recebe um DTO já pronto e decide apenas **como desenhar** o que recebeu.

### 7.1 Onde cada responsabilidade vive

| Responsabilidade | Camada | Por quê |
|---|---|---|
| Calcular valor-padrão de `r`, spread, yield-alvo, `g` por classe/preset | **Backend** (`calculations.ts`, dentro do dispatcher da Seção 2) | É lógica financeira — mesma regra que já rege Bazin/Graham/Gordon (Regra 4 SSOT). Se o frontend calculasse isso, seria a mesma violação de "reimplementar fórmula fora do SSOT" já mapeada como risco no projeto. |
| Aplicar preset (Conservador/Moderado/Arrojado) a todos os ativos da carteira | **Backend** | Envolve iterar a carteira inteira e recalcular consenso — dado derivado, não decisão de UI. |
| Rótulo em linguagem de resultado ("Retorno mínimo que você exige") em vez de nome técnico ("Taxa de desconto r") | **Backend** (i18n strings resolvidas no DTO, ou dicionário i18n referenciado por chave que o backend indica) | Rótulo correto por premissa/classe/idioma é regra de negócio de conteúdo, não estilo visual — mantém Regra 2 (i18n zero-hardcode) e evita o frontend "adivinhar" qual texto usar por classe de ativo. |
| Badge de confiança (`●●●○`) e explicação de "por que esse número" | **Backend calcula o score; frontend só renderiza os pontos** | O *cálculo* de confiança (qualidade dos inputs, dado estimado vs reportado) é lógica de domínio já existente (`isEstimated`, badge de qualidade). O frontend não decide "quantos pontos" — só pinta o que veio pronto. |
| Toggle Simples/Avançado (mostrar/esconder sliders) | **Frontend** | Puro estado de exibição — nenhuma regra de negócio, nenhum recálculo. |
| Persistir preferência do usuário (Simples vs Avançado, último preset escolhido) | **Backend** (Firestore, campo de preferência do usuário) — frontend só lê/escreve via hook, nunca decide o valor default sozinho | Consistente com o padrão já usado para outras preferências do usuário no projeto. |
| Animação, glass, tokens de espaçamento, tap targets, bottom sheet | **Frontend** | UX pura — Seção 2 do `fuente-ux-designer`. |

### 7.2 Contrato de dados — extensão do `ValuationResult`

```typescript
// Backend decide TUDO sobre a premissa. Frontend só recebe e exibe.
interface ValuationAssumption {
  key: string;                    // ex: 'discountRate', 'ntnBSpread'
  label: string;                  // JÁ resolvido em linguagem de resultado, no idioma ativo
  helperText: string;             // Frase pronta: "Assumimos 10% ao ano, típico para..."
  value: number;                  // valor efetivo aplicado (default OU customizado pelo usuário)
  isCustomized: boolean;          // backend sabe se é default ou override do usuário
  suggestedRange: { min: number; max: number }; // faixa do documento, já resolvida por classe
  confidenceBadge: 1 | 2 | 3 | 4; // score já calculado — frontend só pinta ●●●○
}

interface ValuationResult {
  // ...campos já existentes (preço-teto, fonte, data, fórmula)
  assumptions: ValuationAssumption[]; // tudo pronto para o Modo Avançado renderizar direto
  investorProfile: 'conservative' | 'moderate' | 'aggressive' | 'custom'; // já resolvido pelo backend
}
```

O componente React do Modo Avançado, portanto, é **puramente um `.map()` sobre `assumptions`** — zero `if` de negócio, zero cálculo, zero decisão de rótulo. Isso também facilita testes: qualquer bug de "número errado" é sempre bug de backend/domain, nunca de componente — elimina a ambiguidade de onde investigar quando algo diverge (já foi problema real no projeto — ex: "Ceiling Price R$ 0,00 vs Fuente Consensus R$ 49,24").

### 7.3 Fluxo de edição de premissa (Modo Avançado)

```
Usuário move slider → Frontend envia { key, newValue } ao backend →
Backend recalcula ValuationResult completo (novo preço-teto, novo confidenceBadge, isCustomized: true) →
Frontend substitui o DTO em cache (TanStack Query) → Re-render
```

**Nunca** o frontend recalcula o preço-teto localmente para dar feedback "instantâneo" — isso duplicaria a fórmula no cliente (viola Regra 4 outra vez, mesmo que pareça só "otimização de UX"). Se a latência do round-trip for um problema real de percepção, a solução é debounce + skeleton no valor durante o recálculo — não uma segunda implementação da fórmula no cliente.

---

## Próximo Passo

Se aprovado, a Fase 2.0 (ADR do dispatcher) é o único item que pode começar imediatamente sem tocar código de produção — é puramente definição de contrato. As fases seguintes entram no `BACKLOG_V2.md` como itens do Épico 2, sequenciadas conforme a tabela acima, cada uma virando um plano formal (Regra 8) e prompt numerado para Antigravity quando chegar sua vez.
