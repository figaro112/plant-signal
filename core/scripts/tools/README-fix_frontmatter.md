# KNIFE Front Matter Fix Kit

Tento nástroj **upraví iba front matter** v Markdownoch. Telo súboru nemení.

## Čo robí
- Ak súbor front matter **nemá**, vytvorí ho (podľa KNIFE pečiatky).
- Ak front matter **má**, znormalizuje typy:
  - prázdne / null → `""`
  - `sidebar_position` → číslo (bez úvodzoviek) alebo vynechané
  - `tags`, `authors` → pole
- Doplní povinné polia (`id`, `guid`, `dao`, `title`, `created`, `locale`, …).
- **Slug necháva na pokoji** (aby sme nerozbili odkazy). Ak chceš auto-slug, použij `--set-slug`.
- Neznáme polia ponechá tak, ako sú.

Heuristiky:
- `dao`: `"knife"` ak cesta obsahuje `/knifes/`, inak `"class"`
- `id`: ak chýba, pokúsi sa nájsť `K###` v ceste; potom zoberie názov priečinka/súboru
- `title`: ak chýba, zoberie prvý `# Nadpis` z tela, inak `id`
- `guid`: ak chýba, vygeneruje: `{dao}-{id}-{uuid4}`
- `locale`: `"sk"` ak cesta obsahuje `/sk/`, inak `"en"`

## Použitie
```bash
# náhľad bez zápisu
python fix_frontmatter.py --root docs --dry-run

# ostrý beh
python fix_frontmatter.py --root docs

# ak chceš auto-doplniť slugy podľa cesty
python fix_frontmatter.py --root docs --set-slug
```

## Odporúčané umiestnenie
`tools/fix_frontmatter.py` (a spúšťaj cez Make alebo ručne)

## Makefile snippet
```make
fm.dry:
	python3 tools/fix_frontmatter.py --root docs --dry-run

fm.fix:
	python3 tools/fix_frontmatter.py --root docs
```

> Poznámka: Ak máš špeciálne pravidlá pre `dao` mimo priečinka `knifes`, upravme skript (je modulárny).
