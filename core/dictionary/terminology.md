---
fm_version: "1.0.1"
fm_build: "2025-10-12T13:45:00Z"
fm_version_comment: "Initial terminology for CORE/CLASS/KNIFE"
id: "DICT-TERMS-CORE"
guid: ""
dao: "project"
title: "Terminology – CORE / CLASS / KNIFE"
description: "Jednotné pojmy pre obsah, publishing, FM a workflow."
author: "Roman Kazička"
authors: ["Roman Kazička"]
category: "reference"
type: "dictionary"
priority: "top"
tags: ["terminology","glossary","standards"]
slug: ""
locale: "sk"
#sidebar_label: "Terminology"
created: "2025-10-12"
modified: ""
status: "inprogress"
rights_holder_content: "Roman Kazička"
rights_holder_system: "Roman Kazička (CAA/KNIFE/LetItGrow)"
license: "CC-BY-NC-SA-4.0"
disclaimer: "Use at your own risk. Methods provided as-is; participation is voluntary and context-aware."
copyright: "© 2025 Roman Kazička / SystemThinking"
origin_repo: ""
origin_repo_url: ""
origin_commit: ""
origin_system: "docs"
author_id: ""
author_did: ""
fm_reserved1: ""
fm_reserved2: ""
---

# Terminology – CORE / CLASS / KNIFE

> Cieľ: mať **jednotný jazyk** pre všetky repozitáre (origin KNIFE, class template, ročníkové repozitáre).

## A. Základné pojmy

- **Content (`content/`)**  
  Jediný zdroj pravdy (SSOT). Markdown súbory s FrontMatter (FM). Buildy **nikdy** neprepíšu content.

- **Publishing (`publishing/`)**  
  Proces a staging výstupov pre generátory (Sites, Docusaurus, Docsy, Hugo). Sem sa **kopíruje** content na build.

- **Publications (outputs)**  
  Publikované diela (KNIFE články, reporty, diplomové práce). „Čo“ bolo vydané – nie „ako“.

- **SSOT (Single Source of Truth)**  
  Princíp, že „pravda“ je v `content/`, všetko ostatné sú projekcie.

- **Templates**  
  Predlohy na tvorbu obsahu:
  - `core/templates/content/...` – šablóny pre autorov (SK/EN).
  - `core/templates/production/...` – „release-ready“ vzory, finálne rozloženie sekcií.

- **Core (`core/`)**  
  „Engine“: skripty, systémové šablóny, interné referencie. Bez jazykových mutácií.

- **Config (`config/`)**  
  Schémy (napr. `fm_schema.json`), vstupy pre generátory (`input/`), reporty (`output/`).

## B. FrontMatter (FM)

- **FM-Core**  
  Plná sada polí (verzia 1.0.1). Všetky dokumenty musia mať **všetky kľúče**, aj prázdne.

- **`fm_version`**  
  Verzia špecifikácie FM (napr. `"1.0.1"`).

- **`fm_build`**  
  Časová pečiatka generovania/metadoplnenia (ISO).

- **`fm_version_comment`**  
  Dôvod zmeny FM verzie (changelog v dokumente).

- **`dao`**  
  Doména artefaktu: `"knife" | "class" | "project"`.

- **`guid` vs. `id`**  
  `guid` = globálny UUIDv4; `id` = ľudsky čitateľný identifikátor (napr. K084, 2025_ST_0042).

- **`locale`**  
  Jazyk dokumentu: `sk` | `en` | `other`. Odvodený z cesty v `content/docs/<locale>/...`.

- **`slug`**  
  Voliteľná URL override (relatívna). Ak prázdna, generátor použije cestu.

- **`origin_*`**  
  Pôvod artefaktu: `origin_repo`, `origin_repo_url`, `origin_commit`, `origin_system`.

## C. Workflow & Git

- **Git-Flow**  
  Štandard vetiev: `main` (prod), `develop`/`UAT` (staging), `feature/*`, `release/*`, `hotfix/*`.

- **Worktree deploy**  
  Lokálny deploy do Pages vetvy cez `git worktree` (bez miešania artefaktov do main).

- **Matrix deploy (Actions)**  
  CI workflow, ktorý buildne viac generátorov a pushne do ich deploy vetiev (`gh-pages-sites`, `gh-pages-docusaurus`).

## D. Generátory & publikovanie

- **Sites (GitHub Pages)**  
  Servuje statiku z vybranej vetvy/cesty. Nepýta sa, čím bolo generované.

- **Docusaurus / Docsy / Hugo**  
  Rôzne SSG. Všetky pracujú nad **kopiou** contentu v `publishing/`.

- **Staging**  
  Medzikrok: `content/` → `publishing/<generator>/...` → build → deploy.

## E. Triedna prax (CLASS)

- **Deliverables**  
  Sada výstupov: `01-AboutMe … 11-Reflexion`. Každý je `.md` s FM-Core.

- **Študentské ID**  
  Korenová cesta: `content/docs/sk/2025_ST_xxxx/deliverables/...`.

- **KNIFE (community)**  
  Samostatná sekcia v `content/docs/sk/knifes/...` (príspevky do komunity).

## F. Navigácia & ref

- **Navigácia**  
  Klikateľné odkazy: „Top / Up / Home“. Generuje `nav_inject` (nateraz odložené v TODO).

- **Ref**  
  Dokumentácia pre ľudí (`content/docs/sk/ref/**`), odlišná od `core/refs/` (technické poznámky).

---

## Použité konvencie (quick cheatsheet)
- **Priečinok:** `publishing/`  
- **Make ciele:** `publish-*`  
- **Sekcia na webe:** „Publications“  
- **Dátový typ:** `publication` (vo FM `category`/`type` podľa potreby)

---