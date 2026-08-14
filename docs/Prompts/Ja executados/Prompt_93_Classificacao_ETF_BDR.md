# Prompt 93 — [EXECUÇÃO] Corrigir classificação de ETF/BDR (família BIVB39) + fechar dívida de teste de regressão do Prompt 86
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 Modo de operação

Você tem permissão para alterar código nesta rodada, dentro do escopo abaixo. Classificação
(`fuente-product-manager`): **🟠 Bug Não-Crítico com Reach alto** — não derruba a tela, mas
exibe dado de classificação incorreto para qualquer BDR de ETF na base, com dado **real**
(não mock). Origem: Auditoria UX de 14/08/2026, achado **1.3**, e item de dívida técnica já
registrado (Prompt 86: "regressão em aberto — sem teste automatizado para a ordem `.SA`
antes de REIT").

---

## 1. Contexto

Com dado ao vivo da Brapi, o ticker **BIVB39** ("Ishares Core S&P 500 Etf") apareceu no
Radar Global (`/app/globalradar`) com `Tipo: Ação` e `Setor: N/A`. É a **mesma família** do
bug de classificação FII/REIT já corrigido nos Prompts 86/89 (ordem de checagem `.SA` antes
de REIT) — aqui o padrão que falha é o sufixo `39` (BDR de ETF na nomenclatura B3), que está
caindo no fallback de "Ação" em vez de ser reconhecido como ETF/BDR.

Adicionalmente, o Prompt 86 já deixou uma dívida registrada: **não existe teste automatizado**
cobrindo a ordem de classificação `.SA`-antes-de-REIT que foi corrigida naquela rodada. Esta
rodada fecha as duas coisas juntas porque são o mesmo componente/função e o mesmo tipo de
regressão.

**Fora de escopo aqui:** `Margem +0.0%` e `DY 0,0%` aparecendo simultaneamente para tickers
sem valuation calculável (DIVO11, BIVB39, NDIV11) é um problema **separado** de exibição de
"zero vs. indisponível" — tratado no **Prompt 94**. Não misture os dois fixes neste commit,
mesmo que apareçam nos mesmos tickers na tela.

---

## 2. O que corrigir

1. Localizar a função canônica de classificação de tipo de ativo por sufixo de ticker B3
   (buscar por termos como `classifyAsset`, `getAssetType`, `.SA`, `REIT`, sufixos `11`/`34`/
   `39` — não presuma o nome do arquivo, confirme via grep em `src/lib/`).
2. Adicionar o caso do sufixo `39` (BDR de ETF) como tipo reconhecido — **antes** do fallback
   genérico de "Ação" — seguindo o mesmo padrão de correção de ordem usado no fix `.SA`
   antes de REIT.
3. Confirmar que `Setor` para esse tipo de ativo não cai em `N/A` só por falta de mapeamento
   — se o dado de setor genuinamente não existe para ETFs (não é bug, é ausência de dado
   real), isso deve aparecer como "indisponível" e não como bug de classificação — mas
   **isso também é escopo do Prompt 94**, não deste.
4. Fechar a dívida do Prompt 86: escrever teste de regressão cobrindo explicitamente a
   **ordem** de checagem (não só o resultado final) para os casos já corrigidos.

---

## 3. Plano de Implementação Obrigatório (Regra 8)

**(a) Arquivos:**
- Função de classificação (localizar via grep — reportar o caminho exato encontrado antes
  de editar, não presuma)
- Arquivo de teste correspondente (criar se não existir, ex: `assetClassification.test.ts`)
- Se a mesma lógica estiver duplicada em mais de um lugar (ex: uma cópia usada só pelo Radar
  Global e outra usada pelo `Watchlist.tsx`/`src/components/ceiling/watchlist/`), **isso é
  achado de Regra 1 (reusabilidade)** — reporte a duplicação e proponha consolidação em uma
  única função antes de aplicar o fix duas vezes.

**(b) Lógica central:**
- Tabela de sufixos B3 reconhecidos deve ficar explícita e documentada em comentário no
  próprio arquivo (ex: `11` = FII/Unit, `34` = BDR de ação, `39` = BDR de ETF, `.SA` = ação
  listada B3) — não só um `if/else` disperso. Isso existe para que o **próximo** sufixo mal
  classificado (haverá um, é o terceiro caso desta família) seja fácil de localizar e
  corrigir sem repetir a investigação do zero.
- Sem alteração em `src/lib/calculations.ts` — classificação de tipo de ativo não é
  valuation (Regra 4 não se aplica à função em si, mas o resultado da classificação
  alimenta qual método de valuation se aplica — não confunda as duas responsabilidades no
  mesmo commit).

**(c) Pontos de Atenção & Decisões de Arquitetura (risco → decisão):**
- **Risco:** corrigir a ordem de checagem pode reclassificar ativos que hoje estão
  (coincidentemente) corretos por outro caminho do código.
  **Decisão:** antes de alterar, capture um snapshot da classificação atual de **todos** os
  tickers presentes nas fixtures de teste + no Radar Global ao vivo (screenshot ou dump de
  `Tipo`/`Setor` por ticker); depois do fix, faça o diff — qualquer mudança não-intencional
  deve ser reportada, não só as intencionais.
- **Risco:** a mesma família de bug provavelmente tem um terceiro caso ainda não descoberto
  (ex: sufixo `12`/BDR-Unit ou outro padrão B3 raro).
  **Decisão:** não é escopo caçar todos — mas documente na tabela do item (b) quais sufixos
  foram **verificados como corretos** e quais **não foram testados** (honestidade de
  cobertura, mesmo padrão exigido no sweep de código do Antigravity).
- **Risco:** teste de regressão do Prompt 86 nunca foi escrito — se ao escrevê-lo agora ele
  **falhar** com o código atual (antes do fix do BDR), isso confirma que o fix de 86/89 tem
  um furo que não foi pego na época.
  **Decisão:** rode o teste novo **antes** do fix desta rodada também, para saber se está
  testando o comportamento certo, e reporte o resultado de antes e depois.

---

## 4. Governança de Roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | Sim | Gate obrigatório |
| `fuente-solution-architect` | Sim | Verificar se a lógica de classificação está duplicada entre Radar Global e Watchlist (Regra 1) |
| `fuente-investidor-profissional` | Sim | Classificação de ativo incorreta mina credibilidade institucional — mesmo critério citado na Auditoria UX |
| `fuente-product-manager` | Sim | Classificação e priorização do item |
| `fuente-ux-designer` | Não | Sem mudança visual nova nesta rodada — a superfície (Radar Global) já existe, só o dado muda |
| `fuente-investidor-iniciante` | Não | Classificação de tipo de ativo não é ponto de fricção citado para este perfil |
| `fuente-advogado-lgpd-gdpr` | Não | Dado de mercado público, sem dado pessoal envolvido |
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

Reporte a tabela de sufixos verificados (item 3c) e o diff de classificação antes/depois
para **todos** os tickers de teste — uma varredura parcial e declarada é aceitável, uma que
finge ser completa não é. Cole o output literal dos gates, não resuma como "tudo passou".

---

## 7. Entregável

Commit único: `fix(classification): recognize BDR ETF suffix 39 + regression tests [Auditoria UX 1.3 + dívida Prompt 86]`.
Push para `dev`. Atualizar `BACKLOG_V2.md` fechando o item de dívida do Prompt 86 e
`PROMPTS_LOG.md` com o resultado desta rodada.
