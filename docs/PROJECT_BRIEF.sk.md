# PlantSignal — návrh na tímové stretnutie

[Projekt v štruktúre STHDF](../content/docs/en/sthdf/PRJ-TBD-PlantSignal/index.md) · [Sedem povinných sekcií](../content/docs/en/sthdf/PRJ-TBD-PlantSignal/students/index.md)

**Tím:** Marek Hužvar, Matuš Plško, Richard Sič  
**Stretnutie:** 20. októbra 2026  
**Stav:** nápad a digitálny 3D koncept; zatiaľ bez zapojenia, programu a fyzických skúšok.

![Koncept kvetináča PlantSignal](../assets/hero.png)

## Návrh v jednej minúte

Chceme vyrobiť malý stolový kvetináč, ktorý svetlom upozorní na suchú pôdu. Sonda v substráte zmeria hodnotu, Arduino ju vyhodnotí a rozsvieti červenú alebo zelenú LED. Polievanie zostáva ručné. Zmyslom je vytvoriť užitočný fyzický predmet a ukázať celý postup od nápadu cez návrh po overenie.

## Čo vyrobíme sami

- Vlastný 3D tlačený obal na kúpený kvetináč s podmiskou.
- Odnímateľný držiak sondy, aby merala v rovnakej hĺbke.
- Samostatnú skrinku na Arduino s dvoma kontrolkami a otvormi na káble.
- Neskôr jednoduché zapojenie a program na vyhodnotenie merania.

Všetky štyri tlačené diely sú pripravené ako [STL](../models/stl/). Rozmery sa musia upraviť podľa reálneho kvetináča, sondy a dosky. Model nie je potvrdený ako pripravený na finálnu tlač.

## Aké zručnosti potrebujeme

Základy 3D modelovania a tlače, prepojenie vodičov podľa schémy, nahratie programu cez USB a jednoduché meranie. Prvý elektronický prototyp môže byť na kontaktnom poli bez spájkovania. Arduino aj snímač budú napájané nízkym napätím; elektroniku treba umiestniť mimo vody a pred prepojovaním odpojiť napájanie.

## Rozpočet

Samotná sonda má v konkrétnej overenej ponuke cenu **1,35 € s DPH bez dopravy**; dva kusy by stáli 2,70 €. [Ponuka Drotik Elektro](https://www.drotik-elektro.sk/arduino-platforma/4875-podny-analogovy-vlhkomer-s-antikoroznou-sondou-v1.2.html), kontrolovaná 19. 10. 2026. Ide o lacný V1.2 variant, nie originál DFRobot SEN0193.

Celkový rozpočet zatiaľ neurčujeme: najprv zistíme, či nám laboratórium poskytne Arduino, vodiče, LED a materiál na tlač. Potrebujeme aj kvetináč, podmisku, rastlinu a USB napájanie.

## Čo ukážeme pri obhajobe

Dve vzorky rovnakého substrátu — suchú a vlhkú. Pri rovnakej hĺbke zasunutia sondy ukážeme meranie a zmenu kontrolky. Pridáme vlastný obal, fotky prototypov a vysvetlenie, čo sme po skúšaní zmenili. Hranicu upozornenia nastavíme meraním pre zvolený substrát; nie je univerzálna pre všetky rastliny.

## Predbežné rozdelenie, ktoré si ešte odsúhlasíme

| Člen | Navrhovaná oblasť |
|---|---|
| Marek Hužvar | 3D model, uchytenie a tlač |
| Matuš Plško | Elektronika a neskôr Arduino program |
| Richard Sič | Kalibrácia, testovanie a prezentácia |

Každý bude mať aj vlastný KNIFE príspevok. Dokumentáciu a integráciu riešime spoločne. Hlavná stránka a finálne znalostné výstupy budú v angličtine podľa zadania predmetu.

## Čo rozhodnúť zajtra

1. Chceme tento projekt všetci traja?
2. Čo vieme dostať v laboratóriu a čo treba kúpiť?
3. Aký kvetináč a rastlinu použijeme?
4. Ako rozdelíme prácu a kedy chceme prvý prototyp?
5. Aké GitHub účty majú kolegovia, aby im vlastník sprístupnil súkromný repozitár [figaro112/plant-signal](https://github.com/figaro112/plant-signal)?

Čerpadlo, Wi-Fi alebo displej môžu prísť neskôr. Na začiatok sa sústredíme na overené meranie a dve kontrolky.
