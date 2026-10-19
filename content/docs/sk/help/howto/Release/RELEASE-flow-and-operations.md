# KNIFE Overview – Release flow & operations (CLI)

Tento dokument popisuje odporúčaný základny postup pri publikovaní novej verzie
repozitára **knifes_overview-03** na GitHub + GitHub Pages (Docusaurus build).

> ⚠️ Predpoklady:
> - pracuješ v hlavnej vetve `main`,
> - máš nastavený vzdialený repozitár `origin`,
> - Makefile ciele `build-fast`, `W40-deploy` sú funkčné,
> - Node, Python, git sú nainštalované.

---

## 1. Lokálna kontrola zmien

```bash
# 1.1 Pozri aktuálny stav
git status

# 1.2 Skontroluj diff
git diff
```

Ak sú tam nechcené zmeny, uprav ich alebo vráť.

---

## 2. Lokálny build (Docusaurus)

```bash
# v koreňovom priečinku repozitára
make build-fast
```

- `build-fast`:
  - vygeneruje KNIFE overview (knife_overview_generate.py),
  - skopíruje `content/docs` do `publishing/docusaurus/docs`,
  - spustí `npm run build -- --no-minify` v `publishing/docusaurus`,
  - skopíruje assets podľa Makefile (napr. ActivePresenter HTML5 výstupy).

Ak build prebehne úspešne bez ERROR, môžeš pokračovať.
V prípade Warnings je potrebné zhodnotiť, či sú akceptovateľné
(napr. dočasne neexistujúce linky v rozpracovaných témach).

---

## 3. Príprava commitu

```bash
# 3.1 Skontroluj zmenené súbory po builde
git status

# 3.2 Ak si spokojný, pridaj všetko do indexu
git add -A

# 3.3 Posledná rýchla kontrola
git status
```

Ak vidíš medzi staged súbormi niečo, čo nechceš commitovať,
môžeš to vybrať príkazom `git restore --staged <súbor>`.

---

## 4. Commit

```bash
git commit -m "Release: v0.3.0 – KNIFE overview + helpers"
```

Odporúčaný formát správy:

- prefix `Release:` alebo `Feature:` alebo `Fix:`,
- krátky popis,
- voliteľne číslo verzie (napr. `v0.3.0`).

Po commite si môžeš pozrieť krátku históriu:

```bash
git log --oneline -n 5
```

---

## 5. Tag releasu (voliteľné, ale odporúčané)

Tag sa používa na označenie stabilného bodu v histórii:

```bash
# 5.1 Vytvor anotovaný tag (napr. v0.3.0)
git tag -a v0.3.0 -m "KNIFE overview – prvý public release"

# 5.2 Skontroluj tagy
git tag --list
```

Tag môžeš vytvoriť aj neskôr, ale je praktické robiť to
bezprostredne po commite, ktorý považuješ za release-ready.

---

## 6. Push na GitHub

```bash
# 6.1 Push vetvy main
git push origin main

# 6.2 Ak si vytvoril tag, pushni aj tagy
git push origin --tags
```

Po úspešnom pushnutí sú commit aj tag dostupné na GitHube.
V prípade, že máš GitHub Actions pripravené na tagy, môžu sa
spúšťať automaticky – zatiaľ ich v tomto projekte používame minimálne.

---

## 7. Deploy (GitHub Pages / Docusaurus)

Ak používaš deploy cez Makefile (napr. worktree + gh-pages vetvu),
spustíš:

```bash
# kontrola/obnova worktree
make W10-check-worktree

# build + deploy (podľa tvojej konfigurácie)
make W40-deploy
```

Typický scenár:
- `W10-check-worktree` vytvorí alebo opraví worktree pre `gh-pages`,
- `W40-deploy` skopíruje vybuildovaný obsah do worktree a urobí commit/push.

Po úspešnom deploy by si mal vidieť aktuálnu verziu webu
na adrese `https://knifes.systemthinking.sk` (alebo inej podľa `SITE_URL`).

---

## 8. Rýchly checklist pred release

1. ✅ `make build-fast` prebehol bez ERROR.
2. ✅ Navigácia (sidebar, HELP, 7Ds, SDLC, Q12, KNIFE overview) funguje.
3. ✅ Neobsahuješ privátne alebo citlivé dáta.
4. ✅ Commit message jasne hovorí, čo sa zmenilo.
5. ✅ Tag (ak chceš) zodpovedá obsahu releasu.
6. ✅ GitHub Pages zobrazuje novú verziu bez chýb.

---

## 9. Skripty v `core/operations`

V tomto ZIP-e nájdeš aj ukážkové skripty:

- `new-knife.sh`
- `new-sthdf.sh`
- `new-7ds.sh`
- `new-sdlc.sh`
- `new-q12.sh`
- `new-thesis.sh`

Odporúčaný postup:

1. Rozbaľ ZIP.
2. Skripty skopíruj do `core/operations/` v projekte.
3. Nastav im spustiteľný príznak:

   ```bash
   chmod +x core/operations/new-*.sh
   ```

4. Prispôsob defaultné hodnoty (ID, názvy) podľa svojich potrieb.

Tieto skripty sú len tenký wrapper nad `new_item_instance.py` –
cieľ je mať **jednoduché, zapamätateľné príkazy** typu:

```bash
core/operations/new-7ds.sh 7ds_PlatobnyPortal "7Ds – Platobný portál"
```

ktoré urobia všetky nízkoúrovňové kroky za teba.
