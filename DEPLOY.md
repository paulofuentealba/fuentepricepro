# Instruções de Configuração Manual do Deploy no Google Cloud

Antes do próximo push para a branch `main` disparar o pipeline (agora controlado pelo `cloudbuild.yaml`), você precisa realizar **duas configurações vitais** no Console do Google Cloud para garantir a segurança dos segredos da aplicação. Nenhuma chave deve ser comitada no repositório.

## Passo 1: Configurar Variáveis do Firebase no Trigger do Cloud Build

O frontend da sua aplicação precisa das variáveis públicas do Firebase (`VITE_FIREBASE_*`) em tempo de build para que elas sejam incluídas no pacote do cliente. Como elas não estão no código, o `cloudbuild.yaml` espera recebê-las via _Substitution Variables_.

1. Acesse o **Console do Google Cloud**.
2. Navegue até **Cloud Build > Triggers** (Gatilhos).
3. Selecione o gatilho responsável pelo repositório atual e clique em **Editar**.
4. Role a página até a seção **Advanced / Substitution variables** (Avançado / Variáveis de substituição).
5. Adicione as 7 variáveis a seguir. Os nomes **devem** ter esse exato prefixo de _underscore_ (`_`), e os valores devem ser os valores reais correspondentes do seu Firebase (iguais ao seu `.env` local):
   - `_VITE_FIREBASE_API_KEY` = `(seu valor real)`
   - `_VITE_FIREBASE_AUTH_DOMAIN` = `(seu valor real)`
   - `_VITE_FIREBASE_PROJECT_ID` = `(seu valor real)`
   - `_VITE_FIREBASE_STORAGE_BUCKET` = `(seu valor real)`
   - `_VITE_FIREBASE_MESSAGING_SENDER_ID` = `(seu valor real)`
   - `_VITE_FIREBASE_APP_ID` = `(seu valor real)`
   - `_VITE_FIREBASE_MEASUREMENT_ID` = `(seu valor real)`
6. Clique em **Salvar**.

*(Nota: Na seção do `cloudbuild.yaml` relativa ao deploy do Cloud Run, eu assumi o nome do serviço como `fuentepricepro` e a região como `us-central1`. Se no GCP seu serviço tiver outro nome ou região, sinta-se livre para ajustar as linhas 31 e 35 do arquivo `cloudbuild.yaml` antes de comitar.)*

---

## Passo 2: Cadastrar a RESEND_API_KEY no Secret Manager

Ao contrário das chaves do Firebase, a chave da API do Resend é confidencial e só será utilizada em runtime pelo servidor backend (Cloud Run). Por segurança, ela não entra no Docker, sendo extraída diretamente do Secret Manager da Google pelo Cloud Run.

1. Navegue até **Security > Secret Manager** (Gerenciador de secrets) no Console.
2. Clique em **Create Secret** (Criar secret).
3. **Name (Nome):** Digite exatamente `RESEND_API_KEY`.
4. **Secret value (Valor do secret):** Cole aqui a sua chave real da API do Resend (`re_...`).
5. Clique em **Create secret**.
6. **Importante (Permissão de Acesso):** Para o Cloud Run poder ler esse segredo, sua _Service Account_ padrão do Compute Engine precisa ter permissão.
   - Dentro da página do novo secret `RESEND_API_KEY`, vá na aba **Permissions** (Permissões).
   - Clique em **Grant Access** (Conceder acesso).
   - No campo "New principals" (Novos principais), insira a _Service Account_ utilizada pelo Cloud Run (geralmente tem o formato `1234567890-compute@developer.gserviceaccount.com`).
   - Em "Select a role" (Selecionar papel), escolha **Secret Manager Secret Accessor** (Acessador de secrets do Secret Manager).
   - Clique em **Save**.

Após esses 2 passos, você pode aprovar a etapa seguinte, realizar o _commit_ do `cloudbuild.yaml` e o próximo push vai efetuar o build e deploy com total segurança!
