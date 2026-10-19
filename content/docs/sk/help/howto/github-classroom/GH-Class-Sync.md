---
title: "GitHub Classroom – Sync Assignment (aktualizácia šablóny)"
---

# GitHub Classroom – Sync Assignment

Tento dokument vysvetľuje, čo sa stane, keď v **template repozitári** urobíš zmeny a chceš ich dostať do už existujúcich študentských repozitárov cez funkciu **Sync assignment**.

## 1. Kedy vôbec riešiť Sync

Príklady, kedy Sync dáva zmysel:

- pridal si do template nový súbor `help/ClassRoomOnboarding.md`,
- opravil si zásadnú chybu v štruktúre priečinkov,
- doplnil si README alebo KNIFE prehľad, ktorý má mať každý študent.

Situácie, kedy Sync NEpoužívať (alebo len veľmi opatrne):

- keď by zmeny v template prepisovali súbory, ktoré študenti aktívne používajú,
- keď si nie si istý, kam GitHub Classroom zmeny aplikuje (hlavne pri konfliktných súboroch).

## 2. Ako technicky funguje Sync assignment

Zjednodušený model:

1. Template repo = „zlatý vzor“.
2. Každý študentský repo vznikol ako kópia template v čase assignmentu.
3. **Sync assignment** sa pokúsi zosúladiť nové zmeny z template do študentských repozitárov.

Dôležité:
- presné správanie sa môže meniť s verziami GitHub Classroom,
- typicky platí:
  - nové súbory → pridajú sa,
  - zmenené súbory → môžu sa prepísať / merge-nuť podľa pravidiel ClassRoomu.

Preto odporúčanie: **pred prvým ostrým použitím** urob test na 1–2 testovacích študentoch / sandbox triede.

## 3. Kto čo robí (učiteľ vs študent)

### Učiteľ

1. Urobí zmeny v **template repozitári** (commit + push).
2. V GitHub Classroome:
   - otvorí assignment,
   - nájde tlačidlo **Sync assignment** (názov sa môže meniť),
   - spustí sync.
3. Sleduje stav syncu / logy ak sú k dispozícii.

### Študent

Po synce:

- vo svojom repozitári si stiahne novú verziu (git pull, alebo cez web UI),
- môže vidieť nové súbory alebo zmeny,
- pri konflikte sa musí prispôsobiť – buď ručne vyrieši konflikty (pokročilejší študent), alebo potrebuje pomoc asistenta/učiteľa.

## 4. Odporúčaný proces pri väčších zmenách

1. **Priprav si testovací assignment** (sandbox) s 1–2 testovacími „študentmi“.
2. Urob zmeny v template.
3. Spusti Sync len na sandbox triede.
4. Skontroluj:
   - čo sa presne zmenilo v študentskom repozitári,
   - či nedošlo k prepisu obsahu, ktorý by študenti už menili.
5. Až potom sprav zmeny v ostrej triede.

## 5. Komunikácia so študentmi pred Sync

Odporúčaný text (prispôsob si podľa potreby):

```text
Milí študenti,
v najbližších dňoch upravím šablónu vášho repozitára (pridám nové HELP a dokumenty).
Prosím:
1. Pred zmenou si commitnite a pushnite všetky svoje zmeny.
2. Po mojom oznámení si urobte git pull (alebo si repo znova otvoríte cez web) a skontrolujte nové súbory.
Ak by niečo prestalo fungovať, ozvite sa čo najskôr cez Issues alebo e-mail.
```

## 6. Bezpečnostná brzda

- Ak si **nie si istý**, radšej Sync nepouži a:
  - zmeny z template pošli študentom ako manuálny návod (napr. „pridajte tento súbor“),
  - alebo nechaj zmeny len pre ďalší ročník / budúce assignmenty.

---

💬 *Small Talk Moment:*  
Sync assignment je ako aktualizácia softvéru v aute – super, kým ti počas jazdy nepreblikne palubovka. Preto najprv test na parkovisku. 🚗
