# GH-Class-Sync — Ako synchronizovať assignmenty v GitHub Classroom

Tento dokument vysvetľuje, ako funguje synchronizácia assignmentov medzi:

- **Template repozitárom**
- **Assignmentom v GitHub Classroom**
- **Študentskými repozitármi (forkmi)**

---

## 1️⃣ Kedy potrebuješ Sync?

Synchronizácia je potrebná, keď:

- opravíš chybu v template,
- doplníš novú zložku alebo súbor,
- zmeníš obsah, ktorý majú mať všetci študenti.

---

## 2️⃣ Dôležité pravidlá

### ✔️ 1. Template sa mení v tvojom *template* repozitári  
### ✔️ 2. Assignment používa *kópiu* templatu  
### ✔️ 3. Každý študent dostane **fork** assignmentu  
### ✔️ 4. Sync vytvorí **PR do každého študentského repo**

---

## 3️⃣ Postup pri Sync

### 🟦 Krok 1 — Uprav template repo  
Uprav napr.:

```
content/docs/sk/...
core/templates/...
mk/...
```

Commitni a pushni do main.

---

### 🟩 Krok 2 — Prejdi do GitHub Classroom

1. Otvor Classroom → Assignment  
2. Klikni **“Sync assignments”**

Github Classroom:

- porovná template HEAD commit s assignment HEAD,
- vytvorí PR pre každého študenta.

---

### 🟧 Krok 3 — Študenti vidia PR v svojom repozitári

PR sa volá napr.:

```
[Classroom Update] Sync from assignment template
```

Študent môže:

- **Merge** (odporúčané)
- **Review changes**
- alebo **Resolve conflicts**

---

### 🟥 Krok 4 — Konflikty

Konflikty vzniknú, ak študent menil súbor, ktorý template aktualizuje.

Riešenie:

- študent otvorí PR,
- GitHub zobrazí konflikt,
- môže zvoliť “Resolve conflict”.

---

## 4️⃣ Ako sa to správa pre nových študentov?

Noví študenti dostanú:

- **automaticky najnovšiu verziu templatu**  
- žiadne sync PR nie je potrebné

---

## 5️⃣ Limitácie

Sync nefunguje pre:

- zmazané súbory (tie zostanú u študenta),
- veľké konflikty cez viac riadkov,
- submoduly,
- binárne súbory.

---

## 6️⃣ Odporúčaný workflow

### Pre učiteľa:

1. Aktualizovať template
2. Otestovať build
3. V Classroome → kliknúť **Sync assignment**
4. Skontrolovať pár náhodných PR

### Pre študenta:

1. Otvoriť PR
2. Prečítať zmeny
3. Merge
4. Pokračovať v práci

---

## 🔥 Small Talk

„Sync je ako pripomienka v manželstve — ak to ignoruješ, čaká ťa konflikt.“ 😄

---


