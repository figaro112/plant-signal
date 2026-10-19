---
title: GitHub Classroom – Onboarding pre študentov
---

# GitHub Classroom – Onboarding pre študentov

Vitaj v kurze **System Thinking in IT & Digital Fabrication (STHDF)**!  
Tento krátky návod ti ukáže, ako sa pripojiť do GitHub Classroom, vytvoriť svoj repozitár a začať pracovať na svojich úlohách.

> 💬 *Neboj sa – celý postup je jednoduchý.  
> GitHub Classroom je ako vstupná brána: klikneš, otvorí sa ti miesto, kde budeš pracovať celý semester.*

---

## 1. Čo potrebuješ pred začiatkom?

- **GitHub účet**  
  - použi svoj osobný GitHub účet  
  - ak nemáš, vytvor si nový na https://github.com (trvá to 30 sekúnd)
- **Laptop / PC**
- **Základné nástroje nainštalované lokálne:**
  - **Git**  
  - **Node.js (LTS)** – pre lokálny Docusaurus web  
  - **Python 3** – len pre pokročilejšiu prácu s KNIFE/STHDF

> ℹ️ *Nepotrebuješ žiadny špeciálny školský GitHub účet ani STU login.*

---

## 2. Ako vstúpiť do kurzu (najdôležitejšia časť)

Na prednáške alebo v Teams dostaneš **special invite link**, napr.:

```
https://classroom.github.com/a/xxxxxxx
```

### Keď klikneš na link:

1. Ak nie si prihlásený → GitHub ťa požiada o login.
2. GitHub Classroom sa opýta, či sa chceš pridať do triedy.
3. Potvrdíš ➝ tvoja osobná „pracovná zóna“ sa začne vytvárať.
4. Po pár sekundách dostaneš súkromný repozitár:

```
SystemThinking/2025_STHDF_<tvoj_github_username>
```

Tento repozitár je **len tvoj** a bude slúžiť na:

- spracovanie úloh,
- dokumentáciu KNIFE výstupov,
- projekt STHDF,
- osobné poznámky,
- prezentácie.

---

## 3. Ako si sklonuješ svoj repozitár

Otvoriť v GitHub UI → zelené tlačidlo **Code**.

### macOS / Linux

```bash
git clone https://github.com/SystemThinking/2025_STHDF_tvojUser.git
cd 2025_STHDF_tvojUser
```

### Windows (MSYS2 / Git Bash)

```bash
git clone https://github.com/SystemThinking/2025_STHDF_tvojUser.git
cd 2025_STHDF_tvojUser
```

---

## 4. Prvé spustenie lokálneho webu (Docusaurus)

Tento projekt obsahuje modernú dokumentáciu postavenú na Docusauruse.

Po prvom clone je potrebné nainštalovať balíky:

```bash
cd publishing/docusaurus
npm install
```

### Potom spustíš lokálny web:

```bash
npm run start
```

A otvoríš:

```
http://localhost:3000
```

> 🔄 *Po úprave .md súborov sa stránka automaticky aktualizuje.*

---

## 5. Vytvorenie vlastnej STHDF identity (POVINNÝ krok)

Každý študent dostane repozitár s názvom:

```
2025_STHDF_<tvoj_github_username>
```

Aby si vedel pracovať s vlastným priestorom (KNIFE, poznámky, projekt), vytvoríš si **STHDF inštanciu** – tá definuje tvoj „študentský profil“ v dokumentácii.

### macOS / Linux

```bash
cd core/scripts/tools
python3 new_item_instance.py \
  --type sthdf \
  --config ../../config/sthdf/sthdf_instance_config.yml \
  --id <tvoj_github_username> \
  --title "STHDF – <tvoj_github_username>" \
  --exists fail
```

### Windows

```bash
cd core/scripts/tools
python new_item_instance.py \
  --type sthdf \
  --config ../../config/sthdf/sthdf_instance_config.yml \
  --id <tvoj_github_username> \
  --title "STHDF – <tvoj_github_username>" \
  --exists fail
```

> ℹ️ *ID už nie je vo formáte 2025_ST_XXX.  
> GitHub Classroom prideľuje repozitáre podľa tvojho GitHub username.  
> Preto aj tvoja STHDF identita používa rovnaké ID.*

Po spustení skriptu reštartuj `npm run start`. V ľavom menu pribudnú časti:

- **Moje poznámky**
- **Moje KNIFE**
- **Môj projekt**

---

## 6. Ako odovzdávaš úlohy

Všetko prebieha cez tvoj súkromný repozitár:

- commit → push
- GitHub automatiky sleduje progres
- každý commit je dôkaz tvojej činnosti

Nie sú žiadne uploady cez Teams.  
Všetko ide cez GitHub.

---

## 7. Riešenie problémov

### ❌ „Permission denied (publickey)“
– máš chýbajúci SSH key  
→ odporúčame pracovať cez **HTTPS**, nie SSH

### ❌ „npm: command not found“
– nemáš nainštalovaný Node.js

### ❌ „Nothing appears on localhost:3000“
– Docusaurus nebol spustený (`npm run start`)  
– alebo sa nachádzaš v zlom priečinku

---

## 8. Mini-checklist pre štart

- [ ] Mám GitHub účet  
- [ ] Klikol som na assignment link  
- [ ] Mám svoj súkromný repozitár  
- [ ] Urobil som `git clone`  
- [ ] Spustil som `npm install`  
- [ ] Otvoril som lokálny web  
- [ ] Vytvoril som vlastnú STHDF identitu  
- [ ] Naučil som sa commitovať a pushovať

---

## 💬 Small Talk Moment

> *GitHub Classroom je ako vstupný kľúč do tvorivého laboratória.  
> Vstúpiš dnu, a zrazu je všetko tvoje – projekty, nápady, aj malé chybičky krásy.  
> To všetko je súčasť cesty.* 😊

---

Ak niečo nefunguje, obráť sa na učiteľa alebo napíš issue do svojho repozitára.
