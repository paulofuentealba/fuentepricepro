# 70 — Corrigir check.py (REQUIRED_ROLES desatualizado: 6 vs 9 papéis)

## Contexto

`scripts/check.py` (linter de governança de skills) tem `REQUIRED_ROLES`
validando só 6 papéis, mas `docs/AGENTS.md` (fonte canônica, Regra 9) já
lista 9 papéis desde a rodada de governança anterior. Mesmo padrão de
drift que já causou o achado F4 original — corrigir antes que vire hábito.

## Escopo técnico

1. Ler `docs/AGENTS.md`, Regra 9, confirmar a lista exata dos 9 papéis:
   `fuente-architecture-review`, `fuente-solution-architect`,
   `fuente-business-architect`, `fuente-product-manager`,
   `fuente-product-marketing`, `fuente-ux-designer`,
   `fuente-investidor-profissional`, `fuente-investidor-iniciante`,
   `fuente-advogado-lgpd-gdpr`.
2. Atualizar `REQUIRED_ROLES` em `scripts/check.py` pra essa lista
   completa.
3. Confirmar que os 9 `SKILL.md` correspondentes existem em `skills/*/`
   (se algum estiver faltando, reportar — não criar skill novo aqui,
   fora de escopo).
4. Rodar `scripts/check.py` depois da correção e confirmar que passa
   (ou reportar exatamente o que falha, sem tentar corrigir skills
   faltantes nesta mesma rodada).

## Regras obrigatórias

- Não alterar `docs/AGENTS.md` — ele é a fonte da verdade, `check.py` é
  quem precisa se alinhar a ele, não o contrário.
- Não criar nenhum `SKILL.md` novo — só validar que os 9 já existem.

## Verificação obrigatória

1. `python scripts/check.py` (ou o comando correto de execução) rodando
   sem erro de "papel não reconhecido"
2. Diff do arquivo mostrando a lista antiga (6) vs nova (9)

## Ao terminar

Atualizar `docs/SSOT.md`, Seção 7 e item 7 da tabela de pendências,
marcando como resolvido. Trabalhar em `dev`.
