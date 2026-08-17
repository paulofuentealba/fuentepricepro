# PROMPT 13 — Dados de Mercado via scraping de HTML (substitui a Fase 1 dos Prompts 10 e 11)

> Copiar e colar no chat `[EXECUÇÃO]`.

## Contexto — por que mudou de abordagem

Paulo confirmou que a conta com chave de API da Dados de Mercado não
funciona para CPF (provavelmente exige CNPJ). Os Prompts 10 e 11
(dividendos e fundamentalistas via API oficial) ficam **substituídos**
nesta parte — a arquitetura de destino (onde os dados entram no pipeline,
o que NÃO pode ser tocado) continua a mesma, só a forma de coleta muda de
API para scraping de HTML.

**Verificação de viabilidade já feita (Claude, antes deste prompt):**
- `robots.txt` do site: `Allow: /`, só bloqueia `/v1/` (namespace da API)
  e `/invoice/` (faturamento). As páginas que precisamos —
  `/agenda-de-dividendos` e `/acoes/{ticker}` — **não estão bloqueadas**.
- Testado com `curl` simples (sem JavaScript, sem browser headless): o
  HTML já vem renderizado do servidor, com as tabelas de dados completas.
  Scraping simples de HTML resolve, não precisa de Puppeteer/Playwright.
- O site se descreve como "banco de dados aberto de investimentos no
  Brasil" e cada tabela tem link "Baixar em .csv" — **confirme se esse
  link de CSV funciona sem autenticação antes de fazer parsing de HTML**;
  se funcionar, é preferível (mais robusto a mudança de layout do que
  parsear `<table>`).
- Frequência pretendida por Paulo (1x/dia ou 1x/semana) é bem abaixo de
  qualquer limite que causaria sobrecarga — está dentro do padrão de "bom
  comportamento" de scraping (identificação por User-Agent, sem
  paralelismo agressivo, cache local).

**Atenção LGPD (Regra do projeto, `fuente-advogado-lgpd-gdpr`):** a página
`/acoes/{ticker}` inclui uma seção "Administradores" com nome, data de
nascimento, e histórico profissional de diretores da empresa — isso é dado
pessoal. **O scraper deve ignorar essa seção inteiramente** — só extrair
Indicadores/Balanços/Resultados/Dividendos, que são dados públicos de
mercado, não dado pessoal.

## 🛑 MODO DE OPERAÇÃO

### FASE 1 — Confirmar estrutura real antes de escrever o parser

1. Confirme se `/acoes/{ticker}` tem link de download CSV que funciona sem
   login (teste em pelo menos BBSE3, PETR4, uma FII em
   `/acoes/{ticker}/dividendos`). Se funcionar, o scraper deve preferir
   baixar o CSV em vez de fazer parsing de tabela HTML.
2. Se o CSV não for acessível sem auth: mapeie a estrutura exata das
   tabelas HTML relevantes (`Indicadores`, `Dividendos`) — ids/classes CSS
   estáveis que possam ser usados como seletor, não posição por índice
   (posição de coluna muda se o site adicionar uma coluna nova).
3. Confirme a URL e estrutura de `/agenda-de-dividendos` — é uma lista
   única (todos os tickers) ou precisa paginação/filtro por data?
4. Reporte a estrutura encontrada antes de escrever o scraper de produção.

### FASE 2 — Implementação (Regra 4 SSOT continua valendo)

5. Crie `src/lib/api/dadosDeMercadoScraper.server.ts`, seguindo o mesmo
   padrão dos outros arquivos `*.server.ts` (`hgBrasil.server.ts` como
   referência): cache em memória com TTL, `reportIngestionStatus` para
   observabilidade, `User-Agent` identificável (ex:
   `FuentePricePro/1.0 (+https://fuentepricepro.com)`), timeout curto.
6. Frequência de scraping: rode em batch (Cloud Scheduler + Cloud Function
   ou equivalente já usado no projeto para outros jobs periódicos — CVM já
   é um caso parecido, confirme o padrão existente antes de criar um novo)
   1x/dia para `/agenda-de-dividendos` (calendário muda diariamente) e
   1x/semana para indicadores fundamentalistas de `/acoes/{ticker}`
   (menos voláteis) — não fazer scraping síncrono por request de usuário.
7. **Mesma regra dos prompts anteriores**: essa fonte entra na cadeia de
   fallback de `dividendEvents` (HG Brasil → Dados de Mercado → Brapi),
   SEM tocar em `dividendHistory`, `cagr`, `payoutRatio`, `paymentMonths`,
   `dividends3y`.
8. Para fundamentalistas: mesma decisão da Fase 2 do Prompt 11 — entra
   como informação complementar de UI por padrão, não entra em
   `getAssetValuation` sem plano formal separado aprovado por Paulo.
9. Ignore explicitamente a seção "Administradores" no parsing — não
   extrair, não armazenar, não logar esse bloco.
10. Rode `npm run test`, `npx tsc --noEmit`, `npm run build` — output
    literal.
11. Commits separados: scraper novo, wiring na cadeia de dividendos,
    wiring de fundamentalistas (se for além de UI complementar).

## PROIBIDO
- Proibido fazer scraping em paralelo/alta frequência — respeitar a
  cadência (1x/dia, 1x/semana) mesmo que tecnicamente desse pra ir mais
  rápido.
- Proibido extrair ou armazenar a seção "Administradores" (dado pessoal).
- Proibido tocar em `dividendHistory`, `cagr`, `payoutRatio`,
  `paymentMonths`, `dividends3y`, `getAssetValuation` — mesma restrição de
  sempre.
- Proibido fazer scraping síncrono disparado por ação do usuário — sempre
  em job agendado, com cache servindo as requisições em tempo real.
