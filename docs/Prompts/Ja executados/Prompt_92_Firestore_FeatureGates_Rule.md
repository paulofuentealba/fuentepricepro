# Prompt 92 — [EXECUÇÃO] Corrigir regra do Firestore que bloqueia `config/featureGates` para usuários reais
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 Modo de operação

Você **tem** permissão para alterar código nesta rodada — mas **exclusivamente** dentro do
escopo descrito abaixo. Esta é uma mudança em `firestore.rules`, que roda no **mesmo**
projeto Firebase de produção (não existe projeto Dev separado — Regra 3 do `AGENTS.md`).
Trate cada linha como se já estivesse em produção, porque está.

Classificação (`fuente-product-manager`): **🔴 Bug Crítico** — segurança/config, SLA
imediato. Origem: Auditoria UX de 14/08/2026, achado **1.2**.

---

## 1. Contexto (fato confirmado, não hipótese)

`firestore.rules:35-38`, hoje:
```
match /config/featureGates {
  allow read: if request.auth.token.isAdmin == true;
  allow write: if false;
}
```

`useFeatureGates()` (`src/lib/featureGates.ts`) é chamado para **todo usuário**, inclusive
convidado, para decidir gates de produto (`freeAssetLimit`, `cashflowUnlocked`, etc.). Como
nenhum usuário real tem `isAdmin`, **todo mundo** recebe `permission-denied` (confirmado no
console em várias abas) e cai silenciosamente no fallback `DEFAULT_FEATURE_GATES` hardcoded.

**Consequência prática:** o painel Admin → Feature Gates (Prompt 88, ainda pendente de
execução) não terá **nenhum efeito em produção** mesmo depois de implementado — o cliente
nunca lê o documento atualizado. Isso não é opinião de UX, é uma regra de acesso incorreta.

Já existe o padrão certo no mesmo arquivo: `enrichedFundamentals` (linhas 30-31) já usa
`allow read: if true;` para dado de leitura pública não-sensível.

---

## 2. O que corrigir

Trocar `allow read: if request.auth.token.isAdmin == true;` por `allow read: if true;` em
`config/featureGates`. **Manter `allow write: if false;` exatamente como está** — a escrita
continua exclusiva ao Admin SDK/Cloud Function, isso não muda nesta rodada.

---

## 3. Plano de Implementação Obrigatório (Regra 8) — apresente e aguarde aprovação antes de tocar em código

**(a) Arquivos:**
- `firestore.rules` — alterar bloco `match /config/featureGates`
- Suíte `test:rules` (localizar via grep por `featureGates` — provavelmente
  `firestore.rules.test.ts` ou equivalente) — adicionar os 4 casos da Seção 4
- Nenhum outro arquivo de aplicação deve mudar nesta rodada. `useFeatureGates.ts` e
  `useFeatureGate.ts` **não** precisam de alteração — o problema é só a regra.

**(b) Lógica central:**
- Regra passa a permitir leitura pública (autenticado ou não) do documento
  `config/featureGates` — é configuração de produto, não dado pessoal (categoria
  "Preferências/Config", sensibilidade comum — ver skill `fuente-advogado-lgpd-gdpr`,
  Seção 2).
- Escrita continua bloqueada no client em **todos** os casos — nenhuma mudança de
  superfície de ataque para gravação.

**(c) Pontos de Atenção & Decisões de Arquitetura (risco → decisão):**
- **Risco:** expor a estrutura completa de `featureGates` (nomes de flags, valores atuais)
  a qualquer visitante não-autenticado via DevTools/SDK direto.
  **Decisão:** aceitável — são flags de produto (ex: `freeAssetLimit: 8`), não segredo de
  negócio crítico. Mas **liste no relatório de conclusão todos os campos hoje presentes**
  no documento, para Paulo confirmar que nenhum campo sensível foi adicionado a esse mesmo
  doc sem essa regra ter sido revisada de novo.
- **Risco:** outro documento em `config/*` pode ter sido copiado com a mesma trava de admin
  por engano, e ficar esquecido.
  **Decisão:** grep completo por `match /config/` em `firestore.rules` e liste **todos** os
  matches encontrados no relatório — mesmo os que não forem alterados — para Paulo confirmar
  que só `featureGates` precisava da mudança.
- **Risco:** teste de regra não cobrir usuário deslogado além de usuário logado não-admin.
  **Decisão:** os 4 casos da Seção 4 são obrigatórios, não opcionais.

---

## 4. Teste de Segurança Obrigatório (gate de aprovação, não sugestão)

Via Firebase Emulator (`npm run test:rules`), confirmar 4 casos:

1. Usuário **deslogado** consegue **ler** `config/featureGates` → deve **passar**
2. Usuário **autenticado não-admin** consegue **ler** `config/featureGates` → deve **passar**
3. Usuário **autenticado não-admin** tentando **escrever** em `config/featureGates` → deve
   **falhar** (`permission-denied`)
4. Usuário **admin** (`isAdmin: true`) tentando **escrever via client SDK** → deve **também
   falhar** (a regra é `if false` incondicional — escrita só via Admin SDK/Cloud Function,
   mesmo para admin). Se isso não bater com o comportamento hoje esperado pelo painel Admin
   do Prompt 87/88, **pare e sinalize** — não presuma qual dos dois está errado.

---

## 5. Governança de Roles (Regra 9) — nenhum omitido silenciosamente

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | Sim | Gate obrigatório de qualquer mudança de regra de segurança em produção |
| `fuente-solution-architect` | Sim | Mudança de regra Firestore = decisão de "security by default"; risco 🟡, registrar no relatório mesmo sem ADR formal dado o escopo contido |
| `fuente-advogado-lgpd-gdpr` | Sim | Todo acesso a documento Firestore passa pelo gate — confirmado: config de produto, sensibilidade comum, sem consentimento adicional exigido |
| `fuente-product-manager` | Sim | Classificação 🔴 Bug Crítico, SLA imediato — bloqueia o valor do Prompt 88 já gerado |
| `fuente-ux-designer` | Não | Não há mudança de interface nesta rodada |
| `fuente-investidor-iniciante` | Não | Mudança invisível ao usuário final |
| `fuente-investidor-profissional` | Não | Sem impacto direto de UX/cálculo |
| `fuente-business-architect` | Não | Sem mudança de capacidade de negócio |
| `fuente-product-marketing` | Não | Sem mudança de posicionamento/copy |

---

## 6. Gates de Verificação Final (rodar do zero, colar output literal)

```bash
npx tsc --noEmit
npm run test
npm run test:rules
npm run build
```

**Os 4 são obrigatórios** — `test:rules` incluído porque esta rodada altera regra de
segurança, não é opcional aqui mesmo que não apareça nos gates padrão de outros prompts.

---

## 7. Honestidade de execução — leia antes de reportar conclusão

Este projeto já teve contagens de teste fabricadas e "build limpo" que não estava limpo. O
relatório de conclusão **deve** incluir: (1) o diff exato de `firestore.rules`, (2) o output
literal dos 4 comandos da Seção 6 — sem paráfrase, sem "tudo passou", (3) a lista completa
de `match /config/*` pedida no item (c) da Seção 3. Se qualquer gate falhar, reporte a
falha — não contorne, não pule.

---

## 8. Entregável

Commit único: `fix(firestore): allow public read on config/featureGates [Auditoria UX 1.2]`.
Push para `dev` — **nunca `main` diretamente**. Aguardar auditoria de Claude contra o
arquivo real (Filesystem MCP ou clone GitHub `dev`) e aprovação de Paulo antes de qualquer
merge para `main`.
