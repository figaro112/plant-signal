---
id: "K-TASK-UAT-001"
guid: "-"
dao: "knife"
title: "UAT Promotion – postup z FIX do UAT cez Pull Request"
description: "Krok-za-krokom návod, ako bezpečne dostať zmeny z vetvy FIX do UAT cez PR, vrátane kontroly buildov, CSV snapshotu a tagovania RC."
author: "Roman Kazička"
authors: ["Roman Kazička"]
category: "governance"
type: "user-guide"
priority: "top"
tags: ["KNIFE", "UAT", "Git", "Release"]
created: "2025-10-05"
modified: "-"
status: "inprogress"
locale: "sk"
#sidebar_label: "UAT Promotion – FIX → UAT (PR)"
rights_holder_content: "Roman Kazička"
rights_holder_system: "Roman Kazička (CAA/KNIFE/LetItGrow)"
license: "CC-BY-NC-SA-4.0"
disclaimer: "Use at your own risk. Methods provided as-is; participation is voluntary and context-aware."
copyright: "© 2025 Roman Kazička"
author_id: "-"
author_did: "-"
# slug: ""
---

## 🎯 Cieľ
Dostať overené zmeny z **FIX** do **UAT** **cez Pull Request** (PR), so zachovaním čistoty histórie a kontrolovateľným checkpointom (RC tag).

---

## ✅ Predpoklady (sanity check)
Spusť lokálne (nič neprepisuje):
```
make knifes-gen-dry
make knifes-overview-dry
npm run build
```
Po merge do `UAT`:

```
git checkout UAT
git pull origin UAT
make verify
make knifes-gen-dry
```

✅ Over, že:
- sa všetky KNIFE súbory generujú správne,
- CSV zodpovedá realite,
- nevznikli nové GUIDy bez dôvodu.

---

## 🚀 5. Príprava na merge do MAIN (produkcia)

Keď je `UAT` overený:

```
git checkout main
git pull origin main
git merge --no-ff UAT -m "merge: verified UAT → main"
git push origin main
```

---

## 🧾 6. Poznámky a odporúčania

- `FIX` = technické úpravy a ladenie  
- `UAT` = testovanie a validácia  
- `MAIN` = produkčný obsah

Každá vetva má svoj účel – nikdy nerob úpravy priamo v `UAT` alebo `MAIN`.  
Ak potrebuješ opraviť drobnosti, vytvor novú `fix/*` vetvu a znova ju pošli cez PR.

---

## 📦 7. Odporúčané príkazy pre opakovanie

```
make csv-guid-sync-dry
make knifes-csv-scan
make knifes-gen-dry
```

Tieto príkazy pomáhajú overiť, že všetky KNIFE majú správne GUID, FM a väzby pred prenosom.

---

> 💡 **Tip:** Ak chceš dať študentom tento proces ako cvičenie, pridaj ho do `docs/sk/ref/UAT-Promotion-Guide.md`  
> alebo ako úlohu v `GitDocs-Lab` template s parametrom `branch: fix → UAT`.

[⬅ Späť na Dashboard](../index.md)  