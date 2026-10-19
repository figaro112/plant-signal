---
title: Release Notes
---
 
### 🔖 Ako vytvoriť Release v0.4.0

Existujú dva spôsoby: **CLI (git)** alebo **GitHub UI**.

#### ✅ 1. RELEASE cez CLI
1. Skontroluj stav:
   ```bash
   git status
   ```
2. Pridaj zmeny:
   ```bash
   git add -A
   ```
3. Commitni:
   ```bash
   git commit -m "Release v0.4.0"
   ```
4. Vytvor tag:
   ```bash
   git tag v0.4.0
   ```
5. Pushni branch aj tag:
   ```bash
   git push
   git push origin v0.4.0
   ```

#### ✅ 2. RELEASE cez GitHub (UI)
1. Otvor GitHub repo → **Releases**
2. Klikni **Draft a new release**
3. Tag version: `v0.4.0`
4. Target: `main`
5. Title: `v0.4.0 – STHDF HELP & Generátor`
6. Popis môžeš skopírovať z tejto stránky
7. Klikni **Publish Release**
# Release Notes – KNIFE Overview & STHDF Framework

Táto stránka zhromažďuje zmeny, ktoré ovplyvňujú:
- generátory (KNIFE & STHDF),
- šablóny,
- HELP dokumentáciu,
- infraštruktúru pre výuku a class templaty.

---
## v0.4.0 – STHDF HELP & Generátor (2025-11-23)

- systém podporuje nasledovné typy príspevkov:
- 1. KNIFE - Knowledge in Friendly Examples 
- 2. 7Ds - Seved Disciplines for Successful Solution
- 3. SDLC - Keep track in Solution Develop,emt Life Cycle
- 4. Q12 - Twelve Quadrants to manage  Your startup
- 5. STHDF - System Thinking and Digital Fabrication - 
- 6. Theses - to be finished

- Systém podporuje multimediálny obsah v HTML5 (cez iFrame)

- Systém obsahuje základné sktipty pre vytvorenie jednotlivých typov v adresári operation
- Systém podporuje scripty pre Windows (cmd), Mac, linux (sh)
- Systém obsahuje základné návody v help adresári
- 

## v0.3.0 – STHDF HELP & Generátor (2025-11-18)

### 📘 Nové HOWTO
- `new-knife.md` – kompletný návod pre vytvorenie nového KNIFE z CLI aj Makefile.
- `new-sthdf.md` – návod pre generovanie novej STHDF inštancie (študent/ročník).

### 🧰 Generátor `new_item_instance.py`
- KNIFE: `title` = **"ID – Názov"** (bez sidebar_label).
- STHDF: automatické generovanie dvojice:
  - `ID – projekty`
  - `ID – študenti`

### 🧹 Fix skripty
- pridaný jednorazový skript `knifes_fix_titles_once.py`
  na doplnenie ID do starších KNIFE názvov.

---

## v0.2.0 – Docusaurus pomocník & OS inštalácie (2025-11-15)

### 📘 Ako nainštalovať Docusaurus
- nový súbor `help/docusaurus.md`

### 💻 OS Install Guides
- macOS
- Windows + MSYS2
- Linux

---

## v0.1.0 – Inicializácia štruktúry (2025-11-10)

- základná štruktúra KNIFE Overview,
- sidebar + lokalizácia,
- prvé KNIFE dokumenty,
- Makefile pre build & dev server.

---

> ✨ *Release notes sú motorom dlhodobého poriadku.  
Keď systém rastie, práve tu ostáva história rozhodnutí.“*