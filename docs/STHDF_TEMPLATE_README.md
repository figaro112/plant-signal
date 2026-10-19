# STHDF class template 2026-2027

Toto je šablóna repozitára pre predmet **Systémové myslenie v IT a digitálna
fabrikácia** (FIIT STU). Neklonuje sa cez GitHub Classroom — každý študent si
z nej urobí **vlastný, čistý klon bez histórie** a pracuje vo svojom repozitári.

## 1. Predpoklady

- nainštalovaný [Git](https://git-scm.com/downloads)
- vlastný GitHub účet

## 2. Vytvor si vlastný klon (bez histórie)

Klonovanie tejto šablóny normálnym `git clone` by ti do repozitára prenieslo
aj celú jej históriu — to nechceme. Postav sa v termináli do priečinka,
**v ktorom** má vzniknúť tvoj projekt (napr. `~/Skola/STHDF/`) — príkaz nižšie
si `ST-042-MojeMeno` vytvorí sám ako podpriečinok. Potom spusti:

```bash
git clone --depth 1 https://github.com/06-STH-Projects/2026_sthdf_class_template.git ST-042-MojeMeno
cd ST-042-MojeMeno
rm -rf .git
git init
git add -A
git commit -m "Initial commit"
```

Výsledok: priečinok `ST-042-MojeMeno/` obsahuje celý obsah šablóny, ale ako
**nový, samostatný git repozitár s jedným commitom** — žiadna história
šablóny sa neprenáša.

> Skript, ktorý spraví presne toto isté jedným príkazom, je v
> [`tools/clone-student-template.sh`](tools/clone-student-template.sh):
> `./clone-student-template.sh ST-042-MojeMeno`

### Pomenovanie priečinka

- **Individuálna práca:** `ST-XXX-MojeMeno` (napr. `ST-042-JanNovak`)
- **Tímový projekt:** `PRJ-YYY-NazovProjektu` (napr. `PRJ-017-SmartClock`)

Toto pomenovanie (`ST-XXX` / `PRJ-YYY`) sa používa aj neskôr, keď budeš svoje
výstupy publikovať do triedneho repozitára — drž sa ho od začiatku.

## 3. Založ si vlastný repozitár na GitHube

1. Na [github.com/new](https://github.com/new) si založ **prázdny** repozitár
   (bez README, bez `.gitignore` — tie už máš z klonu).
2. Pripoj ho ako remote a pushni:

```bash
git remote add origin <URL-tvojho-noveho-repozitara>
git branch -M main
git push -u origin main
```

Odteraz pracuješ vo svojom vlastnom repozitári, nezávisle od šablóny.

> **Žiadny osobitný "školský server" neexistuje.** Repozitár z kroku 3 je
> obyčajný osobný GitHub účet — nič iné netreba zakladať. Ak GitHub účet
> ešte nemáš, založ si ho zadarmo na [github.com/join](https://github.com/join).

## 4. Vytvor si svojich 7 povinných sekcií

Klon zatiaľ neobsahuje hotové súbory na vyplnenie — vytvoríš si ich
jedným príkazom:

```bash
make S31-sthdf-new STHDF_NAME=ST-042-MojeMeno STHDF_TITLE="ST-042 Moje Meno" LOCALE=sk
```

Výsledok: `content/docs/sk/sthdf/ST-042-MojeMeno/students/` — priečinok
so 7 sekciami (About Me, Knowledge Contribution, Project Summary,
Project Outcomes, Pitch Presentation, Final Presentation, Reflexia),
každá ako samostatný podpriečinok s `index.md` na vyplnenie. Začni od
`students/index.md` — je to rozcestník s checklistom.

> `STHDF_NAME` použi rovnaké ako názov priečinka z kroku 2 (`ST-XXX-...`
> / `PRJ-YYY-...`).

## 5. Tvoj výstup a triedny repozitár

Tento predmet nepoužíva GitHub Classroom sync — tvoj repozitár je od
šablóny aj od triedneho repozitára úplne nezávislý a **taký aj
zostáva**. Prenos do triedneho dashboardu (`students/ST0XX/`) rieši
vyučujúci na svojej strane — nie je to tvoja úloha.

Tvoja jediná úloha:
1. Vyplň si vo vlastnom repozitári všetkých 7 sekcií z kroku 4.
2. Zisti si svoje pridelené číslo `ST0XX` (roster u vyučujúceho).
3. Zdieľaj odkaz na svoj hotový repozitár tam, kde ti povie vyučujúci.

Podrobnejšie vysvetlenie (aj prečo takto a nie inak) je v
[K000119 – Ako si vytvoriť čistý klon triedneho repozitára](https://knifes.systemthinking.sk/sk/knifes/K000119-klon-triedneho-repozitara)
(krok 6).

## 6. Čo je vnútri

| Priečinok | Obsah |
|---|---|
| `content/docs/sk/` (`en/`) | tvoj obsah — 7Ds, SDLC, Q12, STHDF, KNIFE |
| `core/` | zdieľané nástroje a automatizácia (Makefile targets, generátory) |
| `config/` | konfigurácia jednotlivých metodík |
| `publishing/docusaurus/` | Docusaurus stránka, ak si obsah chceš publikovať |

Rýchly prehľad dostupných príkazov: `make help`

## 7. Odkazy

- 🧭 Portál predmetu: [sthdf.systemthinking.sk](https://sthdf.systemthinking.sk)
- 📚 KNIFE dokumentácia: [knifes.systemthinking.sk](https://knifes.systemthinking.sk)

## License

- **Kód a skripty**: [MIT License](./LICENSE)
- **Vzdelávací obsah a dokumentácia** (`.md` súbory, metodiky, poznámky): [CC-BY 4.0 License](./LICENSE-DOCS)
