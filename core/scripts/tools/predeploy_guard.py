# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
predeploy_guard.py
Validates internal links in a built Docusaurus site (static HTML in ./build).

Usage:
  python predeploy_guard.py build

What it does:
  - Finds all .html files in the build folder
  - Extracts <a href="..."> links
  - Checks if each internal link resolves to an existing file in build/
    * absolute links like "/sk/knifes/overview/" -> build/sk/knifes/overview/index.html
    * relative links like "../details/" are resolved against the current file path
    * links with anchors (#...) are considered ok if the page exists
  - Ignores external (http/https/mailto) links
Outputs:
  - predeploy_link_report.csv (broken links: source_html, href, resolved_path)
  - Prints a summary
"""
import os, re, sys, csv
from urllib.parse import urlparse

LINK_RE = re.compile(r'<a\s+[^>]*href=["\']([^"\']+)["\']', re.I)

def is_external(href: str) -> bool:
    href = href.strip()
    if href.startswith("mailto:") or href.startswith("tel:"):
        return True
    p = urlparse(href)
    return bool(p.scheme) and p.scheme not in ("", "file")

def normalize_target(build_root: str, current_html: str, href: str) -> str:
    """
    Map an href to a filesystem path under build_root, or return "" if not applicable.
    Rules:
      - Hash-only (#...) -> valid if current page exists (skip check)
      - Absolute site path (/...) -> build_root + path
      - Relative -> resolve against current_html directory
      - If path endswith '/' -> append 'index.html'
      - If path endswith '/index' -> append '.html'
      - If path has no extension -> treat as directory -> append '/index.html'
      - Keep query/fragment out of filesystem path
    """
    href = href.strip()
    if href == "" or href.startswith("#"):
        return ""  # skip (anchor on same page)
    # strip query/fragment
    no_q = href.split("?",1)[0].split("#",1)[0]

    if no_q.startswith("/"):
        fs = os.path.join(build_root, no_q.lstrip("/"))
    else:
        base_dir = os.path.dirname(current_html)
        fs = os.path.normpath(os.path.join(base_dir, no_q))

    # If it's a directory or directory-like link, map to index.html
    if fs.endswith("/index"):
        fs = fs + ".html"
    elif fs.endswith("/") or not os.path.splitext(fs)[1]:
        fs = os.path.join(fs, "index.html")

    return fs

def main():
    if len(sys.argv) < 2:
        print("Usage: python predeploy_guard.py <build_dir>")
        sys.exit(2)
    build_root = sys.argv[1]
    if not os.path.isdir(build_root):
        print(f"ERROR: build dir not found: {build_root}")
        sys.exit(2)

    broken = []
    html_files = []
    for dirpath, _, files in os.walk(build_root):
        for fn in files:
            if fn.lower().endswith(".html"):
                html_files.append(os.path.join(dirpath, fn))

    for html in html_files:
        try:
            with open(html, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception as e:
            print(f"WARN: cannot read {html}: {e}")
            continue

        for m in LINK_RE.finditer(content):
            href = m.group(1).strip()
            if is_external(href):
                continue
            target_path = normalize_target(build_root, html, href)
            if target_path == "":
                continue  # hash-only or empty
            if not os.path.exists(target_path):
                broken.append((os.path.relpath(html, build_root), href, os.path.relpath(target_path, build_root)))

    report = os.path.join(build_root, "predeploy_link_report.csv")
    with open(report, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["source_html","href","resolved_path"])
        for row in broken:
            w.writerow(list(row))

    total = len(html_files)
    print(f"Scanned HTML files: {total}")
    print(f"Broken internal links: {len(broken)}")
    print(f"Report: {report}")

    # Non-zero exit if broken links found (useful in CI)
    if broken:
        sys.exit(1)

if __name__ == "__main__":
    main()
