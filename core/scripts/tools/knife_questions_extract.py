#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_questions_extract.py — vytiahne všetky <!-- QUESTION: --> z MD súborov
a vygeneruje tabuľku otázok na miesto <!-- QUESTION-SUMMARY --> placeholdera.

Formát inline značky (v ľubovoľnom MD súbore):
    <!-- QUESTION: #ID | Title | Question text | Addressee -->

    #ID        — unikátny identifikátor, napr. #Q-C3-1
    Title      — krátky názov otázky
    Question   — konkrétna otázka (prompt pre adresáta)
    Addressee  — komu je otázka určená: SparxTeam, KernaroTeam, Anthropic, Internal

Príklady:
    <!-- QUESTION: #Q-C3-1 | Parallel Agent Execution | Why did 2 agents run simultaneously on EA_OnPostCloseDiagram after priority adjustment? | SparxTeam -->
    <!-- QUESTION: #Q-C3-2 | execute_python Not Invoked | Is execute_python intentionally lower priority than built-in EA tools, or is this a configuration issue? | KernaroTeam -->
    <!-- QUESTION: #Q-C2-1 | MDG Stereotype Scope | Does the APV metamodel validation work across packages or only within the active diagram package? | Internal -->

Formát placeholdera pre súhrnnú tabuľku:
    <!-- QUESTION-SUMMARY -->

IDEMPOTENTNÉ: zapisuje iba ak sa zmení obsah.

Použitie:
  python3 core/scripts/tools/knife_questions_extract.py \\
      --knife-dir content/docs/en/knifes/K000104-SPARX_AI_KERNARO_IN_SDLC \\
      --summary-file content/docs/en/knifes/K000104-SPARX_AI_KERNARO_IN_SDLC/07-KERNARO-Test-Findings/kernaro-test-findings.md \\
      [--addressee SparxTeam] [--dry-run] [--preview]

Poznámky:
  - Skenuje všetky .md súbory v --knife-dir rekurzívne.
  - Voliteľný filter --addressee vypíše len otázky pre daného adresáta.
  - Triedi podľa: addressee asc, ID asc.
  - Ak --summary-file nie je zadaný, vypíše tabuľku na stdout.
"""
import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# ---------- regex ----------

QUESTION_RE = re.compile(
    r'<!--\s*QUESTION:\s*(?P<qid>#[\w\-]+)\s*\|\s*(?P<title>[^|]+?)\s*\|\s*(?P<question>[^|]+?)\s*\|\s*(?P<addressee>[^>]+?)\s*-->',
    re.IGNORECASE
)

SUMMARY_PLACEHOLDER = '<!-- QUESTION-SUMMARY -->'
SUMMARY_BEGIN = '<!-- QUESTION-SUMMARY:BEGIN -->'
SUMMARY_END   = '<!-- QUESTION-SUMMARY:END -->'

GENERATED_BLOCK_RE = re.compile(
    r'<!-- QUESTION-SUMMARY:BEGIN -->.*?<!-- QUESTION-SUMMARY:END -->',
    re.DOTALL
)

# ---------- helpers ----------

def read_text(p: Path) -> str:
    return p.read_text(encoding='utf-8')


def write_text_if_changed(p: Path, new_text: str) -> bool:
    old = p.read_text(encoding='utf-8') if p.exists() else None
    if old == new_text:
        return False
    p.write_text(new_text, encoding='utf-8')
    return True


def relative_link(src_file: Path, ref_file: Path) -> str:
    return os.path.relpath(src_file, ref_file.parent).replace('\\', '/')


# ---------- extract ----------

def collect_questions(
    knife_dir: Path,
    summary_file: Path | None,
    addressee_filter: str | None
) -> List[Tuple[str, str, str, str, Path]]:
    """Vráti zoznam (qid, title, question, addressee, src_file)."""
    results = []
    for md in sorted(knife_dir.rglob('*.md')):
        if summary_file and md.resolve() == summary_file.resolve():
            continue
        text = read_text(md)
        for m in QUESTION_RE.finditer(text):
            addressee = m.group('addressee').strip()
            if addressee_filter and addressee.lower() != addressee_filter.lower():
                continue
            results.append((
                m.group('qid').strip(),
                m.group('title').strip(),
                m.group('question').strip(),
                addressee,
                md,
            ))
    results.sort(key=lambda r: (r[3].lower(), r[0]))
    return results


# ---------- render ----------

def render_table(questions: List[Tuple[str, str, str, str, Path]], ref_file: Path) -> str:
    if not questions:
        return (
            f"{SUMMARY_BEGIN}\n"
            "_Žiadne otvorené otázky._\n"
            f"{SUMMARY_END}"
        )

    lines = [
        SUMMARY_BEGIN,
        "| # | Title | Question | Addressee | Source |",
        "|---|---|---|---|---|",
    ]
    for qid, title, question, addressee, src_file in questions:
        rel = relative_link(src_file, ref_file)
        anchor = qid.lstrip('#').lower().replace('-', '-')
        lines.append(
            f"| `{qid}` | {title} | {question} | `{addressee}` | [{src_file.name}]({rel}#{anchor}) |"
        )
    lines.append(SUMMARY_END)
    return '\n'.join(lines)


# ---------- inject ----------

def inject_summary(summary_file: Path, table: str, dry_run: bool, preview: bool) -> bool:
    text = read_text(summary_file)

    if GENERATED_BLOCK_RE.search(text):
        new_text = GENERATED_BLOCK_RE.sub(table, text, count=1)
    elif SUMMARY_PLACEHOLDER in text:
        new_text = text.replace(SUMMARY_PLACEHOLDER, table, 1)
    else:
        print(f"⚠  Placeholder '{SUMMARY_PLACEHOLDER}' nenájdený v {summary_file}", file=sys.stderr)
        return False

    if preview:
        print(table)

    if dry_run:
        changed = new_text != text
        print(f"{'ZMENENÉ' if changed else 'BEZ ZMENY'} (dry-run): {summary_file}")
        return changed

    return write_text_if_changed(summary_file, new_text)


# ---------- main ----------

def main():
    parser = argparse.ArgumentParser(description='Extrakt QUESTION značiek a generovanie tabuľky otázok.')
    parser.add_argument('--knife-dir', required=True,
                        help='Koreňový adresár KNIFE položky (skenuje rekurzívne)')
    parser.add_argument('--summary-file',
                        help='MD súbor s <!-- QUESTION-SUMMARY --> placeholderom (voliteľné; ak chýba, vypíše na stdout)')
    parser.add_argument('--addressee',
                        help='Filter podľa adresáta, napr. SparxTeam, KernaroTeam, Anthropic, Internal')
    parser.add_argument('--dry-run', action='store_true',
                        help='Iba ukáž či by sa zmenil súbor, nezapisuj')
    parser.add_argument('--preview', action='store_true',
                        help='Vypíš vygenerovanú tabuľku na stdout')
    args = parser.parse_args()

    knife_dir = Path(args.knife_dir)
    summary_file = Path(args.summary_file) if args.summary_file else None

    if not knife_dir.is_dir():
        print(f"✗ --knife-dir neexistuje: {knife_dir}", file=sys.stderr)
        sys.exit(1)
    if summary_file and not summary_file.is_file():
        print(f"✗ --summary-file neexistuje: {summary_file}", file=sys.stderr)
        sys.exit(1)

    questions = collect_questions(knife_dir, summary_file, args.addressee)
    print(f"Nájdených QUESTION: {len(questions)}")
    for qid, title, question, addressee, src in questions:
        print(f"  {qid}  [{addressee}]  {title}  ({src.name})")

    if not questions:
        return

    ref_file = summary_file if summary_file else knife_dir / 'index.md'
    table = render_table(questions, ref_file)

    if summary_file:
        changed = inject_summary(summary_file, table, args.dry_run, args.preview)
        if not args.dry_run:
            print(f"{'✓ Aktualizované' if changed else '— Bez zmeny'}: {summary_file}")
    else:
        print()
        print(table)


if __name__ == '__main__':
    main()
