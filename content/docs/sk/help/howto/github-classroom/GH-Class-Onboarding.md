---
title: "GitHub Classroom – Onboarding študentov"
---

# GitHub Classroom – Onboarding študentov

Tento návod popisuje proces, ako dostať študentov z e‑mailu až k ich vlastnému repozitáru na GitHube.

## 1. Predpoklady (učiteľ)

- máš vytvorenú **Classroom triedu** (napr. `STHDF 2025/2026`),
- máš pripravený **template repozitár** (napr. `2025_sthdf_class_template`),
- vieš sa prihlásiť do GitHub Classroom s učiteľským účtom,
- máš **zoznam študentov** (meno, priezvisko, e‑mail).

> Poznámka: v tejto verzii používame štandardný onboarding GitHubu – študenti sa prihlasujú vlastným GitHub účtom a *repozitáre dostávajú názvy podľa ClassRoomu*, nie podľa tvojho interného `2025_ST_XXX` prefixu. Tie si budeš mapovať inde (napr. v KNIFE alebo vlastnom CSV).

## 2. Vytvorenie individuálneho assignmentu (student repo)

1. V GitHub Classroome klikni na **New assignment → Individual assignment**.
2. Vyplň:
   - **Assignment name** – napr. `about-me` alebo `sthdf-2025-student-repo`,
   - **Repository prefix** – napr. `2025-sthdf-`  
     (GitHub potom vytvorí repozitáre typu `2025-sthdf-roman-kazicka`).
3. Vyber **template repository** – napr. `2025_sthdf_class_template`.
4. Rozhodni o **visibility**:
   - `Private` – odporúčané pre semestrálnu prácu,
   - `Public` – len ak to máš na to dobrý dôvod.

Potvrď vytvorenie assignmentu.

## 3. Ako sa študent pripojí

1. V Classroom otvor nový assignment a klikni na **Share assignment**.
2. Skopíruj **invite link** (jediný URL).
3. Pošli tento odkaz študentom (Teams, e‑mail, LMS…).

Študent potom:

1. Klikne na link,
2. prihlási sa svojim **GitHub účtom** (ak nemá, vytvorí si ho),
3. potvrdí vstup do triedy / assignmentu,
4. GitHub mu vytvorí jeho **vlastný repozitár** z template.

> Dôležité: Každý študent dostane **vlastný fork-like repozitár**, ty tam máš práva učiteľa (owner/maintainer cez Classroom).

## 4. Ako učiteľ nájde repozitáre študentov

V GitHub Classroome:

1. Otvor konkrétny assignment.
2. V časti **Students** uvidíš zoznam študentov a ich repozitárov.
3. Kliknutím na názov repozitára sa dostaneš priamo na GitHub.

Praktický tip:

- Môžeš si urobiť vlastnú tabuľku (CSV/KNIFE), kde si zapíšeš mapovanie:
  - `GitHub repo name → interný kód študenta (2025_ST_001)`.

## 5. Čo robí študent vo svojom repozitári

Typický prvý deň:

1. **Clone** / **Open in GitHub Desktop** / alebo priamo práca cez web editor.
2. Vyplní súbory podľa template (napr. `about-me.md`, `project-summary.md`).
3. Commity posiela na hlavný branch (`main`), ty ich vidíš rovnako ako v bežnom repozitári.

## 6. Minimálne inštrukcie pre študentov (skrátená verzia)

Môžeš im poslať niečo ako:

```text
1. Klikni na tento link (Classroom invite).
2. Prihlás sa alebo vytvor GitHub účet.
3. Po vytvorení repozitára klikni na „Open on GitHub“.
4. Repo si naklonuj do svojho PC alebo pracuj cez web.
5. Pozri si súbor HELP (help/...) – tam máš ďalšie kroky.
```

---

💬 *Small Talk Moment:*  
Onboarding je ako prvý deň v škole – keď majú všetci správne menovky na laviciach, semester je o polovicu menej chaotický.
