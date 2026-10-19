#!/usr/bin/env python3
"""
knife_article_map_generate.py

Generates an interactive SVG site map for a KNIFE article directory.
Inserts the SVG between <!-- ARTICLE-MAP:BEGIN --> and <!-- ARTICLE-MAP:END --> markers
in the target map file.

Usage:
  python knife_article_map_generate.py --knife-dir /path/to/K000104-... [options]

Options:
  --knife-dir   Path to K000XXX root directory (required)
  --map-file    Target MD file, relative to knife-dir (default: article-map.md)
  --base-url    Docusaurus base URL path (default: /en/knifes)
  --dry-run     Print SVG to stdout without writing
  --preview     Print node list without generating SVG
"""

import re
import sys
import argparse
from pathlib import Path

# ── Frontmatter ───────────────────────────────────────────────────────────────

def read_frontmatter(filepath: Path) -> dict:
    """Extract id and title from YAML frontmatter."""
    try:
        text = filepath.read_text(encoding='utf-8')
    except Exception:
        return {}
    m = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if not m:
        return {}
    fm = m.group(1)
    result = {}
    for key in ('id', 'title'):
        match = re.search(rf'^{key}:\s*["\']?(.+?)["\']?\s*$', fm, re.MULTILINE)
        if match:
            result[key] = match.group(1).strip().strip('"\'')
    return result

# ── URL building ──────────────────────────────────────────────────────────────

def strip_num_prefix(name: str) -> str:
    """'01-Foo' → 'Foo',  'B3-bar' → 'B3-bar' (only pure numeric prefix stripped)"""
    return re.sub(r'^\d+[-_]', '', name)

def build_url(filepath: Path, knife_dir: Path, knife_id: str, base_url: str) -> str:
    rel = filepath.relative_to(knife_dir)
    parts = list(rel.parts)
    if parts == ['index.md']:
        return f"{base_url}/{knife_id}/"
    dir_parts = [strip_num_prefix(p) for p in parts[:-1]]
    fm = read_frontmatter(filepath)
    doc_id = fm.get('id', parts[-1].replace('.md', ''))
    return '/'.join([base_url, knife_id] + dir_parts + [doc_id])

# ── Node collection ───────────────────────────────────────────────────────────

SKIP_FILES = {'article-map.md'}
SKIP_DIRS  = {'Resources', 'resources', 'docs', 'img', 'img2', 'img2-gen', 'static'}

def truncate(text: str, max_len: int = 20) -> str:
    return text[:max_len] + '…' if len(text) > max_len else text

def collect_nodes(knife_dir: Path, base_url: str, knife_id: str) -> list:
    """
    Returns list of node dicts:
      type        : 'root' | 'chapter' | 'sub'
      path        : Path
      label       : display text (truncated)
      full_title  : full title string
      url         : Docusaurus URL
      chapter_key : parent chapter dir name (None for root)
    """
    nodes = []

    def make_node(node_type, path, chapter_key=None):
        fm = read_frontmatter(path)
        title = fm.get('title', path.stem)
        return {
            'type':        node_type,
            'path':        path,
            'label':       truncate(title),
            'full_title':  title,
            'url':         build_url(path, knife_dir, knife_id, base_url),
            'chapter_key': chapter_key,
        }

    # Root
    index_file = knife_dir / 'index.md'
    if index_file.exists():
        nodes.append(make_node('root', index_file))

    # Top-level numbered chapter directories
    chapter_dirs = sorted(
        [d for d in knife_dir.iterdir()
         if d.is_dir() and re.match(r'^\d+', d.name) and d.name not in SKIP_DIRS],
        key=lambda d: d.name
    )

    for chdir in chapter_dirs:
        key = chdir.name

        # MD files directly in chapter dir
        direct_mds = sorted([
            f for f in chdir.iterdir()
            if f.is_file() and f.suffix == '.md' and f.name not in SKIP_FILES
        ])

        # MD files in sub-directories
        sub_mds = []
        for subdir in sorted([d for d in chdir.iterdir()
                               if d.is_dir() and d.name not in SKIP_DIRS]):
            for f in sorted(subdir.rglob('*.md')):
                if f.name not in SKIP_FILES:
                    sub_mds.append(f)

        # First direct MD → chapter; rest → sub
        for i, md in enumerate(direct_mds):
            ntype = 'chapter' if i == 0 else 'sub'
            nodes.append(make_node(ntype, md, key))

        for md in sub_mds:
            nodes.append(make_node('sub', md, key))

    return nodes

# ── Layout ────────────────────────────────────────────────────────────────────

ROOT_W, ROOT_H = 160, 38
CHAP_W, CHAP_H = 142, 28
SUB_W,  SUB_H  = 140, 24
SUB_SPACING    = 34   # SUB_H + 10 gap
CHAP_GAP       = 16   # vertical gap between chapter groups
X_ROOT         = 10
X_CHAP         = X_ROOT + ROOT_W + 48   # 218
X_SUB          = X_CHAP + CHAP_W + 52   # 412

def compute_layout(nodes: list) -> tuple:
    """Returns ({path: (left_x, center_y)}, canvas_height)"""
    chapters    = [n for n in nodes if n['type'] == 'chapter']
    subs_by_key = {}
    for n in nodes:
        if n['type'] == 'sub':
            subs_by_key.setdefault(n['chapter_key'], []).append(n)

    positions = {}
    y = 30  # current top-of-group y

    for chap in chapters:
        subs = subs_by_key.get(chap['chapter_key'], [])
        if subs:
            group_h = (len(subs) - 1) * SUB_SPACING + SUB_H
            for i, sub in enumerate(subs):
                sub_cy = y + i * SUB_SPACING + SUB_H // 2
                positions[sub['path']] = (X_SUB, sub_cy)
            chap_cy = y + group_h // 2
            positions[chap['path']] = (X_CHAP, chap_cy)
            y += group_h + CHAP_GAP
        else:
            chap_cy = y + CHAP_H // 2
            positions[chap['path']] = (X_CHAP, chap_cy)
            y += CHAP_H + CHAP_GAP

    # Root centered on all chapters
    roots = [n for n in nodes if n['type'] == 'root']
    if roots and chapters:
        ys  = [positions[n['path']][1] for n in chapters if n['path'] in positions]
        rcy = (min(ys) + max(ys)) // 2
        positions[roots[0]['path']] = (X_ROOT, rcy)

    return positions, y + 20

# ── SVG generation ────────────────────────────────────────────────────────────

C_ROOT  = '#7A1800'
C_CHAP  = '#CC3800'
C_LEAF  = '#E04000'
C_SUB   = '#E87020'
C_LINE  = '#AA4400'
C_BG    = '#ffffff'

def bezier(x1, y1, x2, y2):
    mx = (x1 + x2) // 2
    return f'M {x1} {y1} C {mx} {y1} {mx} {y2} {x2} {y2}'

def node_rect(lx, cy, w, h, rx, fill, url, label, font_size):
    y   = cy - h // 2
    tcx = lx + w // 2
    tcy = cy + font_size // 2 - 1
    return (
        f'<a href="{url}">\n'
        f'  <rect x="{lx}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"/>\n'
        f'  <text x="{tcx}" y="{tcy}" textAnchor="middle" fill="white" '
        f'fontSize="{font_size}" fontWeight="bold">{label}</text>\n'
        f'</a>\n'
    )

def generate_svg(nodes: list, positions: dict, canvas_h: int) -> str:
    canvas_w = X_SUB + SUB_W + 20

    chapters    = [n for n in nodes if n['type'] == 'chapter']
    subs_by_key = {}
    for n in nodes:
        if n['type'] == 'sub':
            subs_by_key.setdefault(n['chapter_key'], []).append(n)
    roots = [n for n in nodes if n['type'] == 'root']

    lines = []
    rects = []

    # Root node
    for rn in roots:
        if rn['path'] not in positions:
            continue
        rlx, rcy = positions[rn['path']]
        rrx = rlx + ROOT_W   # right edge

        # Two-line root label
        fm     = read_frontmatter(rn['path'])
        doc_id = fm.get('id', 'K000104')
        rects.append(
            f'<a href="{rn["url"]}">\n'
            f'  <rect x="{rlx}" y="{rcy - ROOT_H//2}" width="{ROOT_W}" height="{ROOT_H}" rx="8" fill="{C_ROOT}"/>\n'
            f'  <text x="{rlx + ROOT_W//2}" y="{rcy - 5}" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{doc_id}</text>\n'
            f'  <text x="{rlx + ROOT_W//2}" y="{rcy + 10}" textAnchor="middle" fill="#FFCCAA" fontSize="9">index</text>\n'
            f'</a>\n'
        )

        for chap in chapters:
            if chap['path'] not in positions:
                continue
            clx, ccy = positions[chap['path']]
            lines.append(
                f'<path d="{bezier(rrx, rcy, clx, ccy)}" '
                f'stroke="{C_LINE}" strokeWidth="1.5" fill="none" opacity="0.45"/>\n'
            )

    # Chapter + sub nodes
    for chap in chapters:
        if chap['path'] not in positions:
            continue
        clx, ccy = positions[chap['path']]
        crx = clx + CHAP_W
        subs = subs_by_key.get(chap['chapter_key'], [])
        fill = C_CHAP if subs else C_LEAF
        rects.append(node_rect(clx, ccy, CHAP_W, CHAP_H, 5, fill, chap['url'], chap['label'], 11))

        for sub in subs:
            if sub['path'] not in positions:
                continue
            slx, scy = positions[sub['path']]
            lines.append(
                f'<path d="{bezier(crx, ccy, slx, scy)}" '
                f'stroke="{C_LINE}" strokeWidth="1" fill="none" opacity="0.35"/>\n'
            )
            rects.append(node_rect(slx, scy, SUB_W, SUB_H, 4, C_SUB, sub['url'], sub['label'], 10))

    svg_style = "style={{width:'100%',fontFamily:'Arial,sans-serif',backgroundColor:'#ffffff',borderRadius:'8px',display:'block'}}"
    body = ''.join(lines) + ''.join(rects)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas_w} {canvas_h}" {svg_style}>\n'
        f'{body}'
        f'</svg>'
    )

# ── File update ───────────────────────────────────────────────────────────────

MARKER_BEGIN = '<!-- ARTICLE-MAP:BEGIN -->'
MARKER_END   = '<!-- ARTICLE-MAP:END -->'

def update_map_file(map_file: Path, svg: str) -> None:
    """Inject SVG between ARTICLE-MAP markers in a standalone MD file."""
    if not map_file.exists():
        print(f'ERROR: map file not found: {map_file}', file=sys.stderr)
        sys.exit(1)
    text    = map_file.read_text(encoding='utf-8')
    section = f'{MARKER_BEGIN}\n{svg}\n{MARKER_END}'
    if MARKER_BEGIN in text:
        updated = re.sub(
            re.escape(MARKER_BEGIN) + r'.*?' + re.escape(MARKER_END),
            section, text, flags=re.DOTALL
        )
    else:
        updated = text.rstrip('\n') + '\n\n' + section + '\n'
    map_file.write_text(updated, encoding='utf-8')
    print(f'✅ Map file:  {map_file}')

def update_partial_file(partial_file: Path, svg: str) -> None:
    """Write SVG as a standalone MDX partial (no frontmatter, importable component)."""
    content = (
        '{/* Auto-generated by knife_article_map_generate.py — do not edit manually */}\n'
        + svg + '\n'
    )
    partial_file.write_text(content, encoding='utf-8')
    print(f'✅ Partial:   {partial_file}')

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Generate SVG article map for a KNIFE directory.')
    parser.add_argument('--knife-dir',    required=True, help='Path to K000XXX root directory')
    parser.add_argument('--partial-file', default='_article-map-partial.mdx',
                        help='MDX partial for embedding, relative to knife-dir (default: _article-map-partial.mdx)')
    parser.add_argument('--map-file',     default=None,
                        help='Also update standalone MD file with ARTICLE-MAP markers (optional)')
    parser.add_argument('--base-url',     default='/en/knifes',
                        help='Docusaurus base path (default: /en/knifes)')
    parser.add_argument('--dry-run',      action='store_true', help='Print SVG, do not write')
    parser.add_argument('--preview',      action='store_true', help='Print node list only')
    args = parser.parse_args()

    knife_dir = Path(args.knife_dir).resolve()
    knife_id  = knife_dir.name

    nodes = collect_nodes(knife_dir, args.base_url, knife_id)

    if args.preview:
        for n in nodes:
            indent = {'root': '', 'chapter': '  ', 'sub': '    '}[n['type']]
            print(f"{indent}[{n['type'][:4]}] {n['label']!r:28} {n['url']}")
        return

    positions, canvas_h = compute_layout(nodes)
    svg = generate_svg(nodes, positions, canvas_h)

    if args.dry_run:
        print(svg)
        return

    partial_file = knife_dir / args.partial_file
    update_partial_file(partial_file, svg)

    if args.map_file:
        map_file = knife_dir / args.map_file
        update_map_file(map_file, svg)

    n_ch  = sum(1 for n in nodes if n['type'] == 'chapter')
    n_sub = sum(1 for n in nodes if n['type'] == 'sub')
    print(f'Nodes: {len(nodes)} total  ({n_ch} chapters · {n_sub} sub-chapters)')

if __name__ == '__main__':
    main()
