# PROMPT — Conceder Privilégio Admin a gutierre.fuentealba@gmail.com
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Esta é uma ação real de escrita em produção (Firebase Auth Custom Claims). Siga a sequência
exatamente na ordem abaixo — **pare e reporte antes de cada etapa que grava dado**, não execute
tudo de uma vez sem confirmação intermediária.

---

## PASSO 1 — Resolver o UID (somente leitura)

Localize o UID de `gutierre.fuentealba@gmail.com` no Firebase Auth (Console ou via Admin SDK
`getUserByEmail`). Se o usuário ainda não existir (nunca fez login no app), pare aqui e reporte —
ele precisa se cadastrar/logar no app pelo menos uma vez antes do claim poder ser setado.

Reporte o UID encontrado e aguarde minha confirmação antes de prosseguir para o Passo 2.

---

## PASSO 2 — Setar o Claim em Produção

Depois da minha confirmação do UID, execute:

```bash
npx tsx scripts/set-admin-claim.ts <UID_CONFIRMADO>
```

Contra o projeto Firebase de **produção**. Cole o output literal completo do comando (o script já
imprime sucesso/erro e a verificação pós-escrita do claim).

---

## PASSO 3 — Confirmar Ambiente de Dev/Staging

Antes de repetir o comando em dev, confirme: o projeto Firebase de dev é o mesmo de produção ou
um projeto separado? Se for separado, identifique qual variável de ambiente
(`FIREBASE_SERVICE_ACCOUNT_KEY` ou `GOOGLE_APPLICATION_CREDENTIALS`) precisa apontar para as
credenciais de dev antes de rodar o script novamente, e reporte isso antes de executar — não troque
de credencial e rode sem eu confirmar que é o ambiente certo.

Se for o mesmo projeto para prod e dev (sem separação), diga isso claramente e pule este passo.

---

## PASSO 4 — Repetir em Dev (se aplicável)

Só depois da minha confirmação do Passo 3, rode o mesmo comando apontando pro ambiente de dev.
Cole o output literal.

---

## Lembrete Final
Não pule etapas nem execute o Passo 2 ou o Passo 4 sem confirmação explícita minha entre cada um.
Se em qualquer momento o script retornar erro (usuário não encontrado, credenciais ausentes),
pare e reporte o erro literal — não tente contornar ou adivinhar uma correção.
