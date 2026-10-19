---
fm_version: "1.0.1"
fm_build: "2025-10-12T10:50:00Z"
fm_version_comment: "Created unified TOD-List (todo, wishlist, decisions, info, deferred)."

id: "TOD-2025-10-12"
guid: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
dao: "class"
title: "TOD-List – Central backlog of ideas and decisions"
description: "Zjednotený zoznam úloh, nápadov, rozhodnutí a odložených návrhov pre GitHub Class Template a FM-Core integráciu."

author: "Roman Kazička"
authors: ["Roman Kazička"]

category: "management"
type: "todo-list"
priority: "top"
tags: ["todo","wishlist","deferred","decision","info"]

locale: "sk"
#sidebar_label: "TOD-List"
created: "2025-10-12"
modified: ""
status: "inprogress"

rights_holder_content: "Roman Kazička"
rights_holder_system: "Roman Kazička (CAA/KNIFE/LetItGrow)"
license: "CC-BY-NC-SA-4.0"
disclaimer: "Use at your own risk. Methods provided as-is; participation is voluntary and context-aware."
copyright: "© 2025 Roman Kazička / SystemThinking"

origin_repo: "git_class_template_v4"
origin_repo_url: "https://github.com/06-STH-Projects/git_class_template_v4"
origin_commit: ""
origin_system: "docs"

author_id: ""
author_did: ""
fm_reserved1: ""
fm_reserved2: ""
---

# 🧭 TOD-List (To-Do / Decisions / Info / Wishlist / Deferred)

| # | Dátum | Typ | Názov | Stav | Poznámka |
|---|--------|------|--------|--------|-----------|
| 1 | 2025-10-12 | 🧩 **Deferred** | FM-Core skripty (`fm_apply`, `verify_fm`) | ⏸️ Odložené | Pripravené, implementácia po vytvorení Class. |
| 2 | 2025-10-12 | 💡 **Wishlist** | CLI wizard pre `template_new.mjs` | ⏸️ Odložené | Interaktívny vstup (title, author, locale). |
| 3 | 2025-10-12 | ⚙️ **Decision** | CSV → KNIFE workflow | ✅ Schválené | CSV ako vstup, .md ako SSOT, report späť do CSV. |
| 4 | 2025-10-12 | 💡 **Wishlist** | FM-Schema upgrade 1.1.x | 🕓 Plánované | Pridať podporu pre Diplomové a komplexné štruktúry. |
| 5 | 2025-10-11 | 💬 **Info** | Navigačný systém (`nav_inject`) | ⏸️ Odložené | Klikateľná navigácia Top → Up → Home. |
| 6 | 2025-10-11 | ⚙️ **Decision** | Dual build – `content/` vs. `publication/` | ✅ Schválené | Oddelenie zdrojov a stagingu. |
| 7 | 2025-10-10 | 💡 **Wishlist** | UC-02 Templates – Diplomová práca | 🕓 Plánované | Generator hierarchie 01-Úvod → 05-Záver. |
| 8 | 2025-10-09 | 💬 **Info** | FM-Schema v Docs/Ref | 🕓 Naplánované | Premiestniť dokumentáciu FM do `docs/sk/ref`. |

---

## 🧠 Poznámka
Tento súbor nahrádza predchádzajúci „Deferred Proposals Log“.  
Je to centrálna evidencia *živých* nápadov, wishlistov a rozhodnutí.  
Po každom väčšom milníku (napr. po vytvorení triedy) môžeš:
- presunúť uzavreté body do `docs/sk/reports/Decisions-Archive.md`,
- nové body dopĺňať priamo do tejto tabuľky alebo cez krátke zápisy: