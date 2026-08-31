# PROMPT — Correção: campo `series` não mapeado em `hgBrasil.server.ts`
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Esta rodada **autoriza alteração de código**, ao contrário do prompt de
diagnóstico anterior. Escopo é estrito: só o arquivo listado na Seção 2.
Nenhum outro arquivo deve ser tocado sem sinalizar antes.

Siga a Regra 8 do `AGENTS.md`: plano de implementação antes de codar, gates
de verificação (`tsc`/`test`/`build`) obrigatórios no relatório final,
literal — não paraphraseado.

---

## 1. Causa raiz confirmada

Auditoria com resposta real da API (rodada pelo próprio Antigravity, chave
válida, HTTP 200) mostrou que a HG Brasil retorna os proventos em
`results[0].series`, com estes campos por item:

```json
{
  "type": "dividend",       // ou "income" para FIIs/FIAGROs
  "category": "cash",
  "amount": 1.3672,
  "approval_date": "2026-08-05",
  "com_date": "2026-08-16",
  "payment_date": "2026-08-28",
  "status": "paid"
}
```

Em `src/lib/api/hgBrasil.server.ts`, a função `fetchHgBrasilDividends` (linhas
126-131) procura os proventos em `firstResult.dividends`,
`firstResult.dividends_history`, ou `firstResult.items` — **nenhuma dessas
chaves existe na resposta real**. `rawDividends` fica sempre `[]`, o loop de
parsing nunca roda, e a função reporta `PASSED "Parsed 0 dividends"` — um
sucesso falso, sem erro, sem exceção, sem log de falha. Isso explica o
sintoma relatado por Paulo (dividendos não carregam) apesar da chave válida
e da API respondendo 200.

Bug secundário no mesmo bloco (linha 139): o código busca
`raw.approved_date`, mas o campo real é `approval_date` (sem "ed"). Esse
bug fica mascarado pelo bug principal hoje, mas precisa ser corrigido junto
— senão o fix do `series` ainda devolve `approvedDate` sempre `null`.

---

## 2. Arquivo a alterar

`src/lib/api/hgBrasil.server.ts`

### 2.1 Corrigir a extração do array de proventos (linha ~126-131)

Trocar:
```ts
const rawDividends: any[] =
  firstResult.dividends ||
  firstResult.dividends_history ||
  firstResult.items ||
  [];
```

Por (adicionar `series` como fonte primária, preservar os fallbacks
antigos por segurança/retrocompatibilidade caso a API mude de novo):
```ts
const rawDividends: any[] =
  firstResult.series ||
  firstResult.dividends ||
  firstResult.dividends_history ||
  firstResult.items ||
  [];
```

### 2.2 Corrigir o mapeamento de campos dentro do loop (linha ~136-149)

A resposta real usa `approval_date` (não `approved_date`) e `com_date`
como data-com. Ajustar as tentativas de match para cobrir os nomes reais
confirmados, mantendo os fallbacks antigos:

```ts
const rawAmount = typeof raw.amount === "number" ? raw.amount : parseFloat(String(raw.amount || raw.value || 0));
const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;
const paymentDate = normalizeHgDate(raw.payment_date || raw.paymentDate || raw.date_payment || raw.data_pagamento);
const approvedDate = normalizeHgDate(
  raw.approval_date || raw.approved_date || raw.approvedDate || raw.com_date || raw.last_date_prior || raw.data_com,
);
```

### 2.3 Tratar `type: "income"` (FIIs/FIAGROs) como equivalente a dividendo

Hoje a linha `type: raw.type || raw.dividend_type || "Dividendo"` só
preserva o valor cru (`"dividend"` ou `"income"`) sem normalizar. Confirme
se algum consumidor downstream (`DividendEvent`, `brapi.server.ts` linha
~118) espera um valor específico em `type` (ex: `"Dividendo"`,
`"Rendimento"`) para exibição/i18n. Se sim, mapeie:
- `"dividend"` → `"Dividendo"`
- `"income"` → `"Rendimento"`

Se não houver dependência downstream nesse campo, apenas preserve o valor
cru — não invente uma normalização que não é necessária.

---

## 3. O que NÃO fazer

- Não toque em `brapi.server.ts`, no fallback Brapi/Dados de Mercado, nem
  em nenhum componente de frontend — o bug é isolado nesse arquivo.
- Não remova os fallbacks antigos (`dividends`, `dividends_history`,
  `items`, `approved_date` etc.) — mantenha como rede de segurança caso a
  API volte a mudar de formato; só adicione os nomes reais confirmados.
- Não decida sozinho sobre o item da Seção 2.3 se houver ambiguidade — se
  não tiver certeza de como `type` é consumido, pare e pergunte antes de
  normalizar.

---

## 4. Verificação obrigatória (Regra 8)

Depois da mudança, rode e cole o output **literal**, não resumido:

```bash
npx tsc --noEmit
npx vitest run src/lib/api/__tests__/hgBrasil.server.test.ts
npx vitest run
npm run build
```

Além disso, rode novamente o script de validação real para confirmar que o
fix funciona contra a API de verdade:

```bash
npx tsx scripts/validate-bolsai-hgbrasil.ts
```

Cole o trecho relevante mostrando `dividends` não-vazio para `BBSE3` e
`VGIA11` (ou o equivalente que o script imprimir após o fix).

**Atenção:** os testes existentes em `hgBrasil.server.test.ts` usam mocks
com a estrutura de campo antiga (`dividends`/`approved_date`). Depois do
fix, adicione pelo menos um teste novo com um mock fiel à resposta real
(`series` + `approval_date` + `com_date` + `payment_date`), baseado
literalmente no JSON da Seção A do relatório de diagnóstico anterior —
não invente uma estrutura de mock diferente da resposta real confirmada.

---

## 5. Entrega final

- Diff do arquivo alterado.
- Teste novo adicionado cobrindo o formato real (`series`).
- Os 4 comandos de gate + o output do script de validação, todos colados
  literalmente.
- **Não faça commit nem push.** Deixe as mudanças no working tree para
  Paulo revisar. Aguarde aprovação antes de qualquer `git commit`.
