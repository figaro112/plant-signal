#!/usr/bin/env python3
import os
from PIL import Image, UnidentifiedImageError

root = "publishing/docusaurus/static/img"
report = "img_integrity_report.txt"

results = []
for path, _, files in os.walk(root):
    for f in sorted(files):
        if f.lower().endswith(".png"):
            full = os.path.join(path, f)
            try:
                if os.path.getsize(full) == 0:
                    results.append(f"⚠️  EMPTY FILE  → {full}")
                else:
                    with Image.open(full) as img:
                        img.verify()  # overí integritu
                    results.append(f"✅  OK          → {full}")
            except (UnidentifiedImageError, OSError):
                results.append(f"❌  BROKEN/NOT PNG  → {full}")

# uloženie do reportu
with open(report, "w", encoding="utf-8") as f:
    f.write("\n".join(results))

print(f"✅ Done. Checked {len(results)} PNG files.")
print(f"📄 Report saved to: {os.path.abspath(report)}")