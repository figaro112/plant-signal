---

## 🔧 Prefixy a ich význam

| Prefix | Účel / Kontext | Typické použitie |
|:-------|:----------------|:----------------|
| **feature/** | Nová funkčnosť, nový obsah alebo modul | `feature/core-refactor` |
| **fix/** | Oprava chyby, ladenie, menšie úpravy | `fix/fm-schema-validation` |
| **hotfix/** | Rýchla oprava v produkcii (urgentná) | `hotfix/deploy-build-fix` |
| **release/** | Vetva pre prípravu release verzie | `release/v1.3.0` |
| **support/** | Dlhodobé alebo pomocné vetvy (napr. maintenance, docs) | `support/docs-l10n` |
| **uat/** *(voliteľné)* | User Acceptance Testing fáza (ak nie je centrálna `UAT`) | `uat/2025-fm-sync` |

---

## 🌐 Odporúčania

- Používaj **malé písmená** a **pomlčky (-)** ako oddeľovače.
- Každá vetva by mala byť **krátkodobá** – po merge do `develop` alebo `main` ju odstráň.
- Ak používaš Git Flow, vetvy začínajú automaticky prefixom (SmartGit to urobí za teba).
- V repozitároch typu *Class / Year / Project* môžeš pridať skratku:
  - `feature/sthdf2025-project-dashboard`
  - `fix/sthdf2025-makefile-audit`

---

## 🧩 Odporúčané vetvy pre hlavný cyklus

| Typ | Branch | Účel |
|------|---------|------|
| **Main** | `main` | stabilný produkčný stav |
| **Develop** | `develop` | pracovná integrácia pred releasom |
| **UAT** | `UAT` | testovanie a akceptácia |
| **Feature** | `feature/...` | nové funkcie, obsah |
| **Fix** | `fix/...` | opravy a udržiavanie kvality |
| **GH Pages** | `gh-pages-docusaurus` | publikovanie dokumentácie |

---

## 🪴 Tip

Ak chceš, aby sa nové vetvy automaticky nastavovali ako *tracking branches*:

```bash
git config --global push.autoSetupRemote true