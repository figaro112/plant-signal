# Pattern Overview

Základné princípy:
1) **FM-Core je jednotný** – všetky entity ho dedičia (KNIFE/Q12/7Ds…).
2) **body/** – existuje iba v TEMPLATES na oddelenie header/body; vo finálnom obsahu sa nepoužíva ako pevný adresár.
3) **Navigácia** – konzistentné relatívne linky; späť na Hub vždy prítomný.
4) **Číslovanie priečinkov** – `01.`, `02.`… pre poradie.
5) **Slug stabilita** – ak treba, explicitný `slug` vo FM.

Checklist pred použitím:
- [ ] Má položka správny `dao`?
- [ ] Sedí štruktúra linkov (relatívne cesty)?
- [ ] Nie sú porušené pravidlá FM-Core?
