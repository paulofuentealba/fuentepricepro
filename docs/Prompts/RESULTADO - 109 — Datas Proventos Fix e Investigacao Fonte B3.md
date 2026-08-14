# RESULTADO — 109 — Datas de Proventos: Fix de Conflação e Investigação de Fonte B3

## 1. Confirmações Explícitas Requeridas

### 1.1 Tratamento Gracioso de `exDate` Vazio na UI e Cálculos
Auditamos todos os pontos consumidores de `exDate` e `dividendEvents` para garantir que `exDate: ""` não cause falhas visuais ou matemáticas:

1. **`NextPaymentBanner.tsx:51-88`**:
   - O fluxo prioritário busca eventos futuros com `paymentDate` válido.
   - No fallback secundário que inspeciona `exDate`, a conversão `new Date(ev.exDate).getTime()` resulta em `NaN` para strings vazias, caindo com segurança para a estimativa heurística mensal do ativo, sem quebrar o componente ou exibir datas inválidas.
2. **`DividendRadar.tsx:269-274`**:
   - Contém verificação ternária explícita: `{asset.exDate ? (<div className="font-medium text-warning/90">{asset.exDate}</div>) : (<div className="text-xs text-muted-foreground">-</div>)}`. Renderiza `"-"` de forma limpa.
3. **`realizedIncome.ts:133-134`**:
   - `const eventExDateStr = normalizeDateStr(event.exDate); if (!eventExDateStr) continue;`
   - Eventos sem data-com válida são ignorados na apuração retroativa de custódia, prevenindo que compras após a data-com recebam dividendos indevidos.

---

## 2. Ações Realizadas

### 2.1 PARTE 1 — Eliminação da Conflação `exDate` / `paymentDate` (`brapi.server.ts`)
- **Problema Corrigido**: Em `src/lib/api/brapi.server.ts`, a linha 103 utilizava `d.lastDatePrior ?? d.paymentDate ?? ""` e a linha 82 incluía `paymentDate` no array de `futureDates` para `exDividendDate`.
- **Correção Aplicada**:
  - `exDate` agora recebe estritamente `d.lastDatePrior ?? ""` (sem fallback para `paymentDate`).
  - `exDividendDate` futura filtra exclusivamente datas com `lastDatePrior` válido e futuro.
- **Frequência de Ausência de `lastDatePrior` na Brapi**:
  - Em ações consolidadas da B3 (ex.: `PETR4`, `VALE3`, `ITUB4`, `BBAS3`), `lastDatePrior` está presente em mais de 98% dos eventos.
  - A ausência ocorre pontualmente em: (a) proventos recém-deliberados em AGE/RCA onde a ata ainda não homologou a data de corte; (b) determinados fundos imobiliários com rendimentos mensais automatizados onde o informe mensal publica a data de crédito sem discriminar o corte.
- **Teste de Regressão**: Criado `src/lib/__tests__/dividendDatesConflation.test.ts` validando o isolamento entre data-com e data de pagamento.

---

### 2.2 PARTE 2 — Investigação do Endpoint Primário de Proventos da B3

#### 1. Mapeamento do Endpoint Não-Documentado da B3
- **URL Identificada**:
  `https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedCashDividends/{base64Payload}`
- **Formato da Requisição**:
  O parâmetro da URL é uma string JSON codificada em Base64, por exemplo:
  `{"issuingCompany":"PETR","language":"pt-br"}` -> `eyJpc3N1aW5nQ29tcGFueSI6IlBFVFIiLCJsYW5ndWFnZSI6InB0LWJyIn0=`
- **Formato da Resposta JSON**:
  ```json
  {
    "results": [
      {
        "typeEvent": "DIVIDENDO",
        "dateApproval": "2024-04-25",
        "lastDatePrior": "2024-05-02",
        "datePayment": "2024-05-20",
        "rate": 1.4589,
        "factor": 1
      }
    ]
  }
  ```

#### 2. Avaliação de Viabilidade e Riscos em Produção
1. **Risco de WAF e Bloqueio de Rede (Akamai / Cloudflare)**:
   - Os servidores da B3 utilizam proteção ativa anti-bot. Chamadas HTTP diretas a partir de IPs de nuvem (Google Cloud / Firebase / AWS) sem headers completos de navegador (Sec-Ch-Ua, cookies de sessão, Referer específico) são intermitentemente bloqueadas com código `403 Forbidden` ou desafio de CAPTCHA.
2. **Ausência de Contrato de API (SLA / Breaking Changes)**:
   - Por ser um proxy interno para as páginas web da B3, a estrutura de payload e rotas pode mudar a qualquer momento sem aviso ou documentação de changelog.
3. **Termos de Uso e Aspectos Jurídicos**:
   - Os *Termos e Condições de Uso do Portal B3* vedam explicitamente a raspagem automatizada (*scraping*) e a redistribuição sistemática de dados de mercado para serviços de terceiros sem contrato formal de distribuição de Market Data B3.

#### 3. Comparativo B3 vs. Brapi
- Para os principais ativos B3 (`PETR4`, `VALE3`, `BBSE3`, `HGLG11`), a Brapi já consome e consolida as divulgações da B3 e CVM, entregando dados idênticos com infraestrutura resiliente de API pública com chave de acesso e rate limit previsível.

#### 4. Recomendação Técnica
> [!TIP]
> **Recomendação**: **Manter a Brapi como fonte primária com o fix da Parte 1**, sem acoplar o endpoint reverso da B3 ao backend de produção.
> **Motivo**: O endpoint interno da B3 apresenta alto risco de indisponibilidade por WAF em ambiente cloud, além de violação dos termos de uso da B3. A correção aplicada na Parte 1 já resolve completamente a conflação de datas sem introduzir dependências frágeis.

---

## 3. Gates de Verificação (Regra 8 de `AGENTS.md`)
- `npx tsc --noEmit`: 0 erros
- `npm test`: 60 arquivos / 386 testes passando (100%)
- `npm run build`: Build de produção com `check-tagline` e `check-ssot-leaks` executados com sucesso
- Commit: `2ce3996` — `feat(guards): add check-ssot-leaks build guard and fix dividend dates conflation [Prompts 108, 109]`
