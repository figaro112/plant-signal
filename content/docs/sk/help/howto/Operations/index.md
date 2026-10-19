# 🧰 Operations skripty (Windows / macOS / Linux)

Súbory v priečinku `core/operations/` sú **tenké wrapper skripty** nad generátorom  
`core/scripts/tools/new_item_instance.py`. Ich cieľ:

- zjednodušiť volanie generátorov,
- skryť dlhé parametre (config, content_dir, template_root…),
- ponúknuť rovnaký UX pre rôzne OS.

> 💡 Odporúčanie: pre študentov a bežné použitie komunikujeme najmä tieto skripty,  
> nie priamy Python príkaz.

---

## 🔁 Základný princíp

Každý operations skript urobí zhruba toto:

1. nastaví **koreň repozitára** (`cd` do rootu),
2. zavolá `python3 core/scripts/tools/new_item_instance.py`  
   s príslušným `--type` (napr. `7ds`, `sdlc`, `sthdf`, `q12`, `thesis`, `knife`),
3. odovzdá názov inštancie a voliteľné argumenty (napr. `--title`, `--exists-mode`…).

---

## 🖥 macOS / Linux (`.sh` skripty)

Typicky v tvare:

- `core/operations/new-knife.sh`
- `core/operations/new-sthdf.sh`
- `core/operations/new-7ds.sh`
- `core/operations/new-sdlc.sh`
- `core/operations/new-q12.sh`
- `core/operations/new-thesis.sh` (pripravené do budúcna)

### ✅ Predpoklady

- nainštalovaný **Python 3** (`python3`),
- spustiteľné práva na skripte:

```
chmod +x core/operations/new-7ds.sh

```

# ▶️ Príklady použitia
# Nový KNIFE zápis
```

core/operations/new-knife.sh K000123_MojPrvyKnife "Môj prvý KNIFE zápis"
```

# Nová 7Ds inštancia
```

core/operations/new-7ds.sh 7ds_MojProjekt "7Ds – Môj projekt"
```

# Nový SDLC strom
```

core/operations/new-sdlc.sh sdlc_MojProjekt "SDLC – Môj projekt"
```

# Nový Q12 zápis
```

core/operations/new-q12.sh Q12_Sample_002 "Q12 – Druhá vzorka"
```

# (budúce) Nová thesis šablóna

core/operations/new-thesis.sh thesis_MojStudent "Thesis – Meno študenta"

## 🪟 Windows CMD (.cmd skripty)
Pre Windows máme zrkadlové skripty:
```

	•	core/operations/new-knife.cmd
	•	core/operations/new-sthdf.cmd
	•	core/operations/new-7ds.cmd
	•	core/operations/new-sdlc.cmd
	•	core/operations/new-q12.cmd
	•	core/operations/new-thesis.cmd

```

# ✅ Predpoklady

•	nainštalovaný Python 3 dostupný ako python alebo py,
•	spúšťaš skripty z rootu repozitára (alebo skript sám spraví cd do rootu).


# ▶️ Príklady použitia (CMD)

## Nový KNIFE zápis
```
core\operations\new-knife.cmd K000123_MojPrvyKnife "Môj prvý KNIFE zápis"
```
## Nová 7Ds inštancia
```
core\operations\new-7ds.cmd 7ds_MojProjekt "7Ds – Môj projekt"
```

## Nový SDLC strom
```
core\operations\new-sdlc.cmd sdlc_MojProjekt "SDLC – Môj projekt"
```

## Nový Q12 zápis
```
core\operations\new-q12.cmd Q12_Sample_002 "Q12 – Druhá vzorka"
```

## (budúce) Nová thesis šablóna
```
core\operations\new-thesis.cmd thesis_MojStudent "Thesis – Meno študenta"
```

# 🧪 Existuje priečinok → exists_mode

Generátor vie reagovať na existujúci cieľový priečinok:
	•	--exists-mode=error – ak priečinok existuje, skončí s chybou (default),
	•	--exists-mode=skip – nič neurobí, len ticho preskočí,
	•	--exists-mode=replace – zmaže cieľový priečinok a vygeneruje nanovo.

V operations skriptoch môžeš tento parameter doplniť podľa svojho štýlu práce alebo
pripraviť 2 varianty skriptu (napr. new-7ds.sh vs new-7ds-replace.sh).

# 🔍 Kde hľadať detaily

•	zdrojový kód generátora:
core/scripts/tools/new_item_instance.py
•	spoločná logika front matter a šablón:
core/scripts/tools/base_fm.py
•	konkrétne generátory (7Ds, SDLC, STHDF…):
core/scripts/tools/new_7ds.py, new_sdlc.py, new_sthdf.py, new_q12.py, …

## 👀 TIP: Ak pridáš nový typ (napr. esg, dao…), stačí:
```
	1.	doplniť nový new_xxx.py generátor,
	2.	pridať new-xxx.sh / new-xxx.cmd do core/operations/,
	3.	pridať HOWTO stránku do tejto sekcie.
```


## 🧭 Navigácia

- 🆘 [Späť na HOWTO – Praktické návody](./index.md)
- 🏠 [Späť na HELP (SK)](../index.md)
- 🔼 [Späť na KNIFE Overview](../../index.md)