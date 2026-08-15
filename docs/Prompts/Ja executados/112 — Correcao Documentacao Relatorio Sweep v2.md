# PROMPT 112 — Correção de Documentação: Relatório do Sweep v2
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Este prompt NÃO altera código de produção — só corrige o próprio
> documento de relatório (`docs/Prompts/RESULTADO - SUPER_PROMPT_v2_...md`)
> para que o histórico do projeto fique preciso. É documentação, não
> funcionalidade.

---

## Contexto

Revisão cruzada do relatório `RESULTADO - SUPER_PROMPT_v2_Code_Sweep_Arquitetural_Definitivo.md`
contra o código real de `dev` encontrou 2 imprecisões que precisam ser
corrigidas no próprio documento, para não distorcer o histórico de
auditoria do projeto:

### 1. Falso Positivo na Tabela 3 (Performance & Dívida Técnica)
O achado "`ComparatorPerformanceChart.tsx:45-75` — chartData sem
`useMemo`" está **incorreto**. `chartData` já está corretamente
envolvido em `useMemo` (linha 109, com array de dependências
completo). Este item:
- Deve ser **removido** da Tabela 3.
- Deve ser **removido** da Tabela 4 (RICE) — a linha
  "Memoização no ComparatorPerformanceChart" não deveria ter recebido
  pontuação nem prioridade P2.
- Adicionar uma nota no relatório reconhecendo a correção, para
  rastreabilidade (não apagar silenciosamente — registrar que foi
  corrigido após revisão cruzada).

### 2. Campos Incorretos na Tabela 5 (LGPD) — linha "Gestão de Acessos Admin"
O relatório descreve os campos retornados por `listUsersFn` como
incluindo `uid`, `isAdmin`, `isSubscriber`. **Isso não corresponde ao
código real.** A interface real (`AdminUserRow` em
`src/lib/api/admin.ts:143-150`) retorna:
```ts
{
  displayName: string | null;
  email: string | null;
  subscriptionStatus: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  providerId: string | null;
}
```
Nota: o próprio código tem um comentário explícito confirmando que
`uid` é deliberadamente omitido ("no `uid`, per Prompt 88 §2.1 literal
wording"). O veredito da linha ("✅ Conforme — minimização") continua
correto, mas a lista de campos descrita precisa ser corrigida para
bater com a interface real.

## Tarefa

1. Editar `docs/Prompts/RESULTADO - SUPER_PROMPT_v2_Code_Sweep_Arquitetural_Definitivo.md`
   (ou o caminho correto onde esse relatório vive após qualquer
   reorganização de pasta) aplicando as 2 correções acima.
2. Não alterar nenhum outro conteúdo do relatório além destes 2
   pontos — as demais tabelas já foram verificadas como precisas e
   não devem ser tocadas.
3. Adicionar uma seção curta no topo ou rodapé do documento:
   "Correções pós-publicação (verificadas por Claude em revisão
   cruzada, [data]): 2 itens corrigidos — ver histórico de commit
   deste arquivo para o texto original."

## Gate de Saída
- Confirmar que o arquivo editado ainda é Markdown válido (sem quebrar
  formatação de tabela).
- Commit separado, mensagem clara: `docs: correct 2 inaccuracies in Sweep v2 report (false positive + wrong field list) [Prompt 112]`.
- Não há gate de `tsc`/`test`/`build` — é edição de documentação, não
  de código.

## Proibido
- Não editar nenhuma outra tabela ou achado do relatório além dos 2
  pontos especificados.
- Não re-executar o sweep inteiro nesta rodada — é correção pontual
  de documento, não nova auditoria.
