#!/usr/bin/env python3
"""
knife_overview_status_sync.py

Syncs status from each KNIFE's index.md frontmatter into the three
overview pages (Blog · List · Details) for SK and/or EN.

What it does:
  Blog    – adds/updates  · _status_  at the end of each list item
  List    – ensures the status legend is present (status already in lines)
  Details – updates the status column in each table row

Usage:
  python knife_overview_status_sync.py [options]

Options:
  --content-dir  Path to content/docs directory (default: content/docs)
  --lang         sk | en | both  (default: both)
  --dry-run      Print what would change without writing
"""

import re
import sys
import argparse
from pathlib import Path

# ── Frontmatter ───────────────────────────────────────────────────────────────

def read_frontmatter(filepath: Path) -> dict:
    try:
        text = filepath.read_text(encoding='utf-8')
    except Exception:
        return {}
    m = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if not m:
        return {}
    fm = m.group(1)
    result = {}
    for key in ('id', 'status'):
        match = re.search(rf'^{key}:\s*["\']?(.+?)["\']?\s*$', fm, re.MULTILINE)
        if match:
            result[key] = match.group(1).strip().strip('"\'')
    return result

def build_status_map(knifes_dir: Path) -> dict:
    """Returns {folder_name: status_string} for all KNIFE dirs with a valid id."""
    status_map = {}
    for d in sorted(knifes_dir.iterdir()):
        if not d.is_dir():
            continue
        fm = read_frontmatter(d / 'index.md')
        if fm.get('id'):
            status_map[d.name] = fm.get('status', 'backlog')
    return status_map

# ── Legend ────────────────────────────────────────────────────────────────────

LEGEND_SK     = '> **Stav:** `done` ✓ · `inProgress` ⟳ · `draft` ✎ · `backlog` ○'
LEGEND_EN     = '> **Status:** `done` ✓ · `inProgress` ⟳ · `draft` ✎ · `backlog` ○'
LEGEND_UNIQUE = '`done` ✓'    # unique substring present only in our legend line
NAV_MARKER    = '[↩️ KNIFES](../index.md)'

def ensure_legend(content: str, legend: str) -> str:
    """Insert legend after the nav bar if not already present."""
    if LEGEND_UNIQUE in content:
        return content
    lines = content.split('\n')
    result = []
    for line in lines:
        result.append(line)
        if NAV_MARKER in line:
            result.append('')
            result.append(legend)
    return '\n'.join(result)

# ── Blog update ───────────────────────────────────────────────────────────────

# Matches: - **ID** — date [optional time] — [title](../folder/) [· _status_]
BLOG_LINE_RE = re.compile(
    r'^(- \*\*[^*]+\*\*\s*—\s*[^—]+—\s*\[.+?\]\(\.\./([^/]+)/\))\s*(?:·\s*_[^_]+_)?(.*)'
)

def sync_blog(content: str, status_map: dict) -> str:
    """Add or update · _status_ at the end of each Blog list item."""
    lines = content.split('\n')
    result = []
    for line in lines:
        m = BLOG_LINE_RE.match(line)
        if m:
            prefix, folder, rest = m.group(1), m.group(2), m.group(3).strip()
            if folder in status_map:
                st = status_map[folder]
                line = f'{prefix} · _{st}_'
                if rest:
                    line += f' {rest}'
        result.append(line)
    return '\n'.join(result)

# ── Details update ────────────────────────────────────────────────────────────

# Matches table data row: | ID | [title](../folder/) | date | status | priority |
DETAILS_ROW_RE = re.compile(
    r'^(\|[^|]+\|\s*\[.+?\]\(\.\./([^/]+)/\)\s*\|[^|]+\|)\s*([^|]*?)\s*(\|.*)$'
)

def sync_details(content: str, status_map: dict) -> str:
    """Update the status column in each Details table row."""
    lines = content.split('\n')
    result = []
    for line in lines:
        m = DETAILS_ROW_RE.match(line)
        if m:
            prefix, folder, _old, suffix = m.group(1), m.group(2), m.group(3), m.group(4)
            if folder in status_map:
                st = status_map[folder]
                line = f'{prefix} {st} {suffix}'
        result.append(line)
    return '\n'.join(result)

# ── Per-language processing ───────────────────────────────────────────────────

def process_lang(lang: str, content_dir: Path, dry_run: bool) -> None:
    knifes_dir   = content_dir / lang / 'knifes'
    overview_dir = knifes_dir  / 'knifes_overview'
    if not overview_dir.exists():
        print(f'  ⚠  not found: {overview_dir}')
        return

    status_map = build_status_map(knifes_dir)
    legend     = LEGEND_SK if lang == 'sk' else LEGEND_EN

    tasks = [
        (overview_dir / 'KNIFE_Overview_Blog.md',
         lambda c: ensure_legend(sync_blog(c, status_map), legend)),
        (overview_dir / 'KNIFE_Overview_List.md',
         lambda c: ensure_legend(c, legend)),
        (overview_dir / 'KNIFE_Overview_Details.md',
         lambda c: sync_details(c, status_map)),
    ]

    for filepath, transform in tasks:
        if not filepath.exists():
            print(f'  ⚠  not found: {filepath.name}')
            continue
        original = filepath.read_text(encoding='utf-8')
        updated  = transform(original)
        if updated != original:
            if dry_run:
                print(f'  ~  would update: {filepath.name}')
            else:
                filepath.write_text(updated, encoding='utf-8')
                print(f'  ✅ updated:  {filepath.name}')
        else:
            print(f'  ✓  unchanged: {filepath.name}')

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Sync KNIFE status from frontmatter into overview pages.')
    parser.add_argument('--content-dir', default='content/docs',
                        help='Path to content/docs (default: content/docs)')
    parser.add_argument('--lang', default='both', choices=['sk', 'en', 'both'],
                        help='Language to sync: sk | en | both  (default: both)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print what would change without writing')
    args = parser.parse_args()

    content_dir = Path(args.content_dir).resolve()
    langs = ['sk', 'en'] if args.lang == 'both' else [args.lang]

    for lang in langs:
        print(f'\n[{lang.upper()}]')
        process_lang(lang, content_dir, args.dry_run)

    print('\n✅ Done.')

if __name__ == '__main__':
    main()
