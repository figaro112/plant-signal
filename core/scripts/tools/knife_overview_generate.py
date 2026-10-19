#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_overview_generate.py — vygeneruje 3 prehľady KNIFE (hrubý/stredný/jemný)

Hrubý  = "Blog"   — jednoduchý feed (ID, title, created) — **triedené podľa ID asc**
Stredný = "List"  — prehľadný zoznam (ID, title, status, priority, created) — **triedené podľa ID desc**
Jemný  = "Details"— tabuľka s rozšírenými metadátmi — **triedené podľa ID desc**

IDEMPOTENTNE: zapisuje iba ak sa zmení obsah oproti existujúcemu súboru.

Použitie:
  python3 core/scripts/tools/knife_overview_generate.py     --root content/docs     --locale sk     --fm-core core/templates/system/FM-Core.md     --out-dir content/docs/sk/knifes     [--dry-run] [--preview]

Poznámky:
- Parser FM používa "string-only" prístup (bez PyYAML); očakáva kľúče v podobe `key: "value"` a
  jednoduché zoznamy `authors: ["A","B"]`, `tags: ["x","y"]`. Nevadí, ak chýbajú kľúče; skript je tolerantný.
- Ignoruje priečinky _meta, _unclasified a súbory *f.template.md, *.FM.bak.md.
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
from typing import Tuple


# ---------- helpers: doc route ----------
def _href_to_doc_route(href: str) -> str:
    """
    Convert a markdown file reference (e.g. '../K000101–CKO-Onboarding/index.md')
    to a Docusaurus doc route (e.g. '../K000101–CKO-Onboarding/').
    This ensures that overview links point to the generated doc routes
    rather than to the raw `.md` files (which would cause 404s in Docusaurus).
    """
    if href.endswith("/index.md"):
        return href[: -len("index.md")]
    if href.endswith("/index.mdx"):
        return href[: -len("index.mdx")]
    if href.endswith(".md"):
        return href[: -len(".md")]
    if href.endswith(".mdx"):
        return href[: -len(".mdx")]
    return href


# ---------- helpers: fs ----------
 # ---------- helpers: paths ----------

def rel_link_from_overview(item_dir_path: str, docs_root: str, overview_out_dir: str) -> str:
    """Return a POSIX relative link from the overview output dir to the item's index.md.
    - item_dir_path: path like '/sk/knifes/K000085_01-video-workflow'
    - docs_root: root docs directory like 'content/docs'
    - overview_out_dir: output dir like 'content/docs/sk/knifes/knifes_overview'
    """
    # detect whether the item uses index.mdx or index.md
    _md_path = Path(docs_root) / item_dir_path.lstrip('/') / 'index.md'
    _mdx_path = Path(docs_root) / item_dir_path.lstrip('/') / 'index.mdx'
    target = _mdx_path if _mdx_path.exists() and not _md_path.exists() else _md_path
    rel = Path(os.path.relpath(target, Path(overview_out_dir)))
    return rel.as_posix()

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

def remove_fm_key_lines(fm_raw: str, key: str) -> str:
    """Remove all occurrences of an un-commented `key: value` line from FM.
    Lines starting with `#` (commented) are preserved.
    """
    pattern = re.compile(rf'^\s*{re.escape(key)}\s*:\s*.*$', re.MULTILINE)
    return pattern.sub('', fm_raw)

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


def collect_knifes(root: str, locale: str, *, include_drafts: bool, include_nonpublic: bool, debug: bool = False) -> List[Dict[str, object]]:
    base = Path(root) / locale / 'knifes'
    items: List[Dict[str, object]] = []
    if not base.exists():
        return items
    def _dbg(msg: str):
        if debug:
            print(f"[knife_overview] {msg}")
    _index_files = sorted(set(base.rglob('index.md')) | set(base.rglob('index.mdx')))
    for p in _index_files:
        # skip KNIFES home (content/docs/<locale>/knifes/index.md)
        if p.parent == base:
            _dbg(f"skip home: {p}")
            continue
        # skip excluded directories
        parts = set(p.parts)
        if parts & EXCLUDE_DIRS:
            _dbg(f"skip excluded dir: {p}")
            continue
        # skip overview pages themselves
        if any(name in p.as_posix() for name in [
            'KNIFE_Overview_List.md','KNIFE_Overview_Blog.md','KNIFE_Overview_Details.md'
        ]):
            _dbg(f"skip overview page: {p}")
            continue
        # read and parse FM
        text = read_text(str(p))
        fm_raw = extract_first_fm_block_raw(text)
        if not fm_raw:
            _dbg(f"skip no FM: {p}")
            continue
        d = fm_to_dict(fm_raw)
        # only KNIFE items (case-insensitive DAO) and tolerant ID (K000000 or K000000-...)
        item_id = str(d.get('id', ''))
        dao_val = str(d.get('dao', ''))
        dao_norm = dao_val.strip().lower()

        # accept K###### optionally followed by hyphen or underscore (e.g., K000085, K000085-foo, K000085_04)
        id_ok = bool(re.match(r'^K\d{6}($|\\b|[-_])', item_id))

        # keep if ID looks ok OR dao explicitly says knife (any case)
        if not id_ok and dao_norm != 'knife':
            _dbg(f"skip id/dao mismatch (id='{item_id}', dao='{dao_val}') at {p}")
            continue
        title = str(d.get('title', 'Untitled'))
        created = str(d.get('created', ''))
        status = str(d.get('status', ''))
        priority = str(d.get('priority', ''))
        guid = str(d.get('guid', ''))
        privacy = str(d.get('privacy', ''))
        # visibility policy: exclude by default unless explicitly included
        status_norm = (status or "").strip().lower()
        privacy_norm = (privacy or "public").strip().lower()
        if not include_nonpublic and privacy_norm != "public":
            _dbg(f"skip nonpublic (privacy='{privacy_norm}') at {p}")
            continue
        if not include_drafts and status_norm in ("draft", "backlog", ""):
            _dbg(f"skip draft/backlog (status='{status_norm}') at {p}")
            continue
        path_rel = '/' + str(p.parent.as_posix()).split('/docs/', 1)[-1]
        items.append({
            'id': item_id,
            'title': title,
            'created': created,
            'status': status,
            'priority': priority,
            'guid': guid,
            'privacy': privacy,
            'path': path_rel,
        })
    # sort canonically by ID (descending)
    items.sort(key=lambda x: x.get('id', ''), reverse=True)
    return items

# ---------- renderers ----------

def render_blog(items: List[Dict[str, object]], *, docs_root: str, overview_out_dir: str) -> str:
    # Blog: chrono feeling by ID ascending and show ID first for clarity
    lines = []
    for it in sorted(items, key=lambda x: x.get('id', '')):
        cid = it['id']
        title = it['title'] or cid
        created = it['created'] or ''
        path = rel_link_from_overview(it['path'], docs_root, overview_out_dir)
        href = _href_to_doc_route(path)
        lines.append(f"- **{cid}** — {created} — [{title}]({href})")
    return "\n".join(lines) + ("\n" if lines else "")


def render_list(items: List[Dict[str, object]], *, docs_root: str, overview_out_dir: str) -> str:
    lines = []
    for it in items:
        title = it['title'] or it['id']
        path = rel_link_from_overview(it['path'], docs_root, overview_out_dir)
        href = _href_to_doc_route(path)
        status = it['status'] or ''
        prio = it['priority'] or ''
        cid = it['id']
        lines.append(f"- **{cid}** · [{title}]({href}) · _{status or '-'}_ · {prio or '-'}")
    return "\n".join(lines) + ("\n" if lines else "")


def render_details(items: List[Dict[str, object]], *, docs_root: str, overview_out_dir: str) -> str:
    header = "| ID | Title | Created | Status | Priority |\n|---|---|---|---|---|\n"
    rows = []
    for it in items:
        cid = it['id']
        title = it['title'] or cid
        path = rel_link_from_overview(it['path'], docs_root, overview_out_dir)
        href = _href_to_doc_route(path)
        created = it['created'] or ''
        status = it['status'] or ''
        prio = it['priority'] or ''
        rows.append(f"| {cid} | [{title}]({href}) | {created} | {status} | {prio} |")
    return header + "\n".join(rows) + ("\n" if rows else "")

# ---------- FM scaffolding for overview pages ----------

def build_overview_fm(fm_core_text: str, *,
                      page_id: str,
                      title: str,
                      locale: str,
                      guid: Optional[str] = None,
                      slug: Optional[str] = None) -> str:
    """
    Kopíruje FM z FM-Core.md a dosadí len:
    id, guid, title, locale, created.
    Ostatné polia necháva tak, ako sú vo FM-Core (tags, status, priority, …). `sidebar_label` sa netvorí ani nemení (Docusaurus použije `title`).
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
    fm_out = replace_fm_kv_line(fm_out, 'created', today)
    # Safety: ensure no sidebar_label remains in FM (we rely on title in sidebars)
    fm_out = remove_fm_key_lines(fm_out, 'sidebar_label')
    fm_out = remove_fm_key_lines(fm_out, 'slug')

    return fm_out


def wrap_md(fm_raw: str, h1: str, fm_visible_map: Dict[str, object]) -> str:
    fmv = build_fm_visible(fm_visible_map)
    return f"---\n{fm_raw.strip()}\n---\n\n{h1}\n\n{fmv}\n"

# ---------- helper: apply placeholders ----------

def apply_placeholders(text: str, ctx: Dict[str, str]) -> str:
    def replacer(match):
        key = match.group(1)
        return ctx.get(key, match.group(0))
    pattern = re.compile(r'\{\{(\w+)\}\}')
    return pattern.sub(replacer, text)

def build_nav(current: str, locale: str) -> str:
    """
    Simple navigation between 3 overview pages + back to KNIFES index.
    `current` is one of: 'blog' | 'list' | 'details'
    """
    items = [
        ("blog",    "[📰 Blog](./KNIFE_Overview_Blog.md)"),
        ("list",    "[🗂 List](./KNIFE_Overview_List.md)"),
        ("details", "[📊 Details](./KNIFE_Overview_Details.md)"),
    ]
    parts = []
    for key, link in items:
        parts.append(f"**{link}**" if key == current else link)
    parts.append("[↩️ KNIFES](../index.md)")
    return " | ".join(parts) + "\n\n"

# ---------- main ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True, help='root docs (napr. content/docs)')
    ap.add_argument('--locale', default='sk')
    ap.add_argument('--fm-core', required=True)
    #ap.add_argument('--out-dir', required=True)
    ap.add_argument('--out-dir', default=None)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--preview', action='store_true')
    ap.add_argument('--debug', action='store_true')
    args = ap.parse_args()

    if not args.out_dir:
        args.out_dir = os.path.join(args.root, args.locale, 'knifes', 'knifes_overview')
    overview_out_dir = args.out_dir

    # Preview mode via --preview or env vars
    preview_mode = bool(
        args.preview
        or os.environ.get('PREVIEW') == '1'
        or os.environ.get('KNIFE_PREVIEW') == '1'
    )

    # Load config/global.yml if exists (lightweight manual parser)
    ctx = {}
    config_path = Path('config/global.yml')
    if config_path.exists():
        try:
            import yaml
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = yaml.safe_load(f)
                if isinstance(cfg, dict):
                    ctx['AUTHOR'] = str(cfg.get('author', ''))
                    ctx['LICENSE'] = str(cfg.get('license', ''))
                    ctx['RIGHTS_HOLDER_SYSTEM'] = str(cfg.get('rights_holder_system', ''))
                    ctx['ORIGIN_SYSTEM'] = str(cfg.get('origin_system', ''))
        except ImportError:
            # fallback manual parse (very simple)
            with open(config_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if ':' in line:
                        k, v = line.split(':', 1)
                        k = k.strip().lower()
                        v = v.strip().strip('"').strip("'")
                        if k == 'author':
                            ctx['AUTHOR'] = v
                        elif k == 'license':
                            ctx['LICENSE'] = v
                        elif k == 'rights_holder_system':
                            ctx['RIGHTS_HOLDER_SYSTEM'] = v
                        elif k == 'origin_system':
                            ctx['ORIGIN_SYSTEM'] = v

    # Defaults for placeholders (ENV > hardcoded fallback)
    ctx.setdefault('AUTHOR', os.getenv('AUTHOR', os.getenv('USER', 'author')))
    ctx.setdefault('LICENSE', os.getenv('LICENSE', 'CC-BY-NC-SA-4.0'))
    ctx.setdefault('RIGHTS_HOLDER_SYSTEM', os.getenv('RIGHTS_HOLDER_SYSTEM', 'CAA / KNIFE / LetItGrow'))
    ctx.setdefault('ORIGIN_SYSTEM', os.getenv('ORIGIN_SYSTEM', 'CAA'))

    # Add CREATED date
    ctx['CREATED'] = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    # Include drafts/backlog by default (unless explicitly disabled); non-public excluded by default
    link_drafts = os.environ.get('KNIFE_INCLUDE_DRAFTS', '1') != '0'
    if preview_mode:
        link_drafts = True  # force include in preview

    link_nonpublic = (
        os.environ.get('KNIFE_LINK_NONPUBLIC', '0') == '1'
        or os.environ.get('KNIFE_INCLUDE_NONPUBLIC', '0') == '1'
    )
    # (Removed duplicate --debug argument and parse_args call)

    items = collect_knifes(args.root, args.locale, include_drafts=link_drafts, include_nonpublic=link_nonpublic, debug=args.debug)

    fm_core_text = read_text(args.fm_core)

    # Locale suffix ensures globally unique doc IDs across SK/EN (Docusaurus requires unique IDs).
    # SK is the primary locale — no suffix for backward compatibility.
    _id_suffix = f'_{args.locale.upper()}' if args.locale.lower() != 'sk' else ''

    # Prepare three pages
    pages = [
        {
            'file': os.path.join(args.out_dir, 'KNIFE_Overview_Blog.md'),
            'id': f'KNIFE_OVERVIEW_BLOG{_id_suffix}',
            'title': '📰 KNIFE Overview – Blog',
            'priority': 'middle',
            'nav_key': 'blog',
            'render': render_blog,
        },
        {
            'file': os.path.join(args.out_dir, 'KNIFE_Overview_List.md'),
            'id': f'KNIFE_OVERVIEW_LIST{_id_suffix}',
            'title': '🗂 KNIFE Overview – List',
            'priority': 'top',
            'nav_key': 'list',
            'render': render_list,
        },
        {
            'file': os.path.join(args.out_dir, 'KNIFE_Overview_Details.md'),
            'id': f'KNIFE_OVERVIEW_DETAILS{_id_suffix}',
            'title': '📊 KNIFE Overview – Details',
            'priority': 'top',
            'nav_key': 'details',
            'render': render_details,
        },
    ]

    def _fm_for_preview(fm_raw_text: str, page_id: str) -> str:
        # change id: X -> X_PREVIEW (one occurrence only)
        return replace_fm_kv_line(fm_raw_text, 'id', f"{page_id}_PREVIEW")

    any_change = False
    for pg in pages:
        fm_raw = build_overview_fm(
            fm_core_text,
            page_id=pg['id'],
            title=pg['title'],
            locale=args.locale,
        )

        # render page-specific content (blog/list/details)
        render_fn = pg.get('render')
        content_md = render_fn(items, docs_root=args.root, overview_out_dir=overview_out_dir) if callable(render_fn) else ""

        # visible header based on FM
        fmd = fm_to_dict(fm_raw)
        body = wrap_md(fm_raw, f"# {pg['title']}", fmd)

        nav_key = pg.get('nav_key', '')
        if nav_key:
            body += build_nav(nav_key, args.locale)

        # final text (ensure content_md is a string)
        final_text = body + "\n" + (content_md or "")
        # Normalize any legacy breadcrumb pointing to ../knifes/index.md to ../index.md
        final_text = final_text.replace('](../knifes/index.md)', '](../index.md)')
        final_text = apply_placeholders(final_text, ctx)

        if preview_mode:
            # Write side-by-side preview file with unique id to avoid duplicate-id collisions
            preview_path = pg['file'].replace('.md', '.preview.md')
            fm_preview = _fm_for_preview(fm_raw, pg['id'])
            body_preview = wrap_md(fm_preview, f"# {pg['title']}", fm_to_dict(fm_preview))
            if nav_key:
                body_preview += build_nav(nav_key, args.locale)
            final_preview = body_preview + "\n" + (content_md or "")
            final_preview = apply_placeholders(final_preview, ctx)
            write_text_if_changed(preview_path, final_preview)
            print(f"\n--- {preview_path} (preview written with unique id)\n")

        if not args.dry_run:
            changed = write_text_if_changed(pg['file'], final_text)
            any_change = any_change or changed

    if args.debug:
        ids = [it.get('id') for it in items]
        print(f"[knife_overview] collected {len(items)} items")
        if ids:
            print(f"[knife_overview] newest: {ids[0]}, oldest: {ids[-1]}")
    if args.dry_run:
        msg = f"Dry-run. Items: {len(items)}."
        if preview_mode:
            msg += " Preview files were written."
        else:
            msg += " No files written."
        print(msg)
    else:
        msg = "Overview pages generated."
        if any_change:
            msg += " (changes written)"
        if preview_mode:
            msg += " Preview files also written."
        print(msg)


if __name__ == '__main__':
    main()