#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_overview_generate.py — vygeneruje 3 prehľady KNIFE (hrubý/stredný/jemný)

Hrubý  = "Blog"   — jednoduchý feed (ID, title, created) — **triedené podľa ID asc**
Stredný = "List"  — prehľadný zoznam (ID, title, status, priority, created) — **triedené podľa ID desc**
Jemný  = "Details"— tabuľka s rozšírenými metadátmi — **triedené podľa ID desc**

IDEMPOTENTNE: zapisuje iba ak sa zmení obsah oproti existujúcemu súboru.

Použitie:
  python3 core/scripts/tools/knife_overview_generate.py \
    --root content/docs \
    --locale sk \
    --fm-core core/templates/system/FM-Core.md \
    --out-dir content/docs/sk/knifes \
    [--dry-run] [--preview]

Poznámky:
- Parser FM používa "string-only" prístup (bez PyYAML); očakáva kľúče v podobe `key: "value"` a
  jednoduché zoznamy `authors: ["A","B"]`, `tags: ["x","y"]`. Nevadí, ak chýbajú kľúče; skript je tolerantný.
- Ignoruje priečinky _meta, _unclasified a súbory *.template.md, *.FM.bak.md.
- Výstupy:
    KNIFE_Overview_List.md
    KNIFE_Overview_Blog.md
    KNIFE_Overview_Details.md
"""
import argparse
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

# ---------- helpers: fs ----------

def read_text(p: str) -> str:
    with open(p, 'r', encoding='utf-8') as f:
        return f.read()

def write_text_if_changed(p: str, new_text: str) -> bool:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    old = None
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            old = f.read()
    if old == new_text:
        return False
    with open(p, 'w', encoding='utf-8') as f:
        f.write(new_text)
    return True

# ---------- helpers: FM parsing/rendering (string-only) ----------
FM_FENCE_RE = re.compile(r'^\s*---\s*$', re.MULTILINE)


def extract_first_fm_block_raw(text: str) -> str:
    fences = list(FM_FENCE_RE.finditer(text))
    if len(fences) < 2:
        return ''
    start = fences[0].end()
    end = fences[1].start()
    return text[start:end]

_KV_RE = re.compile(r'^(?P<k>[^:#\n]+?):\s*(?P<v>.*?)(?P<c>\s+#.*)?$', re.MULTILINE)
_LIST_RE = re.compile(r'^\s*\[(.*?)\]\s*$', re.DOTALL)


def _parse_list(v: str) -> List[str]:
    m = _LIST_RE.match(v.strip())
    if not m:
        return []
    inner = m.group(1)
    # split by commas not inside quotes — simple heuristic: split by "," and strip quotes
    parts = [p.strip() for p in inner.split(',') if p.strip()]
    out: List[str] = []
    for p in parts:
        if p.startswith('"') and p.endswith('"') and len(p) >= 2:
            out.append(p[1:-1])
        else:
            out.append(p.strip('"'))
    return out


def fm_to_dict(fm_raw: str) -> Dict[str, object]:
    d: Dict[str, object] = {}
    for m in _KV_RE.finditer(fm_raw):
        k = m.group('k').strip()
        v = m.group('v').strip()
        if v.startswith('"') and v.endswith('"'):
            d[k] = v[1:-1]
        elif v.startswith('[') and v.endswith(']'):
            d[k] = _parse_list(v)
        else:
            # keep raw token (numbers, barewords)
            d[k] = v
    return d


def replace_fm_kv_line(fm_raw: str, key: str, value: str) -> str:
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


def build_fm_visible(fmd: Dict[str, object]) -> str:
    guid = str(fmd.get('guid', ''))
    status = str(fmd.get('status', ''))
    author = str(fmd.get('author', ''))
    license_ = str(fmd.get('license', 'CC-BY-NC-SA-4.0'))
    return (
        "<!-- fm-visible: start -->\n"
        f"> **GUID:** `{guid}`\n"
        f"> **Status:** `{status}` · **Author:** {author} · **License:** {license_}\n"
        "<!-- fm-visible: end -->\n"
    )

# ---------- collect KNIFE docs ----------

EXCLUDE_DIRS = {"_meta", "_unclasified", "_legacy"}
EXCLUDE_SUFFIXES = (".template.md", ".FM.bak.md")


def collect_knifes(root: str, locale: str) -> List[Dict[str, object]]:
    base = Path(root) / locale / 'knifes'
    items: List[Dict[str, object]] = []
    if not base.exists():
        return items
    for p in base.rglob('index.md'):
        # skip excluded directories
        parts = set(p.parts)
        if parts & EXCLUDE_DIRS:
            continue
        # skip overview pages themselves
        if any(name in p.as_posix() for name in [
            'KNIFE_Overview_List.md','KNIFE_Overview_Blog.md','KNIFE_Overview_Details.md'
        ]):
            continue
        # read and parse FM
        text = read_text(str(p))
        fm_raw = extract_first_fm_block_raw(text)
        if not fm_raw:
            continue
        d = fm_to_dict(fm_raw)
        # only KNIFE items with id like K\d{6}
        item_id = str(d.get('id', ''))
        if not re.match(r'^K\d{6}$', item_id):
            # tolerate non-standard, but keep if dao==knife
            if (d.get('dao') or '').strip() != 'knife':
                continue
        title = str(d.get('title', 'Untitled'))
        created = str(d.get('created', ''))
        status = str(d.get('status', ''))
        priority = str(d.get('priority', ''))
        guid = str(d.get('guid', ''))
        path_rel = '/' + str(p.parent.as_posix()).split('/docs/', 1)[-1]
        items.append({
            'id': item_id,
            'title': title,
            'created': created,
            'status': status,
            'priority': priority,
            'guid': guid,
            'path': path_rel,
        })
    # sort canonically by ID (descending)
    items.sort(key=lambda x: x.get('id', ''), reverse=True)
    return items

# ---------- renderers ----------

def render_blog(items: List[Dict[str, object]]) -> str:
    # Blog: chrono feeling → ID ascending
    lines = []
    for it in sorted(items, key=lambda x: x.get('id', '')):
        title = it['title'] or it['id']
        created = it['created'] or ''
        path = it['path']
        lines.append(f"- {created} — [{title}]({path})")
    return "\n".join(lines) + ("\n" if lines else "")


def render_list(items: List[Dict[str, object]]) -> str:
    lines = []
    for it in items:
        title = it['title'] or it['id']
        path = it['path']
        status = it['status'] or ''
        prio = it['priority'] or ''
        cid = it['id']
        lines.append(f"- **{cid}** · [{title}]({path}) · _{status or '-'}_ · {prio or '-'}")
    return "\n".join(lines) + ("\n" if lines else "")


def render_details(items: List[Dict[str, object]]) -> str:
    # simple Markdown table (avoid heavy formatting)
    header = "| ID | Title | Created | Status | Priority |\n|---|---|---|---|---|\n"
    rows = []
    for it in items:
        cid = it['id']
        title = it['title'] or cid
        path = it['path']
        created = it['created'] or ''
        status = it['status'] or ''
        prio = it['priority'] or ''
        rows.append(f"| {cid} | [{title}]({path}) | {created} | {status} | {prio} |")
    return header + "\n".join(rows) + ("\n" if rows else "")

# ---------- FM scaffolding for overview pages ----------

def build_overview_fm(fm_core_text: str, *,
                      page_id: str,
                      title: str,
                      locale: str,
                      guid: Optional[str] = None) -> str:
    """
    Kopíruje FM z FM-Core.md a dosadí len:
    id, guid, title, locale, sidebar_label, created.
    Ostatné polia necháva tak, ako sú vo FM-Core (tags, status, priority, …).
    """
    fm_raw = extract_first_fm_block_raw(fm_core_text)
    if not fm_raw:
        raise SystemExit('FM-Core.md nemá platný FM blok')

    guid = guid or str(uuid.uuid4())
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    fm_out = fm_raw
    fm_out = replace_fm_kv_line(fm_out, 'id', page_id)
    fm_out = replace_fm_kv_line(fm_out, 'guid', guid)
    fm_out = replace_fm_kv_line(fm_out, 'title', title)
    fm_out = replace_fm_kv_line(fm_out, 'locale', locale)
    fm_out = replace_fm_kv_line(fm_out, 'sidebar_label', title)
    fm_out = replace_fm_kv_line(fm_out, 'created', today)

    return fm_out


def wrap_md(fm_raw: str, h1: str, fm_visible_map: Dict[str, object]) -> str:
    fmv = build_fm_visible(fm_visible_map)
    return f"---\n{fm_raw.strip()}\n---\n\n{h1}\n\n{fmv}\n"

# ---------- main ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True, help='root docs (napr. content/docs)')
    ap.add_argument('--locale', default='sk')
    ap.add_argument('--fm-core', required=True)
    ap.add_argument('--out-dir', required=True)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--preview', action='store_true')
    args = ap.parse_args()

    items = collect_knifes(args.root, args.locale)

    fm_core_text = read_text(args.fm_core)

    # Prepare three pages
    pages = [
        {
            'file': os.path.join(args.out_dir, 'KNIFE_Overview_Blog.md'),
            'id': 'KNIFE_OVERVIEW_BLOG',
            'title': '📰 KNIFE Overview – Blog',
            'priority': 'middle',
            'render': render_blog,
        },
        {
            'file': os.path.join(args.out_dir, 'KNIFE_Overview_List.md'),
            'id': 'KNIFE_OVERVIEW_LIST',
            'title': '🗂 KNIFE Overview – List',
            'priority': 'top',
            'render': render_list,
        },
        {
            'file': os.path.join(args.out_dir, 'KNIFE_Overview_Details.md'),
            'id': 'KNIFE_OVERVIEW_DETAILS',
            'title': '📊 KNIFE Overview – Details',
            'priority': 'top',
            'render': render_details,
        },
    ]

    any_change = False
    for pg in pages:
        fm_raw = build_overview_fm(
            fm_core_text,
            page_id=pg['id'],
            title=pg['title'],
            locale=args.locale,
        )

        # render page-specific content (blog/list/details)
        content_md = pg['render'](items) if callable(pg.get('render')) else ""

        # visible header based on FM
        fmd = fm_to_dict(fm_raw)
        body = wrap_md(fm_raw, f"# {pg['title']}", fmd)

        # final text (ensure content_md is a string)
        final_text = body + "\n" + (content_md or "")

        if args.preview:
            print(f"\n--- {pg['file']} (preview)\n{final_text}\n")

        if not args.dry_run:
            changed = write_text_if_changed(pg['file'], final_text)
            any_change = any_change or changed

    if args.dry_run:
        print(f"Dry-run. Items found: {len(items)}. No files written.")
    else:
        print("Overview pages generated." + (" (changes written)" if any_change else " (no changes)"))


if __name__ == '__main__':
    main()
