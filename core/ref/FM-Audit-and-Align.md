# 🧩 KNIFE – Režimy kontroly a opravy Front Matter (FM)

Tento dokument popisuje štandardizované režimy práce s Front Matter (FM) v KNIFE ekosystéme.  
Cieľom je zabezpečiť **konzistenciu a kvalitu všetkých Markdown súborov** prostredníctvom automatizovanej kontroly, simulácie opráv a ich aplikácie.

---

## 🔍 Typy režimov

| Režim    | Účel               | Čo robí                                                                                                     | Zapisuje do súborov? |
|----------|--------------------|------------------------------------------------------------------------------------------------------------|----------------------|
| **audit** | Diagnostický režim | Skontroluje FM na chyby, chýbajúce alebo nadbytočné kľúče, nesprávne typy hodnôt, neuzavreté úvodzovky, zakázané polia (napr. `date:`). | ❌ Nie               |
| **dry**   | Simulačný režim    | Simuluje opravu FM podľa vzorového šablónového súboru (napr. `K18`). Ukáže presný rozdiel (`diff`) medzi pôvodným a navrhovaným obsahom.          | ❌ Nie               |
| **apply** | Opravný režim      | Vykoná rovnaké zmeny ako `dry`, ale reálne ich zapíše do súborov. Pred zápisom vytvorí zálohu s príponou `.bak`.                              | ✅ Áno               |

---

## ⚙️ Podrobný popis režimov

### Audit

Režim **audit** slúži na diagnostiku aktuálneho stavu Front Matter v Markdown súboroch.  
Skontroluje:

- Prítomnosť všetkých požadovaných kľúčov a ich správnosť.
- Absenciu zakázaných alebo nežiadaných kľúčov (napr. `date:`).
- Správne typy hodnôt (napr. čísla, text, zoznamy).
- Uzavretie úvodzoviek a syntaktickú správnosť FM.

Výstupom je zoznam nájdených problémov a odporúčanie na opravu. Žiadne zmeny sa neaplikujú.

---

### Dry (Simulácia opráv)

Režim **dry** simuluje opravy na základe vzorového FM (napr. podľa šablóny `K18`).  
Vypíše podrobný rozdiel (`diff`) medzi pôvodným obsahom súboru a tým, ako by vyzeral po oprave.

Tento režim:

- Nezapisuje žiadne zmeny do súborov.
- Umožňuje používateľovi vidieť presne, čo by sa opravilo.
- Slúži ako kontrolný krok pred aplikáciou zmien.

---

### Apply (Aplikácia opráv)

Režim **apply** vykonáva rovnaké zmeny ako `dry`, ale navyše:

- Zmeny sa zapíšu priamo do pôvodných súborov.
- Pred zápisom sa vytvorí zálohovací súbor s príponou `.bak` pre prípad potreby obnovy.
- Zabezpečuje, že všetky FM súbory budú v súlade so štandardom a konzistentné.

Používajte tento režim až po dôkladnej simulácii a kontrole zmien.

---

## 🛠️ Odporúčaný pracovný postup

1. **Audit** – Najprv vykonajte kontrolu FM súborov, aby ste identifikovali chyby a nezrovnalosti:
   ```bash
   make k18-audit
   ```

2. **Dry** – Následne simulujte opravy a skontrolujte navrhované zmeny:
   ```bash
   make k18-dry
   ```

3. **Apply** – Ak sú zmeny správne a vyhovujúce, aplikujte ich do súborov:
   ```bash
   make k18-apply
   ```

4. **Verifikácia** – Nakoniec overte, že FM súbory sú správne a konzistentné, prípadne spustite audit znova.

---

## 📝 Záver

Režimy **audit**, **dry** a **apply** spolu tvoria bezpečný a efektívny nástroj na udržiavanie kvality Front Matter v KNIFE projekte.  
Použitím týchto režimov zabezpečíte konzistenciu dát, predídete chybám a uľahčíte správu obsahu.  
Všetky opravy vychádzajú z overenej šablóny `K18`, ktorá definuje správnu štruktúru a obsah FM.

Dodržiavanie tohto postupu je kľúčové pre hladký chod KNIFE ekosystému a kvalitu výsledných Markdown dokumentov.