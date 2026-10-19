# CSV Validation (dev/csv)

This folder contains lightweight tools to **validate ODS→CSV exports** before running KNIFE generators.

## Files
- `schema/header.aliases.json` — accepted header aliases → canonical keys.
- `knife-csv-verify.mjs` — validator with alias support and robust header detection.
- `Makefile.snippet` — add `knife-validate-csv` to your root Makefile.

## Usage
```bash
# validate default CSV path
node dev/csv/knife-csv-verify.mjs data/KNIFE-OVERVIEW-ONLY.csv --schema dev/csv/schema/header.aliases.json

# or via Makefile (after you merge the snippet)
make knife-validate-csv
```

## Export rules (ODS → CSV)
- Encoding: **UTF-8**
- Delimiter: **comma (`,`)**
- Quote all text cells: **enabled**
- Header row present (canonical or any alias defined in schema)
- Newlines inside cells **must be quoted**
