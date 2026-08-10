### 28 — Corrigir _DEPLOY_REGION do gatilho + logging do Cloud Build ✅ CONCLUÍDO E CONFIRMADO (corrigido ao vivo via Console: _DEPLOY_REGION estava salvo como us-south1 apesar da instrução anterior, corrigido pra us-east1; cloudbuild.yaml recebeu `logging: CLOUD_LOGGING_ONLY` pra satisfazer exigência do Cloud Build com service account explícita; build manual disparado e confirmado atualizando o serviço us-east1 correto; serviço duplicado em us-south1 removido)

---

## Pendências registradas, sem prompt ainda (aguardando decisão ou momento certo)

- Decisão de monetização real (Free vs. Pro) — estrutura em DEV apenas, aguardando você decidir ativar
- Lentidão do `npm run dev` por causa do OneDrive — ação do lado do Windows, não é prompt de código

---