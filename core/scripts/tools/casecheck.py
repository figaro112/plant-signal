#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fail if repo contains files that only differ by case (README.md vs Readme.md).
Works cross-platform. Ignores .git directory.
"""
import os, sys

def list_tracked():
    # read from git to respect .gitignore
    import subprocess
    out = subprocess.check_output(["git", "ls-files"], text=True)
    return [p.strip() for p in out.splitlines() if p.strip()]

def main():
    files = list_tracked()
    by_lower = {}
    for p in files:
        lp = p.lower()
        by_lower.setdefault(lp, []).append(p)

    conflicts = [v for v in by_lower.values() if len(v) > 1]
    if conflicts:
        print("❌ Case-insensitive filename conflicts detected:\n")
        for group in conflicts:
            print("  • " + " | ".join(group))
        print("\n💡 Rename súbory tak, aby sa nelíšili len veľkosťou písmen.")
        print("   Na NTFS/HFS+ môže vzniknúť chaos, a buildy na Linuxe spadnú.")
        sys.exit(1)
    else:
        print("✅ No case-related filename issues detected.")
        sys.exit(0)

if __name__ == "__main__":
    main()
