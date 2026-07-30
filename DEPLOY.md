# Instruções de Configuração Manual do Deploy no Google Cloud

Antes do próximo push para a branch `main` disparar o pipeline (agora controlado pelo `cloudbuild.yaml`), você precisa realizar **duas configurações vitais** no Console do Google Cloud para garantir a segurança dos segredos da aplicação. Nenhuma chave deve ser comitada no repositório.

## Passo 1: Configurar Variáveis do Firebase no Trigger do Cloud Build

O frontend da sua aplicação precisa das variáveis públicas do Firebase (`VITE_FIREBASE_*`) em tempo de build para que elas sejam incluídas no pacote do cliente. Como elas não estão no código, o `cloudbuild.yaml` espera recebê-las via _Substitution Variables_.

1. Acesse o **Console do Google Cloud**.
2. Navegue até **Cloud Build > Triggers** (Gatilhos).
3. Selecione o gatilho responsável pelo repositório atual e clique em **Editar**.
4. Role a página até a seção **Advanced / Substitution variables** (Avançado / Variáveis de substituição).
5. Adicione as 7 variáveis a seguir. Os nomes **devem** ter esse exato prefixo de _underscore_ (`_`), e os valores devem ser os valores reais correspondentes do seu Firebase (iguais ao seu `.env` local — NÃO cole os valores reais aqui neste arquivo, só no Console):
	- `_VITE_FIREBASE_API_KEY` = `(seu valor real, sem aspas)`
	- `_VITE_FIREBASE_AUTH_DOMAIN` = `(seu valor real, sem aspas)`
	- `_VITE_FIREBASE_PROJECT_ID` = `(seu valor real, sem aspas)`
	- `_VITE_FIREBASE_STORAGE_BUCKET` = `(seu valor real, sem aspas)`
	- `_VITE_FIREBASE_MESSAGING_SENDER_ID` = `(seu valor real, sem aspas)`
	- `_VITE_FIREBASE_APP_ID` = `(seu valor real, sem aspas)`
	- `_VITE_FIREBASE_MEASUREMENT_ID` = `(seu valor real, sem aspas)`
6. Enquanto estiver nessa mesma tela de Substitution variables, confirme também que `_DEPLOY_REGION` está como `us-east1` (a região real do serviço `fuentepricepro`) — esse campo já existe lá, gerado automaticamente pelo Cloud Run, só precisa estar com o valor certo.
7. Confirme também que **Location**, na seção Configuration do gatilho, está marcado como **"Repository"** (não "Inline") apontando pro `cloudbuild.yaml` — senão o gatilho ignora esse arquivo e nada do que configuramos tem efeito.
8. Clique em **Salvar**.

*(Nota: o `cloudbuild.yaml` usa as variáveis que o próprio Cloud Run já provisionou no gatilho — `_SERVICE_NAME`, `_DEPLOY_REGION`, `_AR_HOSTNAME`, `_AR_PROJECT_ID`, `_AR_REPOSITORY` — em vez de nomes fixos, então não precisa editar o arquivo pra ajustar serviço ou região; basta que os valores dessas variáveis estejam corretos aqui no Console.)*

---

## Passo 2: (Opcional, pulado por enquanto) RESEND_API_KEY no Secret Manager

Envio de e-mail transacional (Resend) ainda não está em uso no projeto — o `cloudbuild.yaml` não depende mais dessa variável. Quando decidir ativar e-mails, siga isto:

1. Crie uma conta em [resend.com](https://resend.com) e gere uma API key real em "API Keys".
2. Navegue até **Security > Secret Manager** no Console do Google Cloud.
3. **Create Secret** → nome exato `RESEND_API_KEY` → cole a chave real (`re_...`) → **Create Secret**.
4. Na aba **Permissions** do secret criado, **Grant Access** para a service account do Cloud Run (formato `NUMERO-compute@developer.gserviceaccount.com`, visível em Cloud Run > serviço > Security), papel **Secret Manager Secret Accessor**.
5. Descomentar as duas linhas `--set-secrets` / `RESEND_API_KEY=RESEND_API_KEY:latest` no `cloudbuild.yaml` (estão comentadas, com uma nota explicando isso).
