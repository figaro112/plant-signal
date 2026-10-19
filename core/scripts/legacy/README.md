# KNIFE Toolkit — header‑ready (preface friendly)

Táto verzia skriptov **oficiálne podporuje voľnú hlavičku/preface** nad tabuľkou.
Nástroje vždy automaticky nájdu **dátovú hlavičku** (riadok začínajúci `id` a obsahujúci `title`) a až odtiaľ spracujú dáta.

## 📑 CSV konvencie (záväzné)
- **Voľná hlavička (preface)** pred tabuľkou je povolená (text pre ľudí).
- **Dátová hlavička**: prvý riadok tabuľky začína `id` a obsahuje `title`.
- **Parser** v skriptoch **ignoruje text nad tabuľkou** a pracuje až od dátovej hlavičky.
- **Export** z Calc/Excel môže mať voľný text; CI/CD spracúva až od dátovej hlavičky.

## Obsah
- `scripts/knife-csv-sanitize.mjs` – normalizácia CSV (NBSP, CRLF, „smart quotes“).
- `scripts/knife-csv-verify.mjs` – **header‑ready verifikátor** (duplicitné ID/slug, prázdne title, drift dĺžky riadkov).
- `scripts/knife-frontmatter-merge.mjs` – **merge‑only** dopĺňanie frontmatteru, **CSV načítava od dátovej hlavičky**.
- `scripts/knife-slug-report.mjs` – kontrola slugov v docs.
- `scripts/knife-dedupe-report.mjs` – duplicitné priečinky/ID/slugy + generated-index konflikty.
- `Makefile.snippet` – ciele pre jednoduché použitie.

## Rýchly štart
```bash
# 1) sanitize (nevymieňa originál)
node scripts/knife-csv-sanitize.mjs data/KNIFE-OVERVIEW-ONLY.csv > data/KNIFE-OVERVIEW-ONLY_cleaned.csv

# 2) verify (preface friendly)
node scripts/knife-csv-verify.mjs data/KNIFE-OVERVIEW-ONLY_cleaned.csv

# 3) merge-only frontmatter zo CSV (preface friendly)
node scripts/knife-frontmatter-merge.mjs --csv data/KNIFE-OVERVIEW-ONLY_cleaned.csv --dry-run
```
