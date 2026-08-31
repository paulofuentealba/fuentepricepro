# PROMPT — Correção Pontual: `assetclass` dinâmico em `fetchNasdaqDividends`
> Copiar e colar no chat `[EXECUÇÃO]` do Antigravity.

## 🛑 MODO DE OPERAÇÃO
Modo de EXECUÇÃO. Item avulso de manutenção (fora do sweep já fechado), motivado por investigação
já validada por mim com chamadas reais à API da Nasdaq: confirmei que `assetclass=stocks` fixo
retorna `"Symbol not exists"` para ETFs Nasdaq-listed (ex.: `QQQ`, `JEPQ`), e que corrigir para
`assetclass=etf` nesses casos resolve — `paymentDate` volta preenchido corretamente.
**Atenção:** esse conserto NÃO resolve tickers NYSE/NYSE Arca (ex.: `SCHD`, `JEPI`, `O`, `BTCI`) —
já testei e a Nasdaq responde `"Dividend History for Non-Nasdaq symbols is not available"`
independente do `assetclass`. Não prometa cobertura maior do que essa no changelog/commit.

## ITEM ÚNICO — `assetclass` dinâmico baseado em `asset.type`

**Arquivo:** `src/lib/api/nasdaq.server.ts` (função `fetchNasdaqDividends`).

**Problema:** a URL é montada com `?assetclass=stocks` fixo, mas a API da Nasdaq exige o
`assetclass` correspondente ao tipo real do ativo (`stocks`, `etf`, `mutualfunds` etc.) — caso
contrário, retorna erro `"Symbol not exists"` e a função devolve `Map` vazio silenciosamente.

**Plano de implementação:**
- Alterar a assinatura de `fetchNasdaqDividends(ticker: string)` para receber também o tipo do
  ativo — investigar a forma menos invasiva de fazer isso: passar `assetType: AssetType` como
  segundo parâmetro (mais simples, sem nova dependência) é a direção preferida, mas confirme se o
  chamador em `apiService.functions.ts` já tem `asset.type` disponível no ponto exato da chamada
  a `fetchNasdaqDividends(raw)` antes de decidir a assinatura final.
- Mapear `AssetType` para o valor de `assetclass` esperado pela Nasdaq: `"ETF"` → `"etf"`;
  qualquer outro tipo não-BR (`STOCK_US`, `REIT`) → `"stocks"`. Não crie um mapeamento genérico
  com mais valores do que o necessário — só os que hoje aparecem em ativos não-BR neste projeto.
- Atualizar o chamador em `apiService.functions.ts` (bloco `// Enrich paymentDate for US Nasdaq
  stocks...`) para passar `asset.type` junto.
- Adicionar teste cobrindo especificamente o caso ETF (`assetclass=etf` na URL montada) e o caso
  stock (`assetclass=stocks`), usando mock de fetch — não bater na API real nos testes.
- Não alterar o comportamento de fallback gracioso existente (retorna `Map` vazio em qualquer erro
  de rede/parse) — isso continua correto e não é parte do bug.

**Risco:** baixo — é uma correção isolada de parâmetro de URL, não muda contrato de retorno da
função nem afeta nenhuma tela de estado salvo diretamente (é só enrichment best-effort).

## Roles Governança (Rule 9)

| Role | Engajado? | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | Gate obrigatório padrão |
| fuente-solution-architect | NÃO | Correção de parâmetro isolado, sem decisão arquitetural nova |
| fuente-advogado-lgpd-gdpr | NÃO | Não toca dado pessoal |
| fuente-product-manager | NÃO | Item de manutenção técnica pontual, não requer priorização de produto |
| Demais roles | NÃO | Sem impacto em UX visível, negócio, ou rigor de dado exibido — é puro enrichment de campo já existente |

## Gates de Verificação (obrigatórios, output literal)

1. `npx tsc --noEmit`
2. `npm run test`
3. `npm run build`

Traga o diff completo (`git diff src/`) junto com os 3 gates antes de eu aprovar o commit.
