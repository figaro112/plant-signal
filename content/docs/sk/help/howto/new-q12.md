# 🧩 Ako vytvoriť nový Q12 záznam

Tento návod popisuje, ako vygenerovať novú Q12 položku pomocou **Makefile** alebo **Python CLI**.  
Q12 používame na rýchle otázky, reflexie, mikro‑príspevky alebo krátke denníkové zápisy v rámci STHDF / KNIFE.

---

## 1. Makefile – správny príkaz

> 🛑 **Pozor:** V projekte *neexistuje* target `Q12-q12-new`.  
> Správny názov targetu je:

```
make q12-new Q12_NAME="Q12-0001" TITLE="Toto je test Q12"
```

Parametre:

- `Q12_NAME` → technické meno / ID Q12 položky  
- `TITLE` → ľudský názov (použije sa do Front Matter)

Makefile potom zavolá generátor:

```
python3 core/scripts/tools/new_item_instance.py \
  --type q12 \
  --config config/q12/q12_config.yml \
  --id "$Q12_NAME" \
  --name "$Q12_NAME" \
  --title "$TITLE" \
  --exists error
```

---

## 2. Python CLI (macOS / Linux)

Ak chceš vytvoriť Q12 bez Makefile:

```
python3 core/scripts/tools/new_item_instance.py \
  --type q12 \
  --config config/q12/q12_config.yml \
  --id Q12-0001 \
  --name "Q12-0001" \
  --title "Toto je test Q12" \
  --exists error
```

---

## 3. Python CLI (Windows / MSYS2)

```
python core/scripts/tools/new_item_instance.py ^
  --type q12 ^
  --config config/q12/q12_config.yml ^
  --id Q12-0001 ^
  --name "Q12-0001" ^
  --title "Toto je test Q12" ^
  --exists error
```

---

## 4. Vysvetlenie parametrov

### `--id Q12-0001`
Jedinečný identifikátor Q12. Používa sa aj v názve priečinka.

### `--name "Q12-0001"`
Technické meno inštancie. Ak nie je uvedené, doplní sa fallback `new_q12`.

### `--title "Toto je test Q12"`
Ľudský názov, ktorý sa objaví v UI a nadpisoch.

### `--exists error`
Politika pri existujúcich súboroch:
- `error` – bezpečná voľba, skončí pri kolízii,
- `skip` – preskočí,
- `replace` – prepíše,
- `merge` – rezervované.

---

## 5. Kde sa nový Q12 uloží?

Po generovaní vznikne nový priečinok:

```
content/docs/sk/q12/Q12-0001/
```

Vnútri bude:
- `index.md` s Front Matter,
- prípadné ďalšie súbory podľa šablóny.

---

## 6. Tipy

- Odporúčame používať jednotný tvar ID: `Q12-0001`, `Q12-0002`, …  
- Na jeden deň/otázku môžeš mať viac Q12 (napr. `Q12-2025-11-20-A`).

---

💬 *Small Talk Moment:*  
„Q12 sú ako rýchle poznámky na žltom lístku – malé, ale často zachránia celý deň.“ 😊
