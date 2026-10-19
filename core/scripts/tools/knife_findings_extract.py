#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_findings_extract.py — vytiahne všetky <!-- FINDING: --> z MD súborov
a vygeneruje tabuľku nálezov na miesto <!-- FINDING-SUMMARY --> placeholdera.

Formát inline značky (v ľubovoľnom MD súbore):
    <!-- FINDING: #C3-1 | Short Name | Description text | source-file.md#anchor -->

Formát placeholdera pre súhrnú tabuľku (v ľubovoľnom MD súbore):
    <!-- FINDING-SUMMARY -->

IDEMPOTENTNÉ: zapisuje iba ak sa zmení obsah.

Použitie:
  python3 core/scripts/tools/knife_findings_extract.py \\
      --knife-dir content/docs/en/knifes/K000104-SPARX_AI_KERNARO_IN_SDLC \\
      --summary-file content/docs/en/knifes/K000104-SPARX_AI_KERNARO_IN_SDLC/07-KERNARO-Test-Findings/kernaro-test-findings.md \\
      [--dry-run] [--preview]

Poznámky:
  - Hľadá FINDING značky vo všetkých .md súboroch v --knife-dir (rekurzívne).
  - Ignoruje samotný --summary-file pri zbere (aby nevznikali duplikáty pri re-run).
  - Ak --summary-file neobsahuje <!-- FINDING-SUMMARY -->, vypíše varovanie a skončí.
  - Triedi nálezy podľa ID (lexikograficky: C1-1, C1-2, C2-1 ...).
"""
import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# ---------- regex ----------

FINDING_RE = re.compile(
    r'<!--\s*FINDING:\s*(?P<id>#[\w\-]+)\s*\|\s*(?P<name>[^|]+?)\s*\|\s*(?P<desc>[^|]+?)\s*\|\s*(?P<src>[^>]+?)\s*-->',
    re.IGNORECASE
)

SUMMARY_PLACEHOLDER = '<!-- FINDING-SUMMARY -->'

SUMMARY_BEGIN = '<!-- FINDING-SUMMARY:BEGIN -->'
SUMMARY_END   = '<!-- FINDING-SUMMARY:END -->'

GENERATED_BLOCK_RE = re.compile(
    r'<!-- FINDING-SUMMARY:BEGIN -->.*?<!-- FINDING-SUMMARY:END -->',
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


def relative_link(src_file: Path, summary_file: Path) -> str:
    """Relatívna cesta z adresára summary_file na src_file."""
    return os.path.relpath(src_file, summary_file.parent).replace('\\', '/')


# ---------- extract ----------

def collect_findings(knife_dir: Path, summary_file: Path) -> List[Tuple[str, str, str, str, Path]]:
    """Vráti zoznam (id, name, desc, src_anchor, src_file) zo všetkých MD súborov."""
    results = []
    for md in sorted(knife_dir.rglob('*.md')):
        if md.resolve() == summary_file.resolve():
            continue
        text = read_text(md)
        for m in FINDING_RE.finditer(text):
            results.append((
                m.group('id').strip(),
                m.group('name').strip(),
                m.group('desc').strip(),
                m.group('src').strip(),
                md,
            ))
    results.sort(key=lambda r: r[0])
    return results


# ---------- render ----------

def render_table(findings: List[Tuple[str, str, str, str, Path]], summary_file: Path) -> str:
    if not findings:
        return (
            f"{SUMMARY_BEGIN}\n"
            "_No findings recorded yet._\n"
            f"{SUMMARY_END}"
        )

    lines = [
        SUMMARY_BEGIN,
        "| # | Finding | Description | Source |",
        "|---|---|---|---|",
    ]
    for fid, name, desc, src_anchor, src_file in findings:
        rel = relative_link(src_file, summary_file)
        # ak src_anchor obsahuje #, použi ho priamo; inak pridaj odkaz na súbor
        if '#' in src_anchor:
            anchor_part = src_anchor.split('#', 1)[1]
            link = f"[{src_file.name}](  {rel}#{anchor_part})"
        else:
            link = f"[{src_file.name}]({rel})"
        lines.append(f"| `{fid}` | {name} | {desc} | {link} |")
    lines.append(SUMMARY_END)
    return '\n'.join(lines)


# ---------- inject ----------

def inject_summary(summary_file: Path, table: str, dry_run: bool, preview: bool) -> bool:
    text = read_text(summary_file)

    # ak existuje starý vygenerovaný blok, nahraď ho
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
    parser = argparse.ArgumentParser(description='Extrakt FINDING značiek a generovanie súhrnnej tabuľky.')
    parser.add_argument('--knife-dir', required=True,
                        help='Koreňový adresár KNIFE položky (skenuje rekurzívne)')
    parser.add_argument('--summary-file', required=True,
                        help='MD súbor obsahujúci <!-- FINDING-SUMMARY --> placeholder')
    parser.add_argument('--dry-run', action='store_true',
                        help='Iba ukáž či by sa zmenil súbor, nezapisuj')
    parser.add_argument('--preview', action='store_true',
                        help='Vypíš vygenerovanú tabuľku na stdout')
    args = parser.parse_args()

    knife_dir = Path(args.knife_dir)
    summary_file = Path(args.summary_file)

    if not knife_dir.is_dir():
        print(f"✗ --knife-dir neexistuje: {knife_dir}", file=sys.stderr)
        sys.exit(1)
    if not summary_file.is_file():
        print(f"✗ --summary-file neexistuje: {summary_file}", file=sys.stderr)
        sys.exit(1)

    findings = collect_findings(knife_dir, summary_file)
    print(f"Nájdených nálezov: {len(findings)}")
    for fid, name, _, _, src in findings:
        print(f"  {fid}  {name}  ({src.name})")

    table = render_table(findings, summary_file)
    changed = inject_summary(summary_file, table, args.dry_run, args.preview)

    if not args.dry_run:
        if changed:
            print(f"✓ Aktualizované: {summary_file}")
        else:
            print(f"— Bez zmeny: {summary_file}")


if __name__ == '__main__':
    main()
