#!/usr/bin/env python3
"""Valida os skills do Fuente Price Pro (skills/*/SKILL.md).

Uso:
    python3 scripts/check.py              # valida (exit 1 se falhar)
    python3 scripts/check.py --manifest   # regenera skills/MANIFEST.json após editar
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = REPO_ROOT / "skills"
MANIFEST_PATH = SKILLS_DIR / "MANIFEST.json"
AGENTS_MD_PATH = REPO_ROOT / "docs" / "AGENTS.md"

REQUIRED_ROLES = {
    "fuente-architecture-review",
    "fuente-solution-architect",
    "fuente-business-architect",
    "fuente-product-manager",
    "fuente-product-marketing",
    "fuente-ux-designer",
}

NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

errors: list[str] = []
warnings: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def parse_frontmatter(text: str) -> dict[str, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}
    fm: dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        fm[key.strip()] = value.strip()
    return fm


def check_skill(skill_dir: Path) -> dict | None:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        fail(f"{skill_dir.name}: SKILL.md ausente")
        return None

    text = skill_md.read_text(encoding="utf-8")
    fm = parse_frontmatter(text)

    name = fm.get("name")
    if not name:
        fail(f"{skill_dir.name}: frontmatter sem 'name'")
    elif name != skill_dir.name:
        fail(f"{skill_dir.name}: 'name' no frontmatter ('{name}') != nome da pasta")
    elif not NAME_RE.match(name) or len(name) > 64:
        fail(f"{skill_dir.name}: 'name' não é kebab-case válido ou excede 64 chars")

    description = fm.get("description")
    if not description:
        fail(f"{skill_dir.name}: frontmatter sem 'description'")
    else:
        if len(description) > 1024:
            fail(f"{skill_dir.name}: 'description' excede 1024 chars")
        if len(description) < 60:
            warn(f"{skill_dir.name}: 'description' curta demais para acionar bem")
        if "fuente" not in description.lower() and "price pro" not in description.lower():
            warn(f"{skill_dir.name}: 'description' não menciona o projeto")

    body = FRONTMATTER_RE.sub("", text, count=1).strip()
    if len(body) < 200:
        fail(f"{skill_dir.name}: corpo do SKILL.md menor que 200 chars — stub disfarçado de skill")

    for ref in re.findall(r"`(fuente-[a-z-]+)`", body):
        if ref != skill_dir.name and (SKILLS_DIR / ref).is_dir() is False:
            fail(f"{skill_dir.name}: referencia '{ref}' que não existe em skills/")

    if skill_dir.name not in REQUIRED_ROLES:
        warn(f"{skill_dir.name}: fora dos 6 papéis canônicos da Regra 9")

    sha256 = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return {"name": skill_dir.name, "sha256": sha256}


def check_rule9_coverage(found: set[str]) -> None:
    missing = REQUIRED_ROLES - found
    if missing:
        fail(f"Regra 9: papel(éis) obrigatório(s) ausente(s) em skills/: {', '.join(sorted(missing))}")


def check_agents_md_sync() -> None:
    if not AGENTS_MD_PATH.is_file():
        warn(f"AGENTS.md não encontrado em {AGENTS_MD_PATH.relative_to(REPO_ROOT)} — não foi possível checar sincronia")
        return

    agents_text = AGENTS_MD_PATH.read_text(encoding="utf-8")
    review_skill = SKILLS_DIR / "fuente-architecture-review" / "SKILL.md"
    if not review_skill.is_file():
        return  # já reportado por check_skill

    review_text = review_skill.read_text(encoding="utf-8")

    agents_rule_numbers = set(re.findall(r"^\s*(?:📐|🌍|🔒|🎯|📱|🎨|📖|📋|🧭)?\s*(\d+)\.\s", agents_text, re.MULTILINE))
    review_rule_numbers = set(re.findall(r"^### (\d+)\.\s", review_text, re.MULTILINE))

    missing_in_review = agents_rule_numbers - review_rule_numbers
    if missing_in_review:
        fail(
            "AGENTS.md sync: fuente-architecture-review não cobre a(s) regra(s) "
            f"{', '.join(sorted(missing_in_review, key=int))} presentes no AGENTS.md. "
            "O skill de review precisa refletir todas as regras do AGENTS.md."
        )


def write_manifest(skills: list[dict]) -> None:
    MANIFEST_PATH.write_text(
        json.dumps({"skills": sorted(skills, key=lambda s: s["name"])}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"✍️  MANIFEST.json regravado com {len(skills)} skills")


def check_manifest_fresh(skills: list[dict]) -> None:
    """Detecta skill editado sem regenerar o manifesto (drift silencioso)."""
    if not MANIFEST_PATH.is_file():
        warn("MANIFEST.json ausente — rode: python3 scripts/check.py --manifest")
        return

    try:
        stored = {s["name"]: s["sha256"] for s in json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))["skills"]}
    except (json.JSONDecodeError, KeyError) as exc:
        fail(f"MANIFEST.json ilegível: {exc}")
        return

    for s in skills:
        if s["name"] not in stored:
            fail(f"{s['name']}: ausente do MANIFEST.json — rode --manifest")
        elif stored[s["name"]] != s["sha256"]:
            fail(f"{s['name']}: conteúdo divergiu do MANIFEST.json — rode --manifest e revise o diff")

    for name in stored:
        if name not in {s["name"] for s in skills}:
            fail(f"{name}: consta no MANIFEST.json mas não existe em skills/")


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida os skills do Fuente Price Pro")
    parser.add_argument("--manifest", action="store_true", help="regenera skills/MANIFEST.json")
    args = parser.parse_args()

    if not SKILLS_DIR.is_dir():
        print(f"❌ Diretório não encontrado: {SKILLS_DIR}")
        return 1

    dirs = sorted(d for d in SKILLS_DIR.iterdir() if d.is_dir())
    if not dirs:
        print("❌ Nenhum skill encontrado em skills/")
        return 1

    print(f"🔍 Validando {len(dirs)} skills em {SKILLS_DIR.relative_to(REPO_ROOT)}/\n")

    skills = [s for d in dirs if (s := check_skill(d))]
    check_rule9_coverage({d.name for d in dirs})
    check_agents_md_sync()

    if args.manifest:
        write_manifest(skills)
    else:
        check_manifest_fresh(skills)

    for w in warnings:
        print(f"⚠️  {w}")
    for e in errors:
        print(f"❌ {e}")

    print()
    if errors:
        print(f"❌ {len(errors)} erro(s), {len(warnings)} aviso(s) — push bloqueado")
        return 1

    print(f"✅ {len(skills)} skills válidos, {len(warnings)} aviso(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
