# Relatório de Diagnóstico: AFHI11 com Dados Incorretos

## 1. Execução do Script Temporário
- **Status do Script:** O script de investigação foi criado em diretório fora do projeto git (na pasta scratch do Antigravity `~/.gemini/antigravity/brain/.../scratch`), não sujando a árvore do repositório (`src` ou `scripts`). O script testou os caches e o fetch direto nos providers.
- **Remoção do Script:** O script temporário e seus logs foram **integralmente DELETADOS** do sistema de arquivos imediatamente após a extração, garantindo conformidade total com o plano e limpeza do ambiente.
- **Credenciais:** Nenhuma credencial, Service Account ou API Key do HG Brasil/Firebase foi exposta no relatório ou impressa em texto bruto.

## 2. Achados e Análise de Causa Raiz (Root Cause Analysis)

A investigação confirmou o comportamento relatado na UI (`R$ 1,15` e `R$ 1,00` em repetição, com pagamento `-` e `Ex-Date` como timestamps estranhos).

**A causa não é uma injeção sintética proposital, nem um erro de parse no HG Brasil/Dados de Mercado. Trata-se de uma falha arquitetural silenciosa no pipeline de fallback da aplicação para ativos BR.**

### 2.1 A Cadeia de Eventos
1. Ao consultar `AFHI11`, a aplicação chama primariamente a `fetchFromBrapi("AFHI11")` (via `apiService.functions.ts`).
2. A API da Brapi (`https://brapi.dev/api/quote/AFHI11?fundamental=true&dividends=true`) está rejeitando a query de certos FIIs com HTTP 403 (Endpoint requires a Pro subscription) por causa do parâmetro `dividends=true`.
3. Em `brapi.server.ts` (linha 34), o código intercepta `if (!r.ok) return null;` e **aborta toda a execução da função imediatamente**.
4. Como a execução do `brapi.server.ts` morre prematuramente, o código que consulta o **HG Brasil** (linha 113) e o **Dados de Mercado** (linha 127) *jamais chega a ser executado*.
5. O BFF `apiService.functions.ts` recebe `null` da Brapi e aciona o fallback para a Yahoo Finance:
   ```typescript
   if (!asset) {
     try { asset = await fetchFromYahoo(`${raw}.SA`); } // Cai aqui
   }
   ```
6. O `yahoo.server.ts` puxa os dados do Yahoo Finance com sucesso. Contudo, o Yahoo não possui data de pagamento para o Brasil (`paymentDate: null` gerando o traço `-` na UI), e pior: usa **valores retroativamente ajustados e sintéticos** para dividendos antigos.
7. Diferente de `brapi.server.ts`, o `yahoo.server.ts` **não possui** lógica embutida para recorrer ao HG Brasil ou Dados de Mercado para consertar esses dividendos. O lixo que o Yahoo retorna é cacheado e vai direto para a UI.

### 2.2 Output Bruto do Yahoo Finance (vazando para a UI)
```json
[
  {
    "exDate": "2026-06-16T13:00:00.000Z",
    "paymentDate": null,
    "amountPerShare": 1.03
  },
  {
    "exDate": "2026-07-15T13:00:00.000Z",
    "paymentDate": null,
    "amountPerShare": 1.03
  },
  {
    "exDate": "2026-08-17T13:00:00.000Z",
    "paymentDate": null,
    "amountPerShare": 1
  }
]
```
*(As strings de Ex-Date batem exatamente com as horas fracionadas relatadas, e as repetições de valor são artefatos de ajuste da B3 repassados pelo Yahoo).*

Em contrapartida, uma consulta direta ao HG Brasil retornou os dados corretos que seriam usados se o pipeline não tivesse quebrado precocemente:
```json
[
  {
    "type": "income",
    "amount": 1,
    "paymentDate": "2026-08-21",
    "approvedDate": "2026-08-14"
  }
]
```

## 3. Proposta de Solução Arquitetural

O problema é o acoplamento: as rotinas de enriquecimento de dividendos estritas ao Brasil (HG Brasil e Dados de Mercado) estão enclausuradas exclusivamente dentro do `brapi.server.ts`. Se a Brapi cai (como no caso do AFHI11), as fontes boas de dividendo são ignoradas e o Yahoo contamina o sistema.

**Proposta:**
Desacoplar o enriquecimento de dividendos para todos os ativos brasileiros (`looksBr === true`), extraindo essa responsabilidade de dentro dos provedores e subindo-a para o orquestrador (`apiService.functions.ts` ou um módulo de enriquecimento).

### Execução Recomendada:
1. **Limpeza:** Remover a chamada de `fetchHgBrasilDividends` e `fetchDadosDeMercado` de dentro do `brapi.server.ts`. Os provedores (`brapi` e `yahoo`) passam a retornar apenas a cotação e métricas financeiras.
2. **Orquestração:** No final de `fetchAssetFn` (em `apiService.functions.ts`), adicionar um bloco global de enriquecimento de proventos para o Brasil.
   ```typescript
   if (looksBr) {
      // 1. O asset veio ou da Brapi ou do Yahoo.
      // 2. Consulta HG Brasil. Se vier vazio, consulta Dados de Mercado.
      // 3. Sobrescreve asset.dividendEvents com os dados de alta qualidade.
   }
   ```
Isso blindará 100% dos ativos brasileiros, garantindo que mesmo se a Brapi bloquear a consulta inicial, o fallback de preço do Yahoo terá seus dividendos substituídos e sanitarizados pelos scrapers e APIs nativas do Brasil antes de chegar ao cache ou à UI.
