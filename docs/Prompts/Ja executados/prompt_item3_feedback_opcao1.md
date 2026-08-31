# PROMPT — Item 3 (Tier 0 / Lote 2): Persistência Real de Feedback (Opção 1 Aprovada)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Decisão de produto já fechada: **Opção 1 — persistência mínima real no Firestore.** Não reabrir
essa discussão. Regra 8: plano antes de codar. Branch: `git fetch origin dev:dev && git checkout
dev && git pull origin dev` primeiro. Sem `git commit`/`git push` sem autorização. 3 gates reais,
output literal completo.

---

## 1. Padrão Já Existente — Não Inventar Server Function Nova

Investiguei antes de escrever este prompt. **Não crie uma server function para isso** — o projeto
já tem um padrão estabelecido para exatamente este tipo de escrita (usuário grava dado próprio,
sob seu `uid`, direto via client SDK), usado em `assets`, `transactions` e `portfolioSnapshots`.

`firestore.rules` (padrão real, dentro de `match /users/{userId}`):
```
match /assets/{assetId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /transactions/{transactionId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /portfolioSnapshots/{date} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

Siga esse mesmo padrão: `users/{uid}/feedbacks/{feedbackId}`, escrita direto do client via
`addDoc`/`setDoc` (Firebase SDK, como `watchlist.ts` já faz para `assets`/`transactions`), regra
de segurança espelhando as 3 acima. **Decisão de arquitetura:** use `allow create` em vez de
`allow read, write` completo — feedback não deveria ser editável/apagável pelo próprio usuário
depois de enviado (evita adulteração pós-envio, diferente de assets/transactions que legitimamente
precisam de update). Se discordar dessa restrição, justifique antes de implementar diferente.

---

## 2. Schema — Minimizado (Regra de Minimização de Dados)

**Não incluir `userEmail` no schema.** Se precisar responder ao usuário no futuro, o e-mail é
recuperável via `uid` (Firebase Auth já tem essa informação) — duplicar em outro lugar é
superfície de dado pessoal desnecessária.

```typescript
interface FeedbackEntry {
  id: string;
  uid: string;
  message: string;
  locale: string;
  appVersion?: string; // se já existir uma constante de versão no projeto — investigar antes de inventar
  createdAt: number; // timestamp
}
```

Investigar se já existe uma constante de versão do app em algum lugar (`package.json` version,
env var de build) antes de decidir se `appVersion` entra ou fica de fora do schema mínimo.

---

## 3. Integração Obrigatória com LGPD — `accountDeletion.ts`

Já investiguei este arquivo. Ele tem um padrão testável e puro (`buildAccountDeletionPaths`) que
enumera caminhos de subcoleções do usuário a apagar, na ordem certa (subcoleções antes do
documento raiz — comentário no código explica por quê). Hoje cobre `assets`, `transactions`,
`portfolioSnapshots`.

**Plano esperado (responda antes de codar):**
- **(a) Arquivos:** `src/lib/accountDeletion.ts` (adicionar `feedbackIds?: string[]` a
  `AccountDeletionInput` e o mapeamento `feedbackPaths` seguindo exatamente o padrão de
  `snapshotPaths`) + `src/lib/__tests__/accountDeletion.test.ts` (atualizar teste existente para
  cobrir o novo tipo de subcoleção) + `firestore.rules` (regra nova) +
  `src/components/ceiling/FeedbackWidget.tsx` (escrita real) + arquivo novo de teste do widget.
- **(b) Lógica:** confirmar como `buildAccountDeletionPaths` é chamada em produção — quem lista os
  IDs de `feedbackIds` antes de passar pra função (precisa de uma query prévia listando os
  documentos da subcoleção do usuário, mesmo padrão que já deve existir para `assetIds`/
  `transactionIds`/`portfolioSnapshotIds` — investigar o caller real antes de assumir).
- **(c) Pontos de atenção:**
  - `handleSend` hoje faz `setTimeout` simulando envio — remover completamente, substituir por
    chamada real ao Firestore com tratamento de erro (`try/catch`, toast de erro real se a
    escrita falhar, não fingir sucesso).
  - Testar especificamente: escrita falha (rede/permissão) deve mostrar erro ao usuário, não
    limpar o campo de mensagem nem fechar o modal (para não perder o texto que o usuário já
    digitou).
  - Confirmar que `message` tem algum limite de tamanho razoável antes de gravar (evitar abuso/
    payload gigante) — se não houver validação de tamanho em nenhum lugar do formulário hoje,
    adicionar um limite (ex: 2000 caracteres) com feedback visual.

---

## 4. Testes

- `accountDeletion.test.ts`: novo caso cobrindo `feedbackIds` no `buildAccountDeletionPaths`,
  confirmando que os caminhos aparecem antes do documento raiz `users/{userId}`.
- Novo `FeedbackWidget.test.tsx`: envio bem-sucedido grava no Firestore (mock) e fecha o modal;
  falha de escrita mostra erro e mantém o modal aberto com o texto preservado; validação de
  mensagem vazia continua funcionando como já funciona hoje.
- Teste de regra do Firestore, se a suíte `firestoreRules.test.ts` (hoje skipped por exigir
  emulador) for exercitável no seu ambiente — se não for, declare isso explicitamente, não finja.

---

## 5. Governança (Regra 9)

Tabela completa de 9 papéis no relatório de conclusão. Espera-se que
`fuente-advogado-lgpd-gdpr` apareça como **Ativo** com justificativa específica sobre o vínculo
com `accountDeletion.ts` — não genérica.

---

## 6. Lembrete Final

Comece pelo plano completo (Seção 3), incluindo a investigação do caller real de
`buildAccountDeletionPaths` antes de propor o diff. Sem commit, sem push até revisão.
