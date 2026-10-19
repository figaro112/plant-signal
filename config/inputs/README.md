# KNIFE Toolkit

Tento balík obsahuje skripty a makefile ciele na prácu s CSV a frontmatterom.

## 📑 CSV konvencie v KNIFE

- **Voľná hlavička (preface)**  
  CSV môže obsahovať riadky textu alebo navigácie pred samotnou tabuľkou. Slúžia pre ľudí (poznámky, komentáre).

- **Dátová hlavička**  
  Prvý riadok tabuľky vždy začína stĺpcom `id` a obsahuje aj stĺpec `title`.

- **Parser**  
  Všetky KNIFE skripty (sanitize, verify, merge) automaticky nájdu dátovú hlavičku a ignorujú text nad ňou.

- **Export**  
  V Calc/Excel môže byť voľný text, ale pri spracovaní v CI/CD pipeline sa vždy pracuje až od dátovej hlavičky.

## Použitie

Príklad príkazov:
```bash
node scripts/knife-csv-sanitize.mjs data/KNIFE-OVERVIEW-ONLY.csv > data/KNIFE-OVERVIEW-ONLY_cleaned.csv
node scripts/knife-csv-verify.mjs data/KNIFE-OVERVIEW-ONLY_cleaned.csv
node scripts/knife-frontmatter-merge.mjs --csv data/KNIFE-OVERVIEW-ONLY_cleaned.csv --dry-run
```
