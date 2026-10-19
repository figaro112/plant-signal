---
title: "GitHub Classroom – Role a práca asistentov"
---

# GitHub Classroom – Role a práca asistentov

Tento dokument je určený pre učiteľa a asistentov. Cieľ: rozdeliť prácu tak, aby všetci vedeli, čo môžu/majú robiť, a zároveň sa nikto nebál „pokaziť repozitár“. 😄

## 1. Kto je asistent

Asistent je typicky:
- doktorand,
- cvičiaci,
- alebo pokročilý študent, ktorý pomáha ostatným.

V GitHub Classroome máš dve úrovne:

- **Classroom admin / owner** – vidí všetko, môže meniť nastavenia,
- **Collaborator na konkrétnych repozitároch** – má práva len v niektorých repách.

Odporúčaný prístup:  
- ty si **hlavný admin/triedny učiteľ**,  
- asistentov pridávaš ako **collaborators** k repozitárom, ktoré majú mentorovať.

## 2. Pridanie asistenta do repozitára

V GitHub Classroome môžeš:

1. Otvoriť konkrétny assignment.
2. V časti študentov nájsť konkrétny repozitár.
3. Prekliknúť sa do repa a tam:
   - **Settings → Collaborators and teams**,
   - pridať asistenta podľa GitHub mena.

Asistent potom môže:

- pozerať kód,
- otvárať **Issues**,
- robiť **review** pull requestov,
- commitovať podľa dohodnutých pravidiel.

## 3. Ako rozdeliť repozitáre medzi asistentov

Jednoduchý model:

- Rozdeľ si študentov podľa intervalov (napr. podľa interných kódov `2025_ST_001–020`, `021–040`, …).
- Každému asistentovi priraď balík repozitárov.
- Zaznač to v jednej tabuľke (CSV alebo KNIFE dokument):
  - `GitHub repo` → `zodpovedný asistent`.

Asistent tak vie:
- ktoré repá má sledovať,
- kde čakať otázky,
- kde si plánovať konzultácie.

## 4. Typická práca asistenta v týždni

Odporúčaný rytmus (1× týždenne):

1. Prejdi svoje priradené repozitáre.
2. Skontroluj:
   - či sú nové commity,
   - či študent dodržal štruktúru (súbory, priečinky),
   - či sú splnené týždenné zadania.
3. Zapíš si poznámky (môžu byť aj ako Issues v repozitári):
   - `issue: Missing AboutMe`
   - `issue: Doplň popis projektu` atď.
4. Ak je niečo veľmi zlé (napr. zmazaný template), informuj učiteľa – môžeš použiť aj Git reset / clone z template, ale vždy s rozvahou.

## 5. Pravidlá komunikácie

Aby sa študenti nebáli spolupráce:

- Issues píš **konštruktívne a konkrétne**.
- Používaj labely (napr. `question`, `bug`, `feedback`).
- Ak študent nereaguje, pripomeň sa po 1 týždni.
- Dôležité diskusie (napr. zmeny zadania) vždy skopíruj aj do centrálneho repo/KNIFE dokumentu, aby mal učiteľ prehľad.

## 6. Bezpečná práca asistenta

Odporúčania:

- ak niečo meníš v študentovom kóde, rob to cez **pull request** – nech je vidno históriu,
- študent vie, že sa niečo zmenilo a môže si to pozrieť,
- DRY: jeden repozitár = jeden zdroj pravdy pre projekt, žiadne paralelné zipy/ukladanie mimo GitHubu.

---

💬 *Small Talk Moment:*  
Dobrý asistent je ako druhý pilot v kokpite – nepreberá ti lietadlo, ale keď treba, zachráni pristátie. ✈️
