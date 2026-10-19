

# Ako pracovať s projektmi v GitHub Classroom (Group Assignments)

Tento návod vysvetľuje, ako vytvárať a spravovať **projektové repozitáre** pre predmet STHDF pomocou funkcie **Group Assignment** v GitHub Classroom.

Používa sa pre situácie, kde **viac študentov pracuje na jednom projekte** → teda **1 projekt = 1 repozitár = N študentov**.

---

## 🎯 Ciele
- Pripraviť projekty s pevnými názvami (PRJ_001–PRJ_030).
- Umožniť študentom, aby si vybrali svoj projekt pri vstupe do assignmentu.
- Vytvoriť pre každý projekt **jediný repozitár**, ktorý môžu používať viacerí členovia tímu.
- Zabezpečiť konzistenciu názvov projektových repozitárov pre celý semester.

---

## 🧩 Prečo Group Assignment
GitHub Classroom podporuje dva režimy:

- **Individual Assignment** – 1 študent → 1 repo  
- **Group Assignment** – 1 projekt → N študentov → 1 repo

Pre semestrálne tímy používame **Group Assignment**.

---

## 🏗️ Krok 1 — Vytvorenie názvov projektov
Priprav si zoznam projektových identifikátorov:

```
PRJ_001
PRJ_002
PRJ_003
...
PRJ_030
```

Tieto názvy budú predstavovať **projektové tímy**.  
Každý tím = jeden budúci projektový repozitár.

---

## 🏛️ Krok 2 — Tvorba Group Assignmentu

1. Otvor GitHub Classroom.
2. Vyber svoju triedu (napr. `STHDF_2025_2026`).
3. Klikni **New Assignment**.
4. Vyber typ: **Group Assignment**.
5. Zadaj prefix názvu repozitára, napr.:

```
2025_PRJ
```

Tak vzniknú repozitáre:

```
2025_PRJ-PRJ_001
2025_PRJ-PRJ_002
...
```

---

## 👥 Krok 3 — Vytvorenie skupín (tímov)
V časti **Groups**:

1. Vyber *Create groups manually*.
2. Pridaj skupiny podľa vopred definovaných názvov:

- PRJ_001
- PRJ_002
- …
- PRJ_030

3. Nastav parametre:
   - **Group size:** minimálne 1, maximálne 5 (alebo podľa predmetu).
   - **Allow existing groups to be reused?** → *Yes*  
     (študenti sa môžu pridávať aj neskôr).

---

## 🚀 Krok 4 — Študentský onboarding

Študent uvidí:

1. **Link na assignment.**
2. Po kliknutí sa ho Classroom opýta:
   *„Vyber si skupinu (projekt)“*
3. Zobrazia sa názvy PRJ_001–PRJ_030.
4. Študent si vyberie svoj projekt → Classroom ho pridá do tímu.
5. Až po výbere tímu sa vytvorí repozitár.

---

## 🔐 Otázky & odpovede

### ❓ Môže viac študentov vybrať ten istý projekt?
Áno. O tom je Group Assignment.

### ❓ Dá sa tým zabrániť?
Áno — nastavíš limit *maximum group size*.

### ❓ Môžem vytvoriť prázdny projekt bez študenta?
Nie. GitHub vytvára repozitár až pri prihlásení prvého člena.

### ❓ Čo ak sa dvaja mylne pridajú do iného projektu?
Učiteľ môže:
- študenta odobrať zo skupiny,
- alebo ho presunúť do inej skupiny.

---

## 🏁 Krok 5 — Unifikácia názvov (ak treba)
Študenti **nemôžu premenovať** projektový repozitár, ale učiteľ ÁNO.

Ak by bolo treba, môžeš po nástupe všetkých študentov:

- skontrolovať názvy,
- upraviť skupiny,
- alebo premenovať repozitáre priamo v GitHube.

Toto však väčšinou netreba — prefix + pevné názvy skupín stačia.

---

## 📘 Doporučený workflow pre školský rok

1. Individual assignment → študenti získajú svoje „osobné“ repozitáre.
2. Group assignment → vytvoria sa projektové tímy.
3. Oba assignmenty vložíme do help sekcie triedy.
4. Po onboardingu začína tímová práca.

---

## 💬 Small Talk Moment

„GitHub Classroom je ako sedenie v školskej lavici.  
Najprv každý sedí sám… a potom príde projekt a zrazu všetci sedia spolu.“ 😄

---

Ak chceš, pripravím aj verziu pre EN.