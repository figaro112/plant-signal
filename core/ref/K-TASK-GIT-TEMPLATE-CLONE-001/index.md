---
title: "Vytvorenie GitHub Template repozitára z vetvy UAT"
slug: "K-TASK-GIT-TEMPLATE-CLONE-001"
date: 2024-06-01
author: "KNIFE Team"
tags: [git, github, template, UAT, workflow]
summary: "Postup vytvorenia nového GitHub Template repozitára z vetvy UAT s využitím GUI a CLI."
---

# Vytvorenie GitHub Template repozitára z vetvy UAT

## 1. Úvod

Tento dokument popisuje proces vytvorenia nového GitHub Template repozitára vychádzajúceho z vetvy UAT (User Acceptance Testing). Cieľom je zabezpečiť, aby šablóna obsahovala overený a testovaný stav kódu pred jeho nasadením do produkcie. Vytvorenie template z UAT umožňuje tímom rýchle a konzistentné založenie nových repozitárov s aktuálnym, stabilným základom.

## 2. Predpoklady

- Existujúca vetva `UAT` v GitHub repozitári, ktorá obsahuje testovaný a schválený kód.
- Používateľ má potrebné práva na čítanie repozitára a vytváranie nových repozitárov v rámci organizácie alebo účtu.
- GitHub účet s prístupom k repozitáru.
- Nainštalovaný Git (pre CLI variant).

## 3. Variant 1 – cez GitHub GUI (Use this template)

1. Prejdite do repozitára na GitHub, ktorý obsahuje vetvu `UAT`.
2. Uistite sa, že vetva `UAT` je nastavená ako **default branch** v nastaveniach repozitára (Settings → Branches → Default branch → `UAT`).  
   > ⚠️ GitHub GUI umožňuje vytvárať šablóny len z predvolenej vetvy. Ak chcete použiť `UAT`, musíte ju pred vytvorením dočasne nastaviť ako predvolenú.  
   Po dokončení môžete default vetvu vrátiť späť na `main`.
3. Kliknite na tlačidlo **Use this template** (Použiť túto šablónu).
4. Zadajte názov nového repozitára a prípadne popis.
5. Vyberte viditeľnosť nového repozitára (public/private).
6. Kliknite na **Create repository from template**.
7. Nový repozitár bude založený so stavom vetvy `UAT`.

## 4. Variant 2 – cez CLI (git clone -b UAT …)

1. Otvorte terminál.
2. Klonujte repozitár s vetvou `UAT` priamo pomocou príkazu:

   ```
   git clone -b UAT https://github.com/organizacia/rep.git novy-repozitar
   ```

3. Prejdite do adresára nového repozitára:

   ```
   cd novy-repozitar
   ```

4. Odstráňte existujúci vzdialený odkaz (origin):

   ```
   git remote remove origin
   ```

5. Vytvorte nový repozitár na GitHub (manuálne cez web alebo pomocou GitHub CLI).
6. Pridajte nový origin a pushnite:

   ```
   git remote add origin https://github.com/organizacia/novy-repozitar.git
   git push -u origin UAT
   ```

7. Tento postup vytvorí kópiu vetvy `UAT` ako nový repozitár.

## 5. Odporúčaný kombinovaný postup

Pre optimálnu kontrolu a prehľadnosť odporúčame:

1. Lokálne klonovať repozitár vetvy `UAT` cez CLI.
2. Prepnúť sa na vetvu `main` a overiť stav kódu.
3. Pushnúť prípadné úpravy do vetvy `main`.
4. Na GitHub GUI vytvoriť template z vetvy `main` pomocou **Use this template**.

Týmto spôsobom zabezpečíte, že template bude založený na stabilnej a schválenej vetve `main`, pričom využijete výhody oboch prístupov.

## 6. Porovnávacia tabuľka

| Kritérium           | GitHub GUI                      | CLI                             | Kombinovaný postup               |
|---------------------|--------------------------------|--------------------------------|---------------------------------|
| Jednoduchosť        | Veľmi jednoduché, vizuálne      | Vyžaduje znalosť Git príkazov  | Kombinuje jednoduchosť a kontrolu|
| Rýchlosť            | Rýchle založenie repozitára    | Vyžaduje viac krokov            | Vyvážená                         |
| Flexibilita         | Obmedzená na aktuálnu vetvu     | Plná kontrola nad vetvami       | Najflexibilnejší prístup         |
| Riziko chýb         | Nízke, ale menej kontroly       | Vyššie, ak sa nepoužívajú správne príkazy | Nízke, kontrola cez CLI aj GUI  |
| Použitie            | Pre rýchle vytvorenie template  | Pre pokročilých používateľov    | Pre tímy vyžadujúce kontrolu     |

## 7. Záver a odkazy

Vytvorenie GitHub Template repozitára z vetvy UAT je kľúčové pre zabezpečenie konzistentnosti a kvality nových projektov. Výber medzi GUI, CLI alebo kombinovaným prístupom závisí od preferencií tímu a požadovanej úrovne kontroly.

Pre ďalšie informácie a súvisiace návody si pozrite:


---

[Späť na Ref index](../../index.md)
