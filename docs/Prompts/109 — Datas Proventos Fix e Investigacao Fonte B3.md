# PROMPT 109 — Datas de Proventos: Corrigir Conflação exDate/paymentDate + Investigar Fonte Primária B3
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

Duas partes. Parte 1 é fix direto (bug confirmado). Parte 2 é
investigação (Regra 8) — não trocar de fonte de dado sem confirmar
viabilidade e estabilidade primeiro.

---

## PARTE 1 — Corrigir Conflação exDate/paymentDate (🔴 confirmado)

### Causa Raiz
`src/lib/api/brapi.server.ts:103`:
```ts
exDate: d.lastDatePrior ?? d.paymentDate ?? "",
```
Se `d.lastDatePrior` vier ausente/vazio da API da Brapi, o código usa
`d.paymentDate` (data de **pagamento**) como se fosse `exDate` (data
**ex**) — são conceitos diferentes (data-ex é quando o direito se
separa do papel; pagamento é quando o valor é creditado). Isso pode
exibir uma data-ex incorreta ao usuário sempre que `lastDatePrior`
estiver ausente na resposta da API.

### Tarefa
1. Investigar, com dado real da API Brapi (não presumir), com que
   frequência `d.lastDatePrior` vem ausente/vazio para tickers reais
   — isso define se o bug é raro ou frequente na prática.
2. Corrigir o fallback: se `lastDatePrior` estiver ausente, **não**
   usar `paymentDate` como substituto — ou omitir o `exDate` desse
   evento (deixando `null`/ausente, com a UI já preparada pra exibir
   "data a confirmar" em vez de uma data errada), ou buscar uma
   segunda fonte para aquele evento específico (ver Parte 2).
3. Verificar se `d.lastDatePrior` é de fato o campo correto pra
   "data-com"/"data-ex" na documentação/resposta real da API Brapi —
   o nome do campo é ambíguo ("last date prior [to what?]"), confirmar
   com a resposta real da API antes de assumir que é o campo certo.

### Gate de Saída (Parte 1)
- `npx tsc --noEmit`, `npx vitest run` (teste de regressão: evento sem
  `lastDatePrior` não deve mais produzir `exDate === paymentDate`),
  `npm run build`.
- Reportar a frequência real de ausência de `lastDatePrior` encontrada
  na investigação (item 1).

---

## PARTE 2 — Investigação: Fonte Primária de Data-Com/Data-Ex para B3

### Contexto
Pesquisa externa (fora do código) identificou:
- Não existe API pública **documentada** da B3 para proventos.
- O **site da B3** (seção "Eventos Corporativos" de cada empresa,
  "Proventos em Dinheiro") expõe um endpoint JSON não-documentado,
  acessível via engenharia reversa das chamadas de rede da própria
  página — usado por scripts públicos de terceiros para extrair
  histórico de proventos diretamente da B3. Parâmetros de busca
  aparentam ser codificados em base64.
- CVM não publica feed estruturado equivalente (trabalha com "avisos
  aos acionistas"/"fatos relevantes", documentos não estruturados).

### Tarefas de Investigação
1. **Confirmar a existência e estabilidade do endpoint da B3**:
   reproduzir a extração (inspecionar a aba de rede na página pública
   de "Eventos Corporativos" de 2-3 tickers reais no site da B3),
   documentar o formato exato da URL/parâmetros/resposta.
2. **Avaliar viabilidade de uso em produção**:
   - É um endpoint **não-documentado oficialmente** — avaliar risco de
     quebra sem aviso (a B3 pode mudar sem changelog público, por não
     ser um contrato de API formal).
   - Rate limiting / bloqueio de acesso automatizado — testar volume
     razoável de chamadas e ver se há CAPTCHA, bloqueio por IP, ou
     necessidade de headers específicos de navegador.
   - Termos de uso do site da B3 — verificar se scraping/uso
     automatizado desse endpoint é compatível com os termos públicos
     do site (não presumir que é permitido só porque é tecnicamente
     acessível).
3. **Comparar dado da B3 vs. dado atual da Brapi** para uma amostra de
   10-15 tickers reais (ações + FIIs) com proventos anunciados
   recentemente: as datas batem? Onde divergem, qual parece mais
   confiável (cruzar manualmente com o RI da própria empresa para 2-3
   casos de divergência, como critério de desempate)?
4. **Recomendação**: propor se a B3 deveria virar (a) fonte primária
   substituindo Brapi para data-com/data-ex, (b) fonte de
   cross-validation rodando em paralelo à Brapi só para alertar
   divergência (sem substituir), ou (c) não vale o risco de depender
   de endpoint não-documentado — manter Brapi e só reforçar o fix da
   Parte 1. Justificar a recomendação com o que foi encontrado nas
   tarefas 1-3, não com preferência a priori.

### Nota sobre o lado US
Pesquisa externa confirmou que não existe alternativa mais "oficial"
prontamente acessível do que o que já é usado
(`nasdaq.server.ts`) — a própria SEC não publica feed estruturado de
data-ex/pagamento (nasce em filings 8-K, texto livre, não
padronizado), e a própria Nasdaq depende de parceiro terceiro
(Quotemedia) para essa informação em seu próprio site público. **Não
investigar troca de fonte para o lado US nesta rodada** — o
levantamento já indica que não há ganho claro disponível.

## Gate de Saída (Parte 2)
- Documento de investigação (não é execução de código nesta parte,
  salvo se a Parte 1 sozinha já dependa de ajuste pontual identificado
  na tarefa 1).
- Recomendação clara da tarefa 4, com evidência.

## Proibido
- Não implementar integração com o endpoint da B3 nesta rodada, mesmo
  que a investigação pareça promissora — isso é decisão de Paulo após
  ver o documento, vira prompt de execução separado se aprovado.
- Não presumir que scraping de endpoint não-documentado é
  automaticamente aceitável — reportar o achado sobre termos de uso
  antes de recomendar uso em produção.
