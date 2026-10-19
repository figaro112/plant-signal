---
id: "K-TASK-GIT-CLONE-UAT-TEMPLATE"
guid: "b3f6f8e4-5a37-4f4b-96b2-6f9a2a5a6f01"
dao: "knife"
title: "Klonovanie z UAT pre GitHub Template"
description: "Postup, ako vytvoriť GitHub Classroom alebo univerzitný template repozitár z overenej UAT vetvy."
author: "Roman Kazička"
authors: ["Roman Kazička"]
category: "git"
type: "howto"
priority: "Hi"
tags: ["Git", "UAT", "Template", "Classroom"]
created: "2025-10-06"
modified: "-"
status: "inprogress"
locale: "sk"
#sidebar_label: "K-TASK: Klonovanie z UAT pre Template"
rights_holder_content: "Roman Kazička"
rights_holder_system: "Roman Kazička (CAA/KNIFE/LetItGrow)"
license: "CC-BY-NC-SA-4.0"
disclaimer: "Use at your own risk. Educational purposes only."
copyright: "© 2025 Roman Kazička / SystemThinking"
author_id: "-"
author_did: "-"
---

# 🧩 K-TASK: Klonovanie z UAT pre GitHub Template

## 🎯 Cieľ
Vytvoriť novú vetvu alebo repozitár, ktorý bude slúžiť ako **GitHub Template** (napr. pre triedu alebo kurz), založený na aktuálne stabilnej testovacej vetve **UAT**.  
Tento template bude zdrojom pre forky, klony a študentské repozitáre.

---

## 1️⃣ Predpoklady

- UAT je aktuálna, testovaná a stabilná (`git pull origin UAT`)
- všetky zmeny sú commitnuté a merge do UAT je hotový
- máš práva na vytváranie repozitárov v organizácii (napr. `SystemThinking` alebo `GitDocs-Lab`)

---

## 2️⃣ Lokálne klonovanie z UAT

Ak chceš pripraviť lokálny template folder:

```
git clone -b UAT https://github.com/<org>/<repo>.git <repo>-template
cd <repo>-template
```

Týmto:
- klonuješ repozitár, ale priamo z vetvy **UAT**
- vytváraš nový priečinok (napr. `knifes_template` alebo `class_template`)

---

## 3️⃣ Vyčistenie pre template (lokálne)

V priečinku `repo-template` odstráň nepotrebné súbory a priečinky:

```
rm -rf .git
rm -rf node_modules
rm -rf build
```

Potom inicializuj čistý repozitár:

```
git init
git add .
git commit -m "Init: GitHub Classroom Template based on UAT"
```

---

## 4️⃣ Vytvorenie nového vzdialeného repozitára (GitHub)

Na GitHube:
1. V organizácii klikni **New repository**
2. Zvoľ názov napr. `STHDF-Template` alebo `Classroom-Template`
3. Zaškrtni **“Template repository”**
4. Potvrď vytvorenie (bez README — už ho máš)

---

## 5️⃣ Prepojenie a push

```
git remote add origin https://github.com/<org>/<new-template-repo>.git
git push -u origin main
```

💡 Ak chceš zachovať vetvu UAT aj v template:

```
git checkout -b UAT
git push -u origin UAT
```

---

## 6️⃣ Overenie

- Otvor GitHub → nový repozitár
- Mal by mať možnosť tlačidla **Use this template**
- Skontroluj README a zložky (napr. `docs/`, `Makefile`, `knifes/`)

---

## 7️⃣ Voliteľné: úprava pre triedu

Ak ide o GitHub Classroom:
- v **Classroom** zvoľ template repozitár (`STHDF-Template`)
- pridaj **assignments**
- každý študent dostane vlastný fork z tohto template

---

## 📘 Výsledok

✅ Tvoj **UAT** sa stal základom oficiálneho template repozitára.  
Od tohto momentu sú všetky nové študentské projekty konzistentné s aktuálnym UAT stavom.

[⬅ Späť na Dashboard](../index.md)