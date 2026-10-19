#### 2) `Makefile-README.md` (do koreňa repozitára)

# Makefile – Central Panel for Git (Worktree + Actions)

Tento Makefile je „single point of control“: build, link-check, deploy, sandbox, obnova z histórie.

## Režimy nasadenia
- **Cesta 1 – Worktree (manuálny push z lokálu)**
  - prvé nastavenie: `make check-worktree`
  - nasadenie: `make full-deploy` (pushne do `gh-pages-docusaurus`)
- **Cesta 2 – GitHub Actions (CI/CD)**
  - workflow: `.github/workflows/deploy.yml`
  - nasadenie: `git add -A && git commit -m "msg" && git push`
  - preskočiť CI pre daný push: commit obsahuje `[noactions]`
  - toggles: `make actions-disable` / `make actions-enable`

## Najčastejší denný flow

make quickstart     # pripomenie 3 kroky
make dev            # lokálny server
#kód a obsah…

## KNIFES generator (CSV → MD)

> Automatické generovanie KNIFE prehľadov a chýbajúcich Kxxx článkov z CSV exportu (Calc/Excel).

### Rýchly štart
1) Do repa pridaj priečinok `scripts/` so súbormi:
   - `scripts/build_knifes.mjs`
   - `scripts/new_knife.mjs`
2) CSV export ulož do `data/KNIFE-OVERVIEW-ONLY.csv` (alebo použi vlastnú cestu).
3) Spusti:
   - `make knifes-gen` – vygeneruje/aktualizuje prehľady + chýbajúce Kxxx `.md`
   - `make knife-new id=K000062 title="Docusaurus slugs & routing"` – založí nový KNIFE skeleton
   - `make dev-gen` – (knifes-gen + dev)
   - `make build-gen` – (knifes-gen + build)

### Poznámky
- Stĺpce `FolderName`, `SidebarLabel`, `LinkSlug` môžeš nechať prázdne – skript ich dopočíta.
- Ak `LinkSlug` obsahuje plnú URL (`https://...`), `.md` sa nevytvára a prehľady odkážu externý článok.

## Worktree: make full-deploy

## Actions:  git add -A && git commit -m "update" && git push





## Užitočné príklady
### Contoll flow
make mode           # povie, či ideš Worktree/Actions a čo ďalej
make doctor         # diagnostika (node/git/remote/worktree/workflow)
make check-links    # DRY-RUN link checker
make build && make serve

### Worktree
make check-worktree # vytvorí/oprava worktree
make deploy         # build + copy + commit/push do worktree
make remove-worktree
make worktree-status

### Actions
make actions-status
make actions-disable
make actions-enable

# Autentikácia (len pre Worktree)

	•	HTTPS (macOS odporúčané):
	•	git config --global credential.helper osxkeychain
	•	prvý git push si vypýta PAT a uloží do Keychain
	•	SSH alternatíva:
	•	ssh-keygen -t ed25519 -C "email"
	•	ssh-add ~/.ssh/id_ed25519 a verejný kľúč nahrať do GitHubu

# Troubleshooting
	•	„../gh-pages-docusaurus nie je git worktree (chýba .git)”
→ make check-worktree
	•	„Actions sa nespustili po pushi”
	•	skontroluj, či existuje .github/workflows/deploy.yml (nie .disabled)
	•	commit správa nesmie obsahovať [noactions]
	•	v repo Settings → Pages musí byť „Build and deployment = GitHub Actions“
	•	build/ alebo .docusaurus/ v gite
	•	oprav .gitignore a: git rm -r --cached build .docusaurus

    ---
  TODO:
### Voliteľné: dostať ťahák aj do webovej dokumentácie
Ak chceš mať aj stránku v Docusauruse (napr. K000056), pridaj napr.:

`docs/sk/7Ds/01.D1-Management/02.Strategy/Guides/K000056-Central-Panel-Git.md`
```md
---
title: K000056 – Central Panel for Git (Makefile)
description: Jeden Makefile na build, kontrolu a deploy (Worktree + Actions)
---

import Link from '@docusaurus/Link';

> Tento dokument je zrkadlo súboru **Makefile-README.md** v koreňi repozitára.

:::tip Rýchly štart
`make quickstart` • `make mode` • `make doctor`
:::

*(sem môžeš skopírovať časti z Makefile-README.md)*