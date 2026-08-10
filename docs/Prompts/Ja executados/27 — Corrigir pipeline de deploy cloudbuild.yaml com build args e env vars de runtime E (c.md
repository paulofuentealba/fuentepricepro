### 27 — Corrigir pipeline de deploy: cloudbuild.yaml com build args e env vars de runtime ✅ CONCLUÍDO E CONFIRMADO (cloudbuild.yaml migrado pra Artifact Registry + variáveis nativas do Cloud Run, região corrigida pra us-east1, serviço duplicado em us-south1 identificado e removido, RESEND_API_KEY adiado por não estar em uso)

```
27 — Corrigir pipeline de deploy: cloudbuild.yaml com build args e env vars 
de runtime

Contexto: o deploy via Cloud Build conectado ao GitHub quebrou com 
"COPY failed: stat app/.env: file does not exist". Causa raiz: o 
Dockerfile tinha `COPY --from=builder /app/.env ./.env` e rodava com 
`node --env-file=.env`, assumindo que o `.env` estaria disponível no 
contexto de build — mas como o Cloud Build agora puxa o código direto do 
GitHub (não de uma pasta local), e o `.env` corretamente nunca foi 
commitado (é segredo, confirmado na auditoria de segurança da Tarefa 25), 
o arquivo genuinamente não existe nesse contexto.

Já CORRIGI O DOCKERFILE (não precisa mexer nele de novo, só confirmar que 
bate com isto):
- Removi `COPY --from=builder /app/.env ./.env` e o `--env-file=.env` do 
  CMD (agora é só `CMD [ "node", "server.production.js" ]`), porque 
  server.production.js já lê direto de `process.env` (não depende de 
  arquivo) — vars de runtime devem vir do próprio Cloud Run, não de 
  dentro da imagem.
- Adicionei ARG + ENV pras 7 variáveis VITE_FIREBASE_* no estágio 
  `builder`, ANTES do `RUN npm run build` — porque essas variáveis com 
  prefixo VITE_ são inlinadas no bundle do cliente pelo Vite durante o 
  build, então precisam existir nesse momento, não só em runtime.

O QUE FALTA (esta tarefa):

1. Criar um arquivo `cloudbuild.yaml` na raiz do projeto, substituindo o 
   comportamento implícito atual do trigger (que só builda o Dockerfile 
   sem passar build-args). O cloudbuild.yaml deve ter 3 steps:
   
   a) `docker build` passando cada VITE_FIREBASE_* como `--build-arg`, 
      lendo de substitution variables prefixadas com underscore (padrão 
      do Cloud Build), ex: `--build-arg 
      VITE_FIREBASE_API_KEY=$_VITE_FIREBASE_API_KEY`. Repetir pros 7 
      valores do .env.example (VITE_FIREBASE_API_KEY, 
      VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, 
      VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, 
      VITE_FIREBASE_APP_ID, VITE_FIREBASE_MEASUREMENT_ID). Tag da imagem 
      usando $PROJECT_ID e $COMMIT_SHA (substitutions automáticas do 
      Cloud Build).
   
   b) `docker push` da imagem taggeada.
   
   c) `gcloud run deploy` fazendo o deploy da imagem no serviço Cloud Run 
      existente, incluindo `--set-secrets RESEND_API_KEY=RESEND_API_KEY:latest` 
      (assumindo que o segredo vai ser criado no Secret Manager — ver 
      item 2) em vez de `--set-env-vars` puro, já que é uma API key.
   
   Declarar no final do arquivo um bloco `substitutions:` com valores 
   default VAZIOS pras 7 variáveis VITE_FIREBASE_* (só os nomes, sem 
   valor real — os valores de verdade vão ser configurados no trigger do 
   Cloud Build pelo usuário, fora deste repositório).

2. Escrever, junto do arquivo, um bloco de instruções em português (pode 
   ser um comentário no topo do cloudbuild.yaml ou um markdown 
   separado DEPLOY.md) explicando os 2 passos manuais que EU (não você, 
   Antigravity) preciso fazer no Console do Google Cloud, já que envolvem 
   segredos reais:
   a) No trigger do Cloud Build (Cloud Build > Triggers > editar o 
      trigger existente), adicionar as 7 substitution variables 
      (_VITE_FIREBASE_API_KEY, etc.) com os valores reais do projeto 
      Firebase.
   b) Criar o segredo RESEND_API_KEY no Secret Manager (Security > 
      Secret Manager) com o valor real, e conceder acesso à service 
      account do Cloud Run pra ler esse segredo.

NÃO TOCAR: não rodar nenhum comando `gcloud` que afete a infraestrutura 
real (trigger, secret manager, deploy manual) — isso fica comigo, fora do 
repositório. Não colocar nenhum valor real de API key ou segredo em 
nenhum arquivo do repositório, nem como default de substitution. Não 
mexer no Dockerfile além de confirmar que está como descrito acima.

CRITÉRIO DE SUCESSO: cloudbuild.yaml criado e commitado, com os 3 steps 
(build com build-args, push, deploy com secret), substitutions declaradas 
sem valores reais, e instruções claras do que eu preciso configurar 
manualmente no Console antes do próximo push disparar o trigger de novo.
```

---