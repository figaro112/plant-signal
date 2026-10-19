#!/bin/bash
set -e


echo "🔍 Čistím .md odkazy v súboroch..."
find docs -type f -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed -E -i '' 's/(\[[^]]*\]\([^)]*)\.md(\)|#[^)]+|\?[^\)]+|\#[^\)]+|\?[^\)]+\#[^\)]+)(\))/\1\2\3/g' "$file"
done

echo "✅ Hotovo!"
echo "Záloha je v priečinku $BACKUP_DIR"
