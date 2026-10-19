#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_todos_extract.py — vytiahne všetky <!-- TODO: --> z MD súborov
a vygeneruje frontu úloh na miesto <!-- TODO-SUMMARY --> placeholdera.

Formát inline značky (v ľubovoľnom MD súbore):
    <!-- TODO: action | scope | prompt -->

    action  — typ úlohy: translate, link, review, image, update, content
    scope   — rozsah: názov súboru, sekcia, jazyková mutácia (SK/EN), ID článku
    prompt  — inštrukcia na vykonanie (pre skript, Claude alebo človeka)

Príklady:
    <!-- TODO: translate | K000104-05 | Preložiť celý súbor podľa EN originálu -->
    <!-- TODO: link | SK | Doplniť linku na K000105, pattern ../K000105.../index.md -->
    <!-- TODO: image | C3 | Nakopírovať screenshot parallel run do img/c3-python-execution/ -->
    <!-- TODO: review | index.md | Skontrolovať cost overview po finalizácii -->

Formát placeholdera pre súhrnnú tabuľku (v ľubovoľnom MD súbore):
    <!-- TODO-SUMMARY -->

IDEMPOTENTNÉ: zapisuje iba ak sa zmení obsah.

Použitie:
  python3 core/scripts/tools/knife_todos_extract.py \\
      --knife-dir content/docs/en/knifes/K000104-SPARX_AI_KERNARO_IN_SDLC \\
      --summary-file content/docs/en/knifes/K000104-SPARX_AI_KERNARO_IN_SDLC/index.md \\
      [--action translate] [--dry-run] [--preview]

Poznámky:
  - Skenuje všetky .md súbory v --knife-dir rekurzívne.
  - Voliteľný filter --action vypíše len úlohy daného typu.
  - Triedi podľa: action asc, scope asc, súbor asc.
  - Ak --summary-file nie je zadaný, vypíše tabuľku na stdout.
"""
import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# ---------- regex ----------

TODO_RE = re.compile(
    r'<!--\s*TODO:\s*(?P<action>[\w]+)\s*\|\s*(?P<scope>[^|]+?)\s*\|\s*(?P<prompt>[^>]+?)\s*-->',
    re.IGNORECASE
)

SUMMARY_PLACEHOLDER = '<!-- TODO-SUMMARY -->'
SUMMARY_BEGIN = '<!-- TODO-SUMMARY:BEGIN -->'
SUMMARY_END   = '<!-- TODO-SUMMARY:END -->'

GENERATED_BLOCK_RE = re.compile(
    r'<!-- TODO-SUMMARY:BEGIN -->.*?<!-- TODO-SUMMARY:END -->',
    re.DOTALL
)

VALID_ACTIONS = {'translate', 'link', 'review', 'image', 'update', 'content'}

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

def collect_todos(
    knife_dir: Path,
    summary_file: Path | None,
    action_filter: str | None
) -> List[Tuple[str, str, str, Path]]:
    """Vráti zoznam (action, scope, prompt, src_file)."""
    results = []
    for md in sorted(knife_dir.rglob('*.md')):
        if summary_file and md.resolve() == summary_file.resolve():
            continue
        text = read_text(md)
        for m in TODO_RE.finditer(text):
            action = m.group('action').strip().lower()
            if action_filter and action != action_filter.lower():
                continue
            results.append((
                action,
                m.group('scope').strip(),
                m.group('prompt').strip(),
                md,
            ))
    results.sort(key=lambda r: (r[0], r[1], r[3].name))
    return results


# ---------- render ----------

def render_table(todos: List[Tuple[str, str, str, Path]], ref_file: Path) -> str:
    if not todos:
        return (
            f"{SUMMARY_BEGIN}\n"
            "_Žiadne otvorené úlohy._\n"
            f"{SUMMARY_END}"
        )

    lines = [
        SUMMARY_BEGIN,
        "| Action | Scope | Prompt | Súbor |",
        "|---|---|---|---|",
    ]
    for action, scope, prompt, src_file in todos:
        rel = relative_link(src_file, ref_file)
        lines.append(f"| `{action}` | {scope} | {prompt} | [{src_file.name}]({rel}) |")
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
    parser = argparse.ArgumentParser(description='Extrakt TODO značiek a generovanie fronty úloh.')
    parser.add_argument('--knife-dir', required=True,
                        help='Koreňový adresár KNIFE položky (skenuje rekurzívne)')
    parser.add_argument('--summary-file',
                        help='MD súbor s <!-- TODO-SUMMARY --> placeholderom (voliteľné; ak chýba, vypíše na stdout)')
    parser.add_argument('--action',
                        help=f'Filter podľa typu akcie: {", ".join(sorted(VALID_ACTIONS))}')
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
    if args.action and args.action.lower() not in VALID_ACTIONS:
        print(f"✗ Neznámy action '{args.action}'. Povolené: {', '.join(sorted(VALID_ACTIONS))}", file=sys.stderr)
        sys.exit(1)

    todos = collect_todos(knife_dir, summary_file, args.action)
    print(f"Nájdených TODO: {len(todos)}")
    for action, scope, prompt, src in todos:
        print(f"  [{action}] {scope} — {prompt[:60]}{'…' if len(prompt) > 60 else ''}  ({src.name})")

    if not todos:
        return

    ref_file = summary_file if summary_file else knife_dir / 'index.md'
    table = render_table(todos, ref_file)

    if summary_file:
        changed = inject_summary(summary_file, table, args.dry_run, args.preview)
        if not args.dry_run:
            print(f"{'✓ Aktualizované' if changed else '— Bez zmeny'}: {summary_file}")
    else:
        print()
        print(table)


if __name__ == '__main__':
    main()
