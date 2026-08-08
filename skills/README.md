# Skills — Fuente Price Pro

## Por que isso existe

Os skills são instalados no Claude, mas até agora não viviam em lugar nenhum
versionado. Consequência real já observada: o `fuente-architecture-review`
ganhou a Regra 9 numa sessão, o arquivo foi gerado, e a versão instalada
continuou com 8 regras — divergência silenciosa que ninguém pegou. Esta
pasta é a correção disso.

É o mesmo problema que a **Regra 1 (reusabilidade)** e a **Regra 4 (SSOT)**
do `AGENTS.md` resolvem no código, aplicado à camada de skills.

## Estrutura

```
skills/
  MANIFEST.json                        # hashes — detecta edição sem regeneração
  fuente-architecture-review/SKILL.md  # 9 regras (canônico)
  fuente-solution-architect/SKILL.md
  fuente-business-architect/SKILL.md
  fuente-product-manager/SKILL.md
  fuente-product-marketing/SKILL.md
  fuente-ux-designer/SKILL.md
scripts/
  check.py
```

## Uso

```bash
python3 scripts/check.py              # valida (exit 1 se falhar)
python3 scripts/check.py --manifest   # regenera MANIFEST.json após editar
```

## O que é verificado

| Verificação | Falha quando |
|---|---|
| Frontmatter | `name` ou `description` ausente, mal formado, ou `name` ≠ nome da pasta |
| Formato do `name` | Não é kebab-case minúsculo, ou excede 64 chars |
| `description` | Excede 1024 chars (limite da plataforma) |
| Corpo | Menor que 200 chars — stub disfarçado de skill |
| Referências cruzadas | Um skill cita `fuente-*` que não existe |
| **Regra 9** | Algum dos 6 papéis obrigatórios está ausente |
| **Sincronia AGENTS.md** | O skill de review cobre menos regras que o `AGENTS.md` |
| **Drift de conteúdo** | SKILL.md foi editado sem regenerar o `MANIFEST.json` |

Avisos (não bloqueiam): `description` curta demais para acionar bem,
`description` sem menção ao projeto, skill fora dos 6 papéis canônicos.

## Fluxo de alteração

1. Editar o `SKILL.md`
2. `python3 scripts/check.py --manifest`
3. Commitar skill + manifesto juntos
4. **Reinstalar o skill no Claude** — o repo é a fonte, a instalação é a cópia

O passo 4 é o que foi esquecido no caso da Regra 9. O `check.py` garante a
consistência do repositório; a reinstalação é manual e continua sendo
responsabilidade sua.

## Pre-commit (opcional)

```bash
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/sh
python3 scripts/check.py || exit 1
EOF
chmod +x .git/hooks/pre-commit
```

## Ao adicionar um papel novo

Incluir o nome em `REQUIRED_ROLES` no `check.py` — caso contrário ele passa
como aviso, não como parte do conjunto canônico da Regra 9.
