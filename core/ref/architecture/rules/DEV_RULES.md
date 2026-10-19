

---
id: "DEV_RULES-001"
guid: "RUL-DEV-001"
title: "Pravidlá editovania a úprav projektu"
category: "Architecture"
type: "Development Rules"
status: "Active"
author: "Roman Kazička"
created: "2025-10-12"
---

# 📘 DEV_RULES – Pravidlá editovania a úprav projektu

## 1️⃣ Základné princípy
- Všetky zmeny prebiehajú **len po potvrdení fokusu** (`OK, máš fokus na súbor ...`).
- Každá úprava musí byť **adresná a vysvetlená** (čo, kde, prečo).
- V konfiguráciách (`.yml`, `.ts`, `.json`, `.md`) sa používa princíp **add-only** – žiadne mazanie ani prepísanie existujúcich hodnôt.

## 2️⃣ Platí pre všetky štruktúry
- `frontmatter`: nikdy sa neupravujú existujúce hodnoty (`id`, `guid`, `dao`, `created`).
- `Makefile`, `.gitignore`, `.gitattributes`: upravujú sa len po výslovnom povolení.
- `config.ts` alebo `mkdocs.yml`: len cez explicitný fokus.

## 3️⃣ Pravidlá pre Docusaurus build
- Build sa spúšťa výhradne z `publishing/docusaurus/`.
- Ak `en` obsah neexistuje, i18n sa drží na `['sk']`.
- Broken links sa opravujú až po analýze pôvodu.
- Súbory typu `overview.md` a `_meta` sú **trvalé indexy** – nikdy sa neprepíšu automaticky.
- Reportovacie KNIFE (napr. `KNIFE_Overview_List.md`) sú dočasné – dajú sa regenerovať.

## 4️⃣ Workflow
- Pred každou dávkou úprav sa potvrdzuje fokus.  
- Po úprave nasleduje stručný **diff report**:
  ```
  ✅ upravené:
  - docusaurus.config.ts (vypnuté locales.en)
  - KNIFE_Overview_Blog.md (fix odkazu)
  ```
- Test build: `npm run build && npm run serve`
- Ak je všetko OK, commit message formát:
  ```
  fix(config): remove en locale to prevent broken /en links
  ```

## 5️⃣ Rozšírenie
- V budúcnosti: `L10-fix-links`, `L11-check-links`, `B11-build-fast` v Makefile.
- Pravidlá budú doplnené o sekciu pre GitHub Actions a CI/CD po stabilizácii buildu.