#!/usr/bin/env python3
import argparse, os, sys, re

REQ = ["Category","Type","Priority","ID","Phase","Title","created"]
FM_RE = re.compile(r"^---\n(.*?)\n---", re.S)

def check_file(path):
    with open(path, "r", encoding="utf-8") as f:
        txt = f.read()
    m = FM_RE.search(txt)
    if not m:
        return (False, "missing front matter")
    fm = m.group(1)
    missing = [k for k in REQ if re.search(rf"^{k}:", fm, re.M) is None]
    if missing:
        return (False, "missing keys: " + ", ".join(missing))
    return (True, "ok")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--id", required=False)
    args = ap.parse_args()

    errors = 0
    for root, _, files in os.walk(args.root):
        for fn in files:
            if fn == "index.md" and (not args.id or os.path.basename(root) == args.id):
                ok, msg = check_file(os.path.join(root, fn))
                status = "✅" if ok else "❌"
                print(f"{status} {os.path.join(root, fn)} → {msg}")
                if not ok: errors += 1
    return 0 if errors == 0 else 2

if __name__ == "__main__":
    sys.exit(main())
