Prompt 128 — Aplicar paleta Colheita [Item 0.1]

CONTEXTO
Referência: docs/design/v6/prototipo-v6.html (já versionado no repo, commit e0747f0).
A paleta terrosa (musgo + ouro) substitui o azul/roxo atual.

ESCOPO — ARQUIVO ÚNICO
- src/styles.css

TAREFA
Converter para oklch e substituir os valores. NÃO alterar a estrutura de
@theme inline, NÃO adicionar/remover/renomear variáveis.

Modo claro (:root)
background #f6f2ea · card #fffdf8 · foreground #14201a
muted-foreground rgba(20,32,26,.52) · border rgba(20,32,26,.12)
primary #1c4a34 · primary-foreground #f6f2ea
accent #c99a3a · accent-foreground #14201a
success #2f6b4c · warning #a97a1f · destructive #b5533a
sidebar #0e2a1f · sidebar-foreground #f6f2ea · sidebar-primary #1c4a34
sidebar-accent #e9c877

Modo escuro (.dark)
background #0a1410 · card #131f18 · foreground #e9e3d5
muted-foreground rgba(233,227,213,.52) · border rgba(233,227,213,.13)
primary #245c40 · accent #e9c877
success #57a97b · warning #e9c877 · destructive #e2795e
sidebar #08110d · sidebar-foreground #e9e3d5 · sidebar-accent #f0d792

REQUISITOS
1. TODAS as cores em oklch.
2. Contraste mínimo AA (4.5:1). REPORTAR o valor calculado para, em AMBOS
   os modos: foreground/background, muted-foreground/background,
   accent/background, destructive/background, success/background.
3. Cor que não atingir AA deve ter luminosidade ajustada, com o ajuste
   DECLARADO no relatório. Não silenciar.
4. Fontes: confirmar se Fraunces já está carregada. O protótipo usa
   Fraunces (números e títulos), Space Grotesk (UI) e JetBrains Mono (dados).
   REPORTAR quais já existem e quais faltam — mas NÃO adicionar fonte nova
   neste prompt.

PROIBIDO
- Alterar qualquer arquivo além de src/styles.css
- Adicionar/remover/renomear variáveis
- Hex ou rgb no arquivo final
- Alterar --radius ou tokens não-cromáticos

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-ux-designer | SIM | define e valida a paleta |
| fuente-architecture-review | SIM | gate do diff |
| fuente-investidor-iniciante | SIM | legibilidade e confiança |
| fuente-investidor-profissional | SIM | sobriedade e densidade |
| fuente-solution-architect | NÃO | troca de valores, sem decisão estrutural |
| fuente-product-manager | NÃO | já priorizado |
| fuente-business-architect | NÃO | não afeta capacidades |
| fuente-product-marketing | NÃO | posicionamento tratado no Prompt 130 |
| fuente-advogado-lgpd-gdpr | NÃO | não toca dado pessoal |

COMMIT
style(design-system): aplica paleta Colheita em oklch [Item 0.1]

---

Envie o diff completo antes do commit, junto com a tabela de contraste
calculada. Vou conferir contra src/styles.css real (local + remoto) antes
de aprovar.
