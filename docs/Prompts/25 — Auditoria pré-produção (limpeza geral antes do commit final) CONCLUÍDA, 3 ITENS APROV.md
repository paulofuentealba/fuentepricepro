### 25 — Auditoria pré-produção (limpeza geral antes do commit final) ✅ CONCLUÍDA, 3 ITENS APROVADOS PENDENTES DE EXECUÇÃO (ver 25.1)

```
25 — Auditoria pré-produção (limpeza geral antes do commit final)

Contexto: as tarefas anteriores da fila resolveram problemas específicos já
identificados (CSRF, método depreciado, refatoração da Watchlist, etc.).
Esta é uma varredura mais ampla, cobrindo higiene geral que nenhuma tarefa
pontual tocou ainda, antes do commit final pra produção. É uma auditoria —
reporte o que encontrar antes de corrigir qualquer coisa que pareça exigir
decisão de produto ou risco de comportamento.

TAREFA:

1. Revisitar a versão do Nitro (Tarefa 22)
   A Tarefa 22 trocou "nitro": "3.0.260603-beta" por "^3.0.0" no
   package.json, afirmando que já existia versão estável. Isso está em
   dúvida: verificar com `npm view nitro@3.0.0 time` (ou equivalente) a
   data de publicação real dessa versão, e comparar com a documentação
   oficial do projeto (github.com/nitrojs/nitro) pra confirmar se "3.0.0"
   é uma release atual e mantida, ou uma tag antiga/órfã de antes do
   esquema de versionamento por data (3.0.260xxx-beta) que o projeto usa
   hoje. Se for uma tag antiga sem manutenção, reverter para a versão beta
   mais recente disponível e documentar que a v3 do Nitro ainda não tem
   uma linha estável oficial — não travar nisso, só deixar registrado.

2. Vazamento de segredos e configuração de ambiente
   - Confirmar que `.env` está no `.gitignore` e não existe nenhum arquivo
     de credencial real rastreado pelo git (rodar `git status` e `git log
     --all --full-history -- .env` ou equivalente)
   - Confirmar que `.env.example` existe e lista todas as variáveis de
     ambiente que o projeto realmente usa, sem valores reais
   - Buscar por chaves de API, tokens ou credenciais hardcoded no
     código-fonte (grep por padrões comuns: "api_key", "apikey",
     "secret", "AIza", "sk-", etc.) — reportar qualquer ocorrência, não
     apagar sem confirmar comigo primeiro

3. Código de debug esquecido
   - Buscar por `console.log`, `console.debug`, `debugger` fora de
     blocos já protegidos por `import.meta.env.DEV` ou
     `process.env.NODE_ENV === "development"` — reportar a lista, não
     remover tudo automaticamente (alguns `console.warn`/`console.error`
     em catch blocks são intencionais e devem ficar)

4. Regras do Firestore
   Revisar `firestore.rules` — confirmar que não há regra permissiva
   demais (ex: `allow read, write: if true` em produção) antes de ir ao
   ar. Reportar qualquer regra suspeita, não alterar sem confirmar comigo.

5. Build, lint e testes limpos
   Rodar `npm run build`, `npm run lint` e `npm run test` do zero e
   confirmar que os três passam sem erro. Reportar quaisquer avisos
   (warnings) que apareçam, mesmo que não quebrem o build.

6. Dependências não usadas
   Verificar se há pacotes em `dependencies`/`devDependencies` do
   `package.json` que não são mais importados em lugar nenhum do código
   (útil especialmente depois da Tarefa 14.1, que removeu o
   vite-tsconfig-paths — confirmar que não sobrou mais nenhum caso
   parecido). Reportar antes de remover.

7. Isolamento DEV confirmado de ponta a ponta
   Confirmar que o mecanismo de dados sintéticos (TEST_IPO_RECENTE em
   apiService.functions.ts, Tarefa 14.5) e o botão "Restore Mock Data"
   (DataManagement.tsx) estão genuinamente inacessíveis num build de
   produção (`npm run build` sem `--mode development`) — não é suficiente
   confiar no guard de código, testar de fato rodando o build de produção
   e confirmando que o botão não aparece e o interceptor não responde.

8. Arquivos que não deveriam ir pro commit
   Confirmar que `dist/` (pasta de build) está no `.gitignore` e não está
   rastreada pelo git. Mesma checagem pra qualquer pasta de output/cache
   gerada localmente.

NÃO TOCAR: nenhuma lógica de negócio muda nesta tarefa. Itens que exigem
decisão (ex: remover uma dependência que parece não usada, apagar uma
credencial encontrada, alterar uma regra do Firestore) devem ser
reportados para eu decidir, não corrigidos automaticamente — exceção pros
itens claramente mecânicos e de baixo risco (console.log solto fora de
guard de DEV pode ser removido direto, reportando o que foi removido).

CRITÉRIO DE SUCESSO: relatório único cobrindo os 8 itens acima, com
build/lint/test confirmados limpos, e uma lista clara do que foi corrigido
automaticamente vs. o que ficou pendente de decisão sua antes do commit
final para produção.
```

---