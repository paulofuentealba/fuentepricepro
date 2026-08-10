### 26 — Commit e push final pro GitHub ✅ CONCLUÍDO E CONFIRMADO (push feito, Cloud Build disparou, site em produção atualizado)

```
26 — Commit e push final pro GitHub

Contexto: todas as tarefas relevantes pra produção da fila (14.7, 22, 14.8, 
23, 25, 25.1) foram concluídas e confirmadas. Chegou a hora de subir tudo 
pro GitHub, atualizando o repositório remoto com o estado atual local.

TAREFA:

1. Antes de qualquer coisa, rodar `git status` e `git branch --show-current` 
   e me reportar: em qual branch estamos, quantos arquivos modificados/
   novos/deletados existem, e se há qualquer arquivo inesperado na lista 
   (ex: algo que deveria estar no .gitignore mas apareceu como 
   untracked — .env, node_modules, dist, etc. NÃO devem aparecer). Pausar 
   aqui e me mostrar a lista antes de continuar se houver qualquer arquivo 
   fora do esperado.

2. Rodar `git diff --stat` (ou equivalente) pra um resumo de quantos 
   arquivos mudaram e o volume de alterações, só pra eu ter noção do 
   tamanho do commit antes de prosseguir.

3. Adicionar todos os arquivos relevantes com `git add` (respeitando o 
   .gitignore, que já está correto — node_modules, dist, .output, 
   .vinxi, .nitro e .env todos excluídos)

4. Criar UM commit com mensagem clara resumindo o escopo desta sessão 
   (não precisa listar cada uma das ~15 tarefas individualmente, mas deve 
   cobrir as frentes principais). Sugestão de estrutura pro corpo da 
   mensagem:
   
   "Auditoria pré-produção: segurança, refatoração e limpeza

   - Adiciona proteção CSRF nas server functions
   - Corrige regras do Firestore (users/{userId} e subcoleção assets 
     sem regra de segurança)
   - Refatora Watchlist.tsx em componentes menores (AddAssetDropdown, 
     WatchlistKpiSection, WatchlistToolbar, WatchlistAssetGrid, 
     WatchlistDialogs)
   - Cataloga corretoras suportadas na Wiki (/app/docs#supported-brokers)
   - Reconstrói massa de dados de DEV com cobertura de casos de teste
   - Remove vite-tsconfig-paths, substitui por resolução nativa
   - Atualiza método depreciado do TanStack Start (validator)
   - Roda Prettier em toda a base de código
   - Remove scripts órfãos da raiz"
   
   Ajustar o texto acima conforme o que realmente está no diff — não 
   inventar itens que não mudaram nesta leva de commits.

5. Depois do commit criado (mas ANTES do push), rodar `git log -1 
   --stat` e me mostrar o resultado — pausar aqui pra eu confirmar antes 
   de você rodar o push de verdade.

6. Só depois da minha confirmação explícita, rodar `git push` (push 
   normal pro branch atual, sem --force e sem sobrescrever histórico)

NÃO TOCAR: nenhum comando destrutivo (`git reset --hard`, `git 
checkout` sobre arquivos não commitados, `git push --force`, `git rebase`, 
`git commit --amend`). Não criar branch nova nem mudar de branch sem eu 
pedir. Não pular a pausa de confirmação antes do push — mesmo que tudo 
pareça certo.

CRITÉRIO DE SUCESSO: um commit único, com mensagem clara e fiel ao que 
realmente mudou, revisado por mim antes do push; push feito com sucesso 
pro branch remoto sem sobrescrever nada; nenhum arquivo sensível 
(.env, credenciais, node_modules, dist) subiu junto.
```

---