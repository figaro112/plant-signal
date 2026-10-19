---
id: "K-TASK-GIT-UPSTREAM-001"
guid: "-"
dao: "knife"
title: "GIT – Upstream prehľadne: čo to je, ako ho zistiť a nastaviť"
description: "Praktický návod na nastavenie a kontrolu upstreamu (tracking branch), aby 'git push' a 'git pull' vedeli, kam komunikovať."
author: "Roman Kazička"
authors: ["Roman Kazička"]
category: "git"
type: "task"
priority: "Middle"
tags: ["GIT", "Upstream", "Workflow"]
created: "-"
modified: "-"
status: "inprogress"
locale: "sk"
#sidebar_label: "GIT – Upstream (How-to)"
rights_holder_content: "Roman Kazička"
rights_holder_system: "Roman Kazička (CAA/KNIFE/LetItGrow)"
license: "CC-BY-NC-SA-4.0"
disclaimer: "Use at your own risk. Educational purposes only."
---

# GIT – Upstream prehľadne: čo to je, ako ho zistiť a nastaviť

> **Upstream = vzdialená vetva**, s ktorou je lokálna vetva „spárovaná“.  
> Vďaka tomu stačí písať len `git push` / `git pull` bez ďalších parametrov.

---

## 🧪 Rýchla diagnostika (aktuálna vetva)

- Krátky stav s upstreamom:
```
git status -sb
# napr. ## fix/fm-stabilize...origin/fix/fm-stabilize
```

## Aktuálny upstream (len názov)
```
git rev-parse --abbrev-ref --symbolic-full-name @{u}
# → origin/fix/fm-stabilize
```

## Všetky lokálne vetvy a ich upstream
```
git branch -vv
```

## Prehľad cez šablónu (užitočné do skriptov/Makefile)
```git for-each-ref --format="%(refname:short) -> %(upstream:short)" refs/heads
```

## Vzdialené repozitáre (overenie origin)
```
git remote -v
```

## ⚙️ Nastavenie upstreamu


1) Nová vetva (prvé pushnutie)
```
git push -u origin \<moja-vetva\>
# alias: git push --set-upstream origin \<moja-vetva\>
```

---

## 🧩 Ako to funguje

Upstream určuje, **ktorá vzdialená vetva (remote branch)** je prepojená s lokálnou.  
Ak je upstream nastavený, príkazy `git pull` a `git push` vedia, **odkiaľ sťahovať a kam odosielať zmeny** – bez nutnosti zadávať parametre.

### Príklad
```
lokálna vetva: fix/fm-stabilize
upstream:      origin/fix/fm-stabilize
```
Ak by upstream neexistoval, Git vyžaduje kompletný zápis:
```
git push origin fix/fm-stabilize
```

---

## 🧭 Diagnostika krok za krokom

| Krok | Príkaz | Popis |
|------|---------|-------|
| 1 | `git status -sb` | Krátky prehľad o vetve a stave voči upstreamu |
| 2 | `git branch -vv` | Zoznam lokálnych vetiev s väzbou na upstream |
| 3 | `git remote -v` | Zobrazenie registrovaných vzdialených repozitárov |
| 4 | `git rev-parse --abbrev-ref --symbolic-full-name @{u}` | Získanie mena upstreamu pre aktuálnu vetvu |

---

## 🔧 Zmena alebo odstránenie upstreamu

- **Zmena:**
  ```
  git branch --set-upstream-to=origin/\<nova-vetva\>
  ```
- **Odstránenie:**
  ```
  git branch --unset-upstream
  ```

---

## 🧱 Bežné situácie

- Vetva vytvorená z `main` bez upstreamu → vyžaduje prvé `git push -u origin <vetva>`
- Upstream smeruje na neexistujúcu vetvu (napr. po rebase alebo premenovaní)
- V tímoch s viacerými forkmi sa upstream často používa na **sledovanie pôvodného repozitára**

---

## 📘 Odporúčanie pre KNIFE workflow

- Každá pracovná vetva by mala mať nastavený upstream na rovnaký názov vo vzdialenom repozitári.
- `make status` alebo `make git-info` môže tieto informácie zobrazovať ako súčasť diagnostiky.
- Pre vetvy ako `fix/*`, `uat`, `main` odporúčame jednotný pattern `origin/<branch>`.

---

## ⚠️ Reálny prípad (Error → Solution)

Ak sa pokúsiš zistiť upstream pre vetvu, ktorá ešte nemá nastavený vzdialený ekvivalent, Git vráti chybu:

```
git rev-parse --abbrev-ref --symbolic-full-name @{u}
# fatal: no upstream configured for branch 'fix/fm-stabilize'
```

Táto hláška znamená, že lokálna vetva ešte **nie je spárovaná** so vzdialenou vetvou.  
Riešením je nastaviť upstream pri prvom pushnutí:

```
git push -u origin fix/fm-stabilize
```

Tento príkaz:
- vytvorí (ak ešte neexistuje) vzdialenú vetvu `fix/fm-stabilize`,
- spáruje ju s lokálnou vetvou ako **upstream**,
- a umožní používať jednoduché príkazy:
  ```
  git push
  git pull
  ```

Overenie, že upstream už funguje:
```
git rev-parse --abbrev-ref --symbolic-full-name @{u}
# → origin/fix/fm-stabilize
```

Potom môžeš prejsť do GitHub GUI a otvoriť **Pull Request**  
z `fix/fm-stabilize` → `UAT` cez tlačidlo *Compare & pull request*.

---

## 🧭 Navigácia

[⬅ Späť na Dashboard](../index.md)  
