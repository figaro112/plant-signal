#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_fm_comment_id.py — Komentuje/štandardizuje `id` vo frontmatteri naprieč súbormi

Funkcia:
- Pre každý .md v zadanom root-e alebo konkrétny --file:
  - Ak FM obsahuje riadok `id: "..."`, nahradí ho za `# id: ""` (id je "vynechané" bezpečne).
  - Ak `id` v FM chýba, doplní `# id: ""` hneď za riadok s `guid:` (ak existuje), inak na koniec FM.
- Telo súboru ostáva nedotknuté.
- Idempotentné (opakované spustenie nerobí ďalšie zmeny).
- Má režimy --dry-run (default) a --apply (zapíše zmeny).

Použitie:
  python3 core/scripts/tools/knife_fm_comment_id.py --root content/docs/sk/7Ds --dry-run
  python3 core/scripts/tools/knife_fm_comment_id.py --root content/docs/sk/7Ds --apply
  python3 core/scripts/tools/knife_fm_comment_id.py --file content/docs/en/index.md --apply
"""

import os, re, sys, argparse

def read_text(p: str) -> str:
    with open(p, "r", encoding="utf-8") as f:
        return f.read()

def write_text(p: str, s: str):
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)

def extract_fm_span(text: str):
    """Return (start_index, end_index) of FM content between --- lines, or None."""
    m1 = re.match(r'^\s*---\s*\n', text)
    if not m1:
        return None
    m2 = re.search(r'\n---\s*\n', text[m1.end():])
    if not m2:
        return None
    s = m1.end()
    e = m1.end() + m2.start()
    return (s, e)

def ensure_commented_id_in_fm(fm: str) -> str:
    """
    - Ak existuje 'id: "...“' alebo komentovaná varianta s iným obsahom, prepíše na '# id: ""'
    - Ak id chýba, vloží '# id: ""' ZA riadok 'guid:' (ak existuje), inak na koniec FM.
    """
    lines = fm.splitlines()
    id_line_re = re.compile(r'^\s*id\s*:\s*".*?"\s*$')
    id_commented_any_re = re.compile(r'^\s*#\s*id\s*:\s*".*?"\s*$')
    guid_re = re.compile(r'^\s*guid\s*:\s*".*?"\s*$')

    has_id_uncommented = False
    has_id_commented   = False
    id_idx = -1
    guid_idx = -1

    for i, line in enumerate(lines):
        if id_line_re.match(line):
            has_id_uncommented = True
            id_idx = i
        elif id_commented_any_re.match(line):
            has_id_commented = True
            id_idx = i
        elif guid_re.match(line):
            guid_idx = i

    # 1) Ak existuje nekomentovaný alebo komentovaný id, normalizuj na presný tvar:
    if has_id_uncommented or has_id_commented:
        # nastav presne '# id: ""'
        lines[id_idx] = '# id: ""'
        # odstráň prípadné duplicity ďalších id riadkov (okrem toho práve nastaveného)
        new_lines = []
        seen_id = False
        for i, line in enumerate(lines):
            if (i == id_idx) and not seen_id:
                new_lines.append(line)
                seen_id = True
            else:
                # zahoď akékoľvek ďalšie výskyty id (koment./nekoment.), aby vznikol len jeden
                if id_line_re.match(line) or id_commented_any_re.match(line):
                    continue
                new_lines.append(line)
        return "\n".join(new_lines)

    # 2) id úplne chýba → doplň "# id: """ za guid alebo na koniec
    insert_at = len(lines)
    if guid_idx != -1:
        insert_at = guid_idx + 1

    # vlož s ohľadom na prázdny riadok po
    lines.insert(insert_at, '# id: ""')

    return "\n".join(lines)

def process_file(path: str, apply: bool) -> bool:
    """Return True if changed."""
    try:
        src = read_text(path)
    except Exception:
        return False

    span = extract_fm_span(src)
    if not span:
        # bez FM nerobíme nič (podľa zadania meníme len FM)
        return False

    s, e = span
    fm = src[s:e]
    new_fm = ensure_commented_id_in_fm(fm)
    if new_fm == fm:
        return False

    out = src[:s] + new_fm + src[e:]
    if apply:
        write_text(path, out)
    else:
        rel = path
        print(f"[would-change] {rel}")
    return True

def iter_md(root: str):
    for base, _, names in os.walk(root):
        for n in names:
            if n.lower().endswith(".md"):
                yield os.path.join(base, n)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", help="Root folder (recursive)")
    ap.add_argument("--file", help="Single file")
    ap.add_argument("--apply", action="store_true", help="Write changes (default is dry-run)")
    args = ap.parse_args()

    if not (args.root or args.file):
        sys.stderr.write("Provide --root or --file\n")
        sys.exit(2)

    targets = [args.file] if args.file else list(iter_md(args.root))
    changed = 0
    for p in targets:
        ch = process_file(p, apply=args.apply)
        if ch:
            changed += 1

    if args.apply:
        print(f"Done. Changed files: {changed}")
    else:
        print(f"Dry-run complete. Would change files: {changed}")

if __name__ == "__main__":
    main()