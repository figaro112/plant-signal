#!/usr/bin/env bash
# Clean clone of the STHDF class template, without its git history.
#
# Usage:
#   ./clone-student-template.sh <cielovy-priecinok> [url-sablony]
#
# Priklad:
#   ./clone-student-template.sh ST-042-MojeMeno
#   ./clone-student-template.sh PRJ-017-TimovyProjekt
#
# Vysledok: <cielovy-priecinok>/ obsahuje kompletny obsah sablony,
# ale s jednym cistym "Initial commit" - ziadna historia sablony sa neprenasa.

set -euo pipefail

TEMPLATE_URL="${2:-https://github.com/06-STH-Projects/2026_sthdf_class_template.git}"
TARGET_DIR="${1:?Pouzitie: ./clone-student-template.sh <cielovy-priecinok> [url-sablony]}"

if [ -e "$TARGET_DIR" ]; then
  echo "Chyba: '$TARGET_DIR' uz existuje." >&2
  exit 1
fi

echo "Klonujem sablonu (bez historie) z: $TEMPLATE_URL"
git clone --depth 1 "$TEMPLATE_URL" "$TARGET_DIR"

rm -rf "$TARGET_DIR/.git"
cd "$TARGET_DIR"
git init -q
git add -A
git commit -q -m "Initial commit - zaklad zo STHDF class template"

echo ""
echo "Hotovo. '$TARGET_DIR' je teraz samostatny git repozitar bez historie sablony."
echo "Dalsi krok: zaloz prazdny repozitar na GitHub a pripoj ho ako remote:"
echo "  cd $TARGET_DIR"
echo "  git remote add origin <URL-tvojho-noveho-repozitara>"
echo "  git push -u origin main"
