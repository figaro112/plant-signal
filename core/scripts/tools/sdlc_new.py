#!/usr/bin/env python3
import argparse, os, datetime, sys

TEMPLATE = """---
Category: {category}
Type: SDLC
Priority: {priority}
ID: {sid}
Phase: {phase}
Title: "{title}"
created: {created}
modified:
# GUID:   # (vyplní sa neskôr)
# DAO:    # (voliteľné)
---

# {sid} — {title}

## D1 – Management
## D2 – Motivation
## D3 – Analysis
## D4 – Design
## D5 – Implementation
## D6 – Verification
## D7 – Lessons Learned
"""

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--id", required=True)
    p.add_argument("--title", required=True)
    p.add_argument("--phase", required=True)
    p.add_argument("--category", required=True)
    p.add_argument("--priority", default="🎯")
    p.add_argument("--locale", choices=["sk","en"], default="sk")
    p.add_argument("--out", required=True)  # cieľový folder (napr. docs/sk/7Ds/SDLC_005)
    args = p.parse_args()

    out_dir = args.out
    os.makedirs(out_dir, exist_ok=True)

    index_md = os.path.join(out_dir, "index.md")
    if os.path.exists(index_md):
        # add-only: nič nemeníme, len oznámime
        print(f"index.md už existuje → add-only režim, nič som nemenil: {index_md}")
        return 0

    now = datetime.date.today().isoformat()
    content = TEMPLATE.format(
        category=args.category,
        priority=args.priority,
        sid=args.id,
        phase=args.phase,
        title=args.title.replace('"','\\"'),
        created=now
    )

    with open(index_md, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ Vytvorené: {index_md}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
