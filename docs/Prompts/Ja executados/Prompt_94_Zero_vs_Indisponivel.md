# Prompt 94 — [EXECUÇÃO] Padronizar exibição de "indisponível" em vez de zero para dado de valuation ausente
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 Modo de operação

Você tem permissão para alterar código nesta rodada, dentro do escopo abaixo. **Atenção
especial:** este prompt toca perto de `src/lib/calculations.ts` (SSOT financeiro, Regra 4)
sem necessariamente precisar alterá-lo — leia a Seção 3(c) antes de tocar em qualquer
arquivo. Classificação (`fuente-product-manager`): **🟠 Bug Não-Crítico**, mas com risco de
decisão errada por leitura ambígua de dado — não é "nice to have".

---

## 1. Contexto

Achado 1.3 e Seção 3 ("Padrões recorrentes") da Auditoria UX de 14/08/2026: no Radar Global,
tickers sem valuation calculável mostram `+0.0%` de margem e `0,0%` de DY em vez de um
estado explícito ("dado insuficiente"). **Zero é um valor com significado** (ativo
exatamente no preço-teto) — reutilizá-lo como "não calculado" é ambíguo para os três
perfis de usuário: o iniciante pode achar que é o preço justo real, o profissional não
confia no número sem saber se é zero de verdade ou ausência de dado.

---

## 2. Investigação obrigatória ANTES de qualquer fix (não pule esta etapa)

Determine **em qual camada** o zero é produzido, e reporte isso **antes** de escrever
qualquer linha de correção:

- **Camada A — `getAssetValuation` em `calculations.ts` retorna `0` literal** quando um
  método não é computável (ex: falta EPS/BVPS para Graham). Se for este o caso: **PARE.**
  Isso é uma mudança na SSOT financeira (Regra 4), não uma formatação de display — precisa
  de sinal verde explícito de Paulo/Claude antes de tocar em `calculations.ts`, e
  provavelmente se conecta à decisão em aberto do Prompt 90 (aplicabilidade de Graham a
  FIIs/ETFs, que é decisão de modelagem do Paulo, não do agente). Não prossiga sem essa
  confirmação — reporte o achado e aguarde.
- **Camada B — o zero é um fallback de display** (`?? 0`, `|| 0`, `: 0`) aplicado depois
  que `getAssetValuation`/`useValuedPortfolio` já retornou `null`/`undefined`/`NaN` para o
  método não-computável. Se for este o caso (mais provável, mas **confirme, não presuma**):
  prossiga com o plano abaixo.

---

## 3. Plano de Implementação Obrigatório (Regra 8) — só preencher após a investigação da Seção 2

**(a) Arquivos:**
- Componente(s) do Radar Global que renderizam Margem/DY (grep por onde a tela consome
  `useValuedPortfolio`/`getAssetValuation` e formata o resultado)
- `src/lib/formatters.ts` — adicionar (ou confirmar se já existe e só não é usado aqui) uma
  função central `formatPercentOrUnavailable(value: number | null | undefined): string` —
  Regra 1: se já existe função equivalente em outro nome, reusar/consolidar, não duplicar.
- Varredura das demais telas que exibem margem/DY/valuation (Home, Minha Carteira, Radar de
  Risco, Screener, Comparador) para aplicar o mesmo formatter onde o mesmo padrão de zero
  ambíguo ocorrer — reportar quais telas foram verificadas e quais não, mesmo que o fix não
  seja necessário em todas.
- Chaves i18n novas em `src/lib/i18n/{pt-BR,en,es}/*` para o texto "indisponível"/
  "unavailable"/"no disponible" — Regra 2, nas 3 locales, sem exceção.

**(b) Lógica central:**
- `formatPercentOrUnavailable` recebe `null`/`undefined`/`NaN` e retorna um placeholder —
  **não** a palavra completa em tabelas densas (Radar Global, Radar de Risco): use travessão
  "—" consistente com `tabular-nums`, para não quebrar alinhamento de coluna numérica (ver
  `fuente-ux-designer`, densidade de informação). Reserve o texto completo
  ("Dado insuficiente") para tooltip/detalhe expandido, não para a célula da tabela.
- Não alterar `calculations.ts` nesta rodada (a menos que a Camada A da Seção 2 tenha sido
  confirmada e explicitamente aprovada por Paulo/Claude fora deste prompt).

**(c) Pontos de Atenção & Decisões de Arquitetura (risco → decisão):**
- **Risco:** confundir "método não aplicável ao tipo de ativo" (ex: Graham para ETF — nunca
  vai ter valor) com "método aplicável mas dado externo faltou hoje" (ex: Brapi fora do ar).
  **Decisão:** se a distinção já existe em algum lugar do código (dois estados diferentes),
  preserve-a no formatter — não colapse os dois em um único "—" genérico se a informação de
  causa já está disponível; se não existe essa distinção hoje, reporte como limitação
  conhecida, não invente um terceiro estado sem confirmação.
- **Risco:** mudança de layout/largura de coluna ao trocar "0,0%" (5 caracteres) por "—"
  (1 caractere) em tabelas densas.
  **Decisão:** manter largura de coluna fixa via CSS, não deixar o layout "pular".

---

## 4. Governança de Roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | Sim | Gate obrigatório, especial atenção à fronteira com Regra 4 |
| `fuente-solution-architect` | Sim | Decidir em qual camada o zero é produzido (Seção 2) é decisão de arquitetura, não estética |
| `fuente-ux-designer` | Sim | Densidade de tabela, placeholder consistente, tabular-nums |
| `fuente-investidor-iniciante` | Sim | Zero lido como "preço justo real" é exatamente o tipo de ambiguidade que confunde este perfil |
| `fuente-investidor-profissional` | Sim | Ambiguidade de zero-vs-ausente é o tipo de detalhe que mina confiança institucional |
| `fuente-advogado-lgpd-gdpr` | Não | Dado de mercado, sem dado pessoal |
| `fuente-business-architect` / `fuente-product-marketing` | Não | Sem mudança de capacidade/posicionamento |

---

## 5. Gates de Verificação Final (rodar do zero, colar output literal)

```bash
npx tsc --noEmit
npm run test
npm run build
```

---

## 6. Honestidade de execução

O relatório de conclusão **deve** abrir com a resposta da investigação da Seção 2 (Camada A
ou B, com evidência — trecho de código, não afirmação solta). Se a resposta for "Camada A",
o relatório para aí, sem fix aplicado, aguardando decisão. Liste também a tabela de telas
verificadas vs. não verificadas do item (a).

---

## 7. Entregável

Se Camada B confirmada: commit único `fix(formatting): show unavailable instead of zero for
missing valuation data [Auditoria UX 1.3 + Padrão 3]`, push para `dev`. Se Camada A: **sem
commit**, só o relatório de investigação para decisão de Paulo/Claude.
