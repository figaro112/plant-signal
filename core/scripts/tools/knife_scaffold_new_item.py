#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_scaffold_new_item.py — Generator nového content itemu zo šablón

Použitie (príklady):
  python3 core/scripts/tools/knife_scaffold_new_item.py \
    --template core/templates/content/knife \
    --fm-core core/templates/system/FM-Core.md \
    --dest-root content/docs \
    --title "EA – Modelovanie a motivácia" \
    --dao knife \
    --locale sk

Make (príklad):
  make newItem T=knife TITLE="EA – Modelovanie a motivácia" L=sk

Správanie:
- Určí cieľový adresár podľa --dao a --locale:
    dao=knife  -> {dest-root}/{locale}/knifes/
    iné dao    -> {dest-root}/{locale}/
- Vygeneruje ďalší voľný kód pre KNIFE: K###### (6 číslic) + slug tail podľa title
  * Preferuje počítadlo v {template}/INDEX_COUNTER.txt (ak existuje; obsahuje integer)
  * Ak chýba, prehľadá cieľ a vezme max+1 zo všetkých K######
- Skopíruje CELÚ štruktúru šablóny do cieľa (zachová podpriečinky: static, img, ap, video, ...)
- Vytvorí index.md z FM-Core (zachová inline komentáre), doplní kľúče:
    id (K######), guid (UUID4), dao, title, status, privacy, author, created (UTC YYYY-MM-DD),
    modified (placeholder), locale
- Pridá user header (fm-visible) pod H1
- Zapíše záznam do CSV histórie: config/inputs/KNIFES-OVERVIEW-INPUTs.history.csv
    stĺpce: id,guid,dao,title,status,created,locale,path

Idempotencia:
- Ak cieľová cesta už existuje, skript skončí chybou (nič neprepíše).
"""
import argparse
import os
import re
import shutil
import sys
import uuid
from datetime import datetime
from typing import Optional

# ---------------- I/O helpers ----------------

def read_text(p: str) -> str:
    with open(p, 'r', encoding='utf-8') as f:
        return f.read()


def write_text(p: str, s: str):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def copy_tree(src: str, dst: str):
    if not os.path.exists(src):
        return
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        out_dir = os.path.join(dst, rel) if rel != '.' else dst
        os.makedirs(out_dir, exist_ok=True)
        for name in files:
            sp = os.path.join(root, name)
            dp = os.path.join(out_dir, name)
            shutil.copy2(sp, dp)


# ---------------- FM helpers ----------------
FM_START_RE = re.compile(r'^\s*---\s*\n', re.MULTILINE)
FM_END_RE = re.compile(r'\n---\s*\n')


def extract_first_fm_block_raw(text: str) -> str:
    """Vráti raw text prvého FM bloku (bez --- delimítrov)."""
    m1 = FM_START_RE.search(text)
    if not m1:
        return ''
    m2 = FM_END_RE.search(text[m1.end():])
    if not m2:
        return ''
    return text[m1.end(): m1.end() + m2.start()]


def replace_fm_kv_line(fm_raw: str, key: str, value: str) -> str:
    """Nahradí riadok `key: ...` v raw FM za `key: "value"`, zachová trailing inline komentár po #, ak je.
    Ak kľúč neexistuje, doplní ho na koniec FM.
    """
    pattern = re.compile(rf'^(?P<prefix>\s*{re.escape(key)}\s*:\s*)(?P<val>.*?)(?P<comment>\s+#.*)?$', re.MULTILINE)

    def _repl(m):
        comment = m.group('comment') or ''
        return f"{m.group('prefix')}\"{value}\"{comment}"

    new_text, n = pattern.subn(_repl, fm_raw, count=1)
    if n == 0:
        if not fm_raw.endswith('\n'):
            fm_raw += '\n'
        new_text = fm_raw + f'{key}: "{value}"\n'
    return new_text


def parse_fm_to_dict(fm_raw: str) -> dict:
    """Veľmi jednoduchý parser: kľúč: "hodnota" -> dict (iba single-line stringy a [] listy)."""
    out = {}
    for line in fm_raw.splitlines():
        s = line.strip()
        if not s or s.startswith('#'):
            continue
        if ':' not in s:
            continue
        k, v = s.split(':', 1)
        k = k.strip()
        v = v.strip()
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        out[k] = v
    return out


def build_fm_visible_block(fm: dict) -> str:
    guid = fm.get('guid', '')
    status = fm.get('status', '')
    author = fm.get('author', '')
    license_ = fm.get('license', 'CC-BY-NC-SA-4.0')
    lines = [
        '<!-- fm-visible: start -->',
        f'> **GUID:** `{guid}`',
        f'> **Status:** `{status}` · **Author:** {author} · **License:** {license_}',
        '<!-- fm-visible: end -->',
    ]
    return "\n" + "\n".join(lines) + "\n"


def slugify(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r'[ÁÄČĎÉÍĹĽŇÓÔŘŔŠŤÚÝŽ]', lambda m: {
        'Á':'a','Ä':'a','Č':'c','Ď':'d','É':'e','Í':'i','Ĺ':'l','Ľ':'l','Ň':'n','Ó':'o','Ô':'o','Ř':'r','Ŕ':'r','Š':'s','Ť':'t','Ú':'u','Ý':'y','Ž':'z'
    }[m.group(0)], s)
    s = re.sub(r'[^a-z0-9\- _]+', '', s)
    s = s.replace(' ', '-').replace('_', '-')
    s = re.sub(r'-{2,}', '-', s).strip('-')
    return s or 'untitled'


def read_counter(template_dir: str) -> Optional[int]:
    p = os.path.join(template_dir, 'INDEX_COUNTER.txt')
    if not os.path.exists(p):
        return None
    try:
        return int(read_text(p).strip())
    except Exception:
        return None


def write_counter(template_dir: str, value: int):
    p = os.path.join(template_dir, 'INDEX_COUNTER.txt')
    write_text(p, str(value) + "\n")


def scan_max_k(dest_base: str) -> int:
    maxn = 0
    for root, dirs, files in os.walk(dest_base):
        for d in dirs:
            m = re.match(r'^K(\d{6})', d)
            if m:
                try:
                    n = int(m.group(1))
                    if n > maxn:
                        maxn = n
                except ValueError:
                    pass
    return maxn


def next_knife_code(dest_base: str, template_dir: str) -> str:
    # prefer explicit counter file in template
    c = read_counter(template_dir)
    if c is not None:
        code = f"K{c:06d}"
        write_counter(template_dir, c + 1)
        return code
    # else scan destination
    maxn = scan_max_k(dest_base)
    return f"K{maxn + 1:06d}"


# ---------------- main ----------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--template', required=True, help='Template folder (napr. core/templates/content/knife)')
    ap.add_argument('--fm-core', required=True, help='FM-Core.md path')
    ap.add_argument('--dest-root', default='content/docs', help='Root of docs (default content/docs)')
    ap.add_argument('--title', required=True)
    ap.add_argument('--dao', default='knife')
    ap.add_argument('--locale', default='sk')
    ap.add_argument('--status', default='backlog')
    ap.add_argument('--privacy', default='public')
    ap.add_argument('--author', default='Roman Kazička')
    args = ap.parse_args()

    # Resolve destination base
    if args.dao == 'knife':
        dest_base = os.path.join(args.dest_root, args.locale, 'knifes')
    else:
        dest_base = os.path.join(args.dest_root, args.locale)

    # Compute code and path
    code = next_knife_code(dest_base, args.template)
    slug_tail = slugify(args.title)
    dirname = f"{code}-{slug_tail}"
    out_dir = os.path.join(dest_base, dirname)

    if os.path.exists(out_dir):
        print(f"ERROR: Target exists: {out_dir}", file=sys.stderr)
        sys.exit(2)

    # Copy template tree first
    copy_tree(args.template, out_dir)

    # Build index.md from FM-Core
    fm_core_text = read_text(args.fm_core)
    fm_raw = extract_first_fm_block_raw(fm_core_text)
    if not fm_raw:
        print('ERROR: FM-Core.md does not contain a FM block', file=sys.stderr)
        sys.exit(3)

    guid = str(uuid.uuid4())
    created = datetime.utcnow().strftime('%Y-%m-%d')

    # Fill FM values (keep inline hints)
    filled = fm_raw
    replacements = {
        'id': code,
        'guid': guid,
        'dao': args.dao,
        'title': args.title,
        'status': args.status,
        'privacy': args.privacy,
        'author': args.author,
        'created': created,
        'modified': 'YYYY-MM-DDTHH:MM:SSZ',
        'locale': args.locale,
    }
    for k, v in replacements.items():
        filled = replace_fm_kv_line(filled, k, v)

    fm_map = parse_fm_to_dict(filled)
    h1 = f"# {args.title}"
    fm_visible = build_fm_visible_block({**fm_map, **replacements})
    index_md = f"---\n{filled.strip()}\n---\n{h1}\n{fm_visible}\n"

    write_text(os.path.join(out_dir, 'index.md'), index_md)

    # CSV history append
    csv_path = os.path.join('config', 'inputs', 'KNIFES-OVERVIEW-INPUTs.history.csv')
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    line = f'{code},{guid},{args.dao},"{args.title}",{args.status},{created},{args.locale},{os.path.join("/", out_dir)}\n'
    mode = 'a' if os.path.exists(csv_path) else 'w'
    with open(csv_path, mode, encoding='utf-8') as f:
        if mode == 'w':
            f.write('id,guid,dao,title,status,created,locale,path\n')
        f.write(line)

    print(f"✅ Created: {out_dir}")
    print(f"   id={code}  guid={guid}")


if __name__ == '__main__':
    main()
