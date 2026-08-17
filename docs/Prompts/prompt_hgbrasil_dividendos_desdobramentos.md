# PROMPT — Integração HG Brasil: Dividendos e Desdobramentos
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior especializado em integração de dados
financeiros. Apresente PLANO (Regra 8) antes de qualquer código — esta
tarefa tem uma parte de baixo risco (dividendos, fonte nova) e uma parte
de ALTO risco (desdobramentos, porque mexe em quantidade/preço médio
derivado do ledger, que é SSOT). Trate as duas com rigor diferente.

CONTEXTO:
Paulo assinou um plano pago da HG Brasil (2 anos de histórico + datas de
pagamento de dividendos). Já existe um script de investigação anterior em
scripts/validate-bolsai-hgbrasil.ts, com a env var HGBRASIL_API_KEY já
nomeada — investigue o que esse script já validou antes de desenhar do
zero.

ESCOPO — PARTE 1: Dividendos (risco baixo/médio)
- Criar src/lib/api/hgBrasil.server.ts seguindo o MESMO padrão de
  taxonomia de erro/observability já usado nas 9 fontes existentes
  (Brapi, Yahoo, SEC EDGAR, CVM, BACEN, Nasdaq, FRED — PASSED/FAILED/
  ERROR/INVALID/WARNING/SKIPPED). Não inventar padrão novo.
- Endpoint de dividendos da HG Brasil: buscar payment_date, valor, tipo
  (dividendo/JCP) por ticker BR.
- Adicionar HGBRASIL_API_KEY ao .env.example com comentário explicando o
  que quebra sem ela (mesmo padrão do comentário já existente para
  BRAPI_TOKEN).
- DECISÃO QUE PRECISA DE APROVAÇÃO ANTES DE CODAR: hoje, de onde vem o
  dado de dividendo usado no Bazin/histórico (Brapi? CVM?)? A HG Brasil
  vai SUBSTITUIR essa fonte, ou vai ser um fallback/enriquecimento
  (ex: preencher payment_date quando a fonte atual não tem)? Apresente as
  duas opções com trade-off no plano — não decida sozinho qual fonte tem
  prioridade quando os dados divergem.

ESCOPO — PARTE 2: Desdobramentos (ALTO risco — SSOT)
- Endpoint de desdobramentos/splits da HG Brasil.
- Desdobramento afeta diretamente recalculateHoldingFromTransactions
  (em transactionsLogic.ts) — quantidade e preço médio de posições
  compradas ANTES do split precisam ser ajustados retroativamente, ou o
  histórico de transações precisa ganhar um evento sintético de split.
- PARE antes de implementar e apresente no plano: qual das duas
  estratégias você propõe (ajuste retroativo silencioso vs. evento
  explícito no ledger), com o trade-off de auditabilidade de cada uma.
  Isso é decisão de modelagem financeira — não decida sozinho (regra do
  projeto: "no autonomous decisions on financial modeling").
- Não aplique nenhum ajuste de split em dado real de usuário sem essa
  decisão estar confirmada por escrito.

PROIBIDO:
- Sobrescrever silenciosamente o dado de dividendo já existente sem a
  decisão de prioridade de fonte estar resolvida.
- Aplicar qualquer lógica de split em transações reais antes da decisão
  de estratégia (retroativo vs. evento) ser aprovada.
- Chamar a API da HG Brasil a partir do cliente — é fonte server-side,
  mesmo padrão das outras 9.

ENTREGA:
Plano primeiro (com as 2 decisões pendentes destacadas) → aguardar minha
aprovação → implementar Parte 1 (Dividendos) em commit próprio → aguardar
aprovação da Parte 2 antes de tocar em Desdobramentos, dado o risco sobre
SSOT. tsc/test/build reais colados a cada commit.
```
