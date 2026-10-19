---
title: HOWTO – Nový KNIFE príspevok
---

# HOWTO – Ako vytvoriť nový KNIFE príspevok

## 1. Predpoklady

- KNIFE template je pripravený v repozitári.
- Makefile obsahuje target `knife-new`.
- Generátor `new_item_instance.py` je funkčný.

## 2. Vytvorenie KNIFE cez Makefile

Najjednoduchší spôsob (používame bežne v kurze):

```
make knife-new ID=K123456 NAME="Moja téma" LOCALE=sk
```

Výsledkom je:
- priečinok `content/docs/sk/knifes/K123456-moja-tema/`,
- koreňový súbor `index.md` s vyplneným Front Matter,
- automaticky doplnený titulok: `K123456 – Moja téma`.

---

# Nový KNIFE z CLI

> Spúšťaj z rootu repozitára napríklad `knifes_overview-03`.

## 3. Vytvorenie KNIFE cez Python CLI (macOS / Linux)

```
python3 core/scripts/tools/new_item_instance.py \
  --type knifes \
  --config config/knifes/knifes_config.yml \
  --id K000123 \
  --name "Moj-prvy-KNIFE" \
  --title "Môj prvý KNIFE" \
  --exists error
```

## 4. Vytvorenie KNIFE cez Python CLI (Windows / MSYS2)

```
python3 core/scripts/tools/new_item_instance.py ^
  --type knifes ^
  --config config/knifes/knifes_config.yml ^
  --id K000123 ^
  --name "Moj-prvy-KNIFE" ^
  --title "Môj prvý KNIFE" ^
  --exists error
```

> 🔁 Namiesto `K000123` a názvu si doplň vlastné KNIFE ID a názov.

---

## 5. Vysvetlenie parametrov

### `python3` / `python`
Spúšťa Python interpret.
- macOS / Linux: zvyčajne `python3`
- Windows: typicky `python`

### `core/scripts/tools/new_item_instance.py`
Hlavný generátor nových inštancií (KNIFE, STHDF, Q12…).

### `--type knifes`
Určuje, že sa vytvára KNIFE príspevok.

### `--config config/knifes/knifes_config.yml`
Konfiguračný súbor KNIFE:
- kde sú šablóny,
- kam uložiť nový KNIFE,
- ako vytvoriť predvolené metadata.

### `--id K000123`
Jedinečné ID KNIFE.
- Formát: `K` + 6 číslic (napr. `K000123`).
- Používa sa v názve priečinka aj vo Front Matter.

### `--name "Moj-prvy-KNIFE"`
Technické meno inštancie.  
Používa sa pre:
- názov priečinka (slug),
- fallback pre title (ak nie je zadaný),
- referenčný názov pre generátor.

Ak parameter nešpecifikujete, generátor KNIFE použije predvolený názov:  
```
new_knife
```

### `--title "Môj prvý KNIFE"`
Ľudský názov KNIFE. V kombinácii s ID sa vytvorí finálny nadpis:
```
K000123 – Môj prvý KNIFE
```
Docusaurus si tento názov automaticky zobrazí v sidebare.

### `--exists error`
Politika existujúceho obsahu:
- `error` – ak priečinok existuje, generátor skončí chybou,
- ďalšie možné hodnoty podľa konfigurácie: `skip`, `replace`.

---

## 6. Čo doplniť ručne

Po vygenerovaní odporúčame doplniť:
- opis problému,
- obrázky alebo diagramy,
- podstránky (ak je téma rozsiahla).

## 7. Overenie

```
make dev
```

Skontroluj:
- či sa KNIFE zobrazuje v prehľade,
- či nie sú broken links,
- či funguje navigácia.
