# Relatório de Investigação: API Dados de Mercado

Conforme solicitado, conduzi uma investigação detalhada sobre a API pública fornecida pelo site **dadosdemercado.com.br** baseada em sua documentação pública e testes empíricos de endpoint.

Abaixo estão as respostas para as 6 perguntas levantadas.

### 1. Endpoints Disponíveis
**Status:** Confirmado.
A documentação da API lista explicitamente suporte para os seguintes endpoints relacionados aos dados de empresas e ativos:
- `GET /api/docs/empresas/indicadores-de-mercado` (Indicadores de Mercado)
- `GET /api/docs/empresas/balancos` (Balanços Patrimoniais)
- `GET /api/docs/empresas/resultados` (Resultados / DRE)
- `GET /api/docs/empresas/fluxos-de-caixa` (Fluxos de Caixa)
- `GET /api/docs/empresas/dividendos` (Dividendos)
- `GET /api/docs/empresas/lista-de-empresas` (Lista de Empresas - provável fonte da Classificação Setorial B3)

A API possui um catálogo rico de ações e indicadores financeiros.

### 2. Autenticação, Preços e Limites (Rate Limit)
**Status:** Requer chave. Sem preços ou limites públicos.
A documentação é clara: **"Um token de autenticação é necessário em todas as requisições."**
Fiz um teste empírico (via `curl` para `https://api.dadosdemercado.com.br/v1/companies`) e a API respondeu com `401 Unauthorized - {"error":"Missing token"}`, confirmando que não há endpoints não-autenticados de cortesia.

- **Preço/Freemium:** A documentação não apresenta opções de autoatendimento (self-service) para geração de chaves grátis ou pagas.
- **Rate Limit:** Não há limites numéricos documentados.
- **Como obter:** O site informa: *"Para acesso completo aos recursos da API e ajuste dos limites de requisição, entre em contato conosco, através do e-mail api@dadosdemercado.com.br"*.

Isso indica que o acesso à API tem modelo B2B (Business-to-Business) on-demand, sujeito à negociação comercial ou aprovação manual.

### 3. Termos de Uso (Uso Comercial)
**Status:** Ambíguo / Requer contato direto.
Fiz a varredura completa da página de Privacidade (`/privacidade`), que também faz as vezes de Termos de Uso. O documento é focado estritamente na proteção de dados LGPD (cookies, armazenamento de dados do usuário).
**Não há nenhuma menção explícita no site, nem uma página isolada de Termos de Uso (`/termos`), que autorize, restrinja ou regulamente o uso comercial via API para plataformas SaaS como o Fuente.**
Dada a necessidade de contatá-los por e-mail para obter a chave (pergunta 2), os Termos de Uso comerciais devem ser alinhados diretamente via contrato com os donos da plataforma.

### 4. Cobertura de Ativos
**Status:** Ações BR, FIIs, Fundos, Tesouro e Macro.
A documentação lista os seguintes grupos:
- **Empresas** (Ações B3)
- **FIIs**
- **Fundos de Investimento**
- **Bolsa** (Índices e Cotações)
- **Títulos Públicos** (Tesouro Direto)
- **Macro** (Juros, Boletim Focus) e **Moedas**
Não há suporte para **Stocks US**, **REITs** ou **ETFs internacionais**. A API só cobre a fatia Brasileira (BR) do nosso produto.

### 5. Profundidade vs. CVM (INF_TRIMESTRAL)
**Status:** Redundante na profundidade, mas superior na usabilidade.
Os 13 anos de profundidade (2011–2024) que o site ostenta coincidem exatamente com o início da disponibilização estruturada da base `INF_TRIMESTRAL` no Portal de Dados Abertos da CVM. 
- **Profundidade:** Não é genuinamente mais profundo do que a CVM. 
- **Vantagem:** O valor deles não está em ter *mais* dados, mas sim no fato de já servirem o dado mastigado via REST API JSON, enquanto a CVM requer o download, extração, parser de zips enormes de CSVs e aplicação manual de desdobramentos/agrupamentos.

### 6. Estimativa de Esforço de Integração (Taxonomia)
*Assumindo que uma chave seja negociada e os limites sejam razoáveis:*

A integração técnica seria de **esforço médio** (cerca de 2 a 3 dias de trabalho). A taxonomia dos erros do adapter seria moldada aos status codes documentados por eles:

- `200 OK` ➔ `PASSED` (Fluxo normal)
- `400 Bad Request` ➔ `INVALID` (Falha de tipagem no input, ex: ticker mal formatado)
- `401 Unauthorized / 403 Forbidden` ➔ `ERROR` (Chave revogada, expirada ou não negociada)
- `404 Not Found` ➔ `SKIPPED` ou `WARNING` (Ativo não coberto por eles, permitindo o graceful degradation/fallback)
- `429 Too Many Requests` ➔ `ERROR` + mecanismo de Backoff (Limite de uso excedido)
- `5xx Internal Error` ➔ `ERROR` (Falha deles)

---

### Resumo Executivo
A API é excelente e resolveria nossos gaps de *Comparativo Setorial* e *Histórico de DRE/Balanços* de maneira limpa via JSON, poupando a necessidade de desenvolver spiders pesados para a CVM. 

**Impeditivo Atual:** Não é uma API "plug-and-play" gratuita. Precisamos mandar um e-mail para eles perguntando:
1. Qual o custo da API para uso comercial em um SaaS?
2. Quais são os limites de *rate limit* da chave fornecida?

Aguardo sua decisão sobre se vale a pena solicitar a chave e escrever um ADR antes de prosseguirmos com qualquer integração.
