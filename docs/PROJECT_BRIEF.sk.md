# PlantSignal — mobilná aplikácia a automatické zalievanie

**Aktualizácia konceptu: 26. októbra 2026.** Tím: Marek Hužvar, Matuš Plško a Richard Sič. Označenie projektu zostáva dočasné: PRJ-TBD-PlantSignal.

![Koncept 02](../assets/hero.png)

## Čo chceme vyrobiť

Kvetináč so senzormi, zásobníkom vody a čerpadlom, prepojený s mobilnou aplikáciou. Systém bude sám dávkovať vodu podľa nastavených a overených podmienok. Pri bežnom zalievaní používateľ iba doplní vodu do nádržky.

V aplikácii bude profil rastliny s jej druhom, aktuálne merania, história a upozornenia. Používateľ pridá fotku a otázku; cez backend sa zavolá externé API a zobrazia sa možné príčiny problému a odporúčané kroky starostlivosti. Iné zásahy do starostlivosti zostávajú na človeku.

**Červenú a zelenú LED na kvetináči rušíme úplne.** Stav a upozornenia budú v aplikácii; 3D veko už nemá otvory na kontrolky.

## Ako to má spolupracovať

- Snímač vlhkosti a snímanie nedostatku vody poskytujú údaje riadiacej doske.
- Doska s Wi-Fi, predbežne vhodný ESP32 DevKit, vykonáva lokálne obmedzené zalievanie.
- Backend ukladá údaje, pripravuje notifikácie a sprostredkuje volania externého API.
- Mobilná aplikácia zobrazuje stav, druh rastliny, fotky, históriu a rady.

Zalievanie nebude závisieť od otvorenej aplikácie. Prázdna nádržka, neplatný snímač alebo prekročený limit dávky zastavia čerpanie. Rada z API nesmie sama prepnúť čerpadlo ani zmeniť limity.

## Čo sa mení na fyzickom prototype

Aktívny dizajn 03 má jedno oblé telo s priestorom na rastlinu, vnútorným zásobníkom a skrytou servisnou časťou. Má vlastné GLB/STL súbory aj otočný náhľad. Čerpadlo, vnútorná nádržka, hadičky a okienko hladiny sú zatiaľ návrhové obálky; vyberieme skutočné diely a overíme ich fit. Produktový obrázok je AI vizualizácia, nie fotka vyrobeného kusu.

## Postup

1. Vyberieme dosku, snímače, čerpadlo, nádržku a konkrétny kvetináč; zmeriame ich.
2. Rozchodíme merania a zobrazíme ich v základnej aplikácii spolu s profilom rastliny.
3. Zmeriame prietok čerpadla a odladíme dávkovanie, prestávky a zastavenie pri nedostatku vody.
4. Doplníme backend, históriu, notifikácie a volanie API s fotkami a otázkami.
5. Upravíme 3D diely, zložíme prototyp, otestujeme aj výpadky a zdokumentujeme výsledky.

Máme aj [päť prvých screenov a klikateľný návrh aplikácie](DESIGN_PREVIEW.en.md). Údaje sú ukážkové; mobilný backend, API ani reálne zalievanie nie sú pripojené. Mobilný framework, prvá platforma, poskytovateľ API, hosting, termíny, rozpočet a finálne roly ešte nie sú dohodnuté. Osobné profily a ST čísla doplnia členovia. Aplikácia ani automatické zalievanie zatiaľ nie sú implementované.

[Projektový dashboard](../content/docs/en/sthdf/PRJ-TBD-PlantSignal/index.md) · [Architektúra](ARCHITECTURE.en.md) · [3D modely](../models/README.md)
