#!/usr/bin/env sh
# Works in POSIX sh / macOS bash 3.2 / zsh

set -eu

ROOT="${1:-docs/sk}"   # štartovacia cesta; môžeš dať aj "." keď si v docs/sk
DRY="${2:-false}"      # 'true' = len vypíše zmeny

echo ">>> Scan for folders having both index.md AND README.md"
echo "ROOT=$ROOT  DRY_RUN=$DRY"
echo

# nájdeme všetky priečinky a pre každý skontrolujeme dvojicu súborov
find "$ROOT" -type d | while IFS= read -r d; do
  idx="$d/index.md"
  rdm="$d/README.md"
  if [ -f "$idx" ] && [ -f "$rdm" ]; then
    echo "DUP: $d"
    if [ "$DRY" != "true" ]; then
      # ak je súbor trackovaný v gite, použi git mv; inak obyčajné mv
      if git ls-files --error-unmatch "$rdm" >/dev/null 2>&1; then
        git mv "$rdm" "$d/README.migrated.md"
      else
        mv "$rdm" "$d/README.migrated.md"
      fi
    fi
  fi
done

echo
echo "Done."
[ "$DRY" = "true" ] && echo "Dry-run only. Re-run without 'true' to apply changes."
