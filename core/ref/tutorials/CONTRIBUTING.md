# 🤝 Contributing to the KNIFE Project

Vitaj! Tento repozitár je súčasťou knižnice praktických poznatkov **KNIFE – Knowledge In Friendly Examples**. Naším cieľom je zdieľať osvedčené riešenia, ako prekonať konkrétne prekážky na ceste za cieľom.

Ak máš chuť doplniť, opraviť, alebo vylepšiť niektorý z existujúcich príspevkov – **si viac než vítaný!**

---

## 🧭 Štruktúra a konvencie

### 📁 Súbor = 1 príspevok (KNIFE)
Každý záznam má vlastný `.md` súbor, pomenovaný podľa konvencie:

```
KNIFEXXX-kodovany-nazov.md
```

Príklady:
- `KNIFE044-backup-onedrive.md`
- `KNIFE023-git-tag-release.md`

Vnútri používame YAML hlavičku a sekcie ako:
```yaml
---
title: Backup OneDrive on Mac using rclone
id: K000044
category: Backups
sfia: 3
status: hotové
tags: [backup, onedrive, mac, rclone]
---
```

### 📂 Repozitár = tematický okruh
- `KNIFE_GitHub`, `KNIFE_Backups`, `KNIFE_LibreOffice`, ...
- Centrálne prehľady sú v `KNIFE_Overview`

---

## 💡 Ako prispieť

### 🟢 Najjednoduchšie – cez Pull Request
1. Forkni repozitár (ak nemáš právo commitovať priamo)
2. Vytvor novú vetvu (napr. `feat/K000045-rsync-qnap`)
3. Pridaj alebo uprav `.md` súbor
4. Pošli **Pull Request** do `main`

Tvoje zmeny budú s radosťou prečítané, pripomienkované alebo rovno mergnuté.

### 🧪 Alternatíva – diskusia
- Máš nápad, ale nevieš ako ho spracovať?  
  → Otvor issue s návrhom témy.
- Chceš niečo upresniť?  
  → Môžeš komentovať existujúci KNIFE alebo vytvoriť návrh úpravy.

---

## 🌿 Branch stratégie

### Lokálny vývoj
- Zvyčajne používame **len `main`** pre jednoduché prípady

### Spolupráca
- Odporúčame používať `feat/KNIFExxx-nazov` pre každú novú tému
- Napr. `feat/K000044-backup-onedrive`

To umožní paralelný vývoj viacerých návrhov a neskorší merge cez Pull Request.

---

## ❤️ Výzva
Ak si našiel lepšie riešenie ako tu uvádzame – **povedz nám o tom!**

Aj malá úprava môže niekomu ušetriť hodiny práce.  
Tento projekt je miestom, kde sa navzájom učíme a podporujeme.

> "Aj keby som bol jediný, kto z toho profituje, oplatí sa to zdieľať. Ale možno práve tvoj príspevok pomôže niekomu ďalšiemu."

Tešíme sa na tvoje nápady. 👋
