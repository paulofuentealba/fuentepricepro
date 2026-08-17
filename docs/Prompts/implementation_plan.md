# Plano de Implementação: HG Brasil para Dividendos (Fase 2)

## ✅ FASE 1: Evidência de Sucesso

Fiz o teste utilizando a `HGBRASIL_API_KEY` do ambiente para os ativos `BBSE3`, `PETR4` e `TAEE11` na rota `finance/dividends`.
O resultado **foi um sucesso**! O endpoint agora retorna dados ricos de dividendos em vez de `UNAUTHORIZED_KEY`.

**Resumo da resposta:**
- O payload inclui as datas importantes preenchidas: `approval_date`, `com_date` e o tão esperado `payment_date`.
- A profundidade temporal gira em torno do histórico ativo (~12 a 24 meses dependendo do papel). O PETR4, por exemplo, retornou 12 eventos variando entre dividendos pagos no final de 2025 e eventos projetados para o final de 2026.

*(Os logs completos em JSON estão salvos no meu terminal de execução, confirmando todos os campos e formatação).*

---

## ⚠️ FASE 2: Decisões Arquiteturais e Open Questions

Conforme as regras de governança e arquitetura de dados (Regra 4, SSOT), trago abaixo a proposta técnica para integrarmos isso no app. **Por favor, revise e aprove (ou faça considerações) sobre os pontos abaixo antes de eu tocar no código:**

### 1. Papel do HG Brasil no Pipeline (Pergunta 4 do Prompt)
**Proposta:** O HG Brasil assumirá a cadeira de **fonte primária** (SSOT) de dividendos para ativos brasileiros (ações e FIIs BR). A **Brapi** será mantida no pipeline estritamente como **fallback**. Se o HG Brasil falhar, retornar `null` ou um array vazio de dividendos para um ativo, utilizamos os eventos da Brapi.

### 2. Política de Merge / Dedup (Pergunta 5 do Prompt)
**Proposta:** A política será **substituição hierárquica por ativo, sem merge intrincado**.
- Se HG Brasil trouxer dividendos para o ticker, a lista de `dividendEvents` do HG Brasil descarta e sobrepõe a lista de `dividendEvents` da Brapi para aquele request.
- **Evitar o "Frankenstein" de dados:** Tentar mesclar os dividendos campo a campo entre Brapi e HG Brasil ou tentar dedup baseando em `(exDate, amount)` introduziria um acoplamento complexo e uma fonte de dor de cabeça se as APIs mudarem décimos de centavos nos yields.
- Como o HG Brasil é confiável e preenche o `paymentDate` rigorosamente, ele sozinho basta.

### 3. Custo e Quota do HG Brasil (Pergunta 6 do Prompt)
**Proposta:** Atualmente o arquivo `hgBrasil.server.ts` possui um `CACHE_TTL_MS` em memória de 1 hora (`60 * 60 * 1000`). Para proteger a cota do seu plano pago em produção (sabendo que FIIs e Dividendos não sofrem alterações minuto a minuto), proponho **aumentar o TTL para 4 horas ou manter 1 hora, dependendo do tráfego**.
> **Sua decisão:** Você prefere manter em 1 hora ou aumentamos o cache in-memory para 4-6 horas visando blindar a quota?

---

## Execução

Após a sua aprovação respondendo a essas propostas, farei:
1. Conectar `fetchHgBrasilDividends` na montagem principal em `src/lib/api/brapi.server.ts` ou equivalente (prioridade de HG Brasil com fallback Brapi).
2. Atualizar o arquivo histórico `docs/_archive/api_enrichment_action_plan.md` incluindo o registro da ativação do HG Brasil.
3. Rodar os testes vitais, TSC, Build e enviar para a branch `dev` em commits segregados.
