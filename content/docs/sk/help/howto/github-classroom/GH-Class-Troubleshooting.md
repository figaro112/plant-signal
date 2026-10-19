# Troubleshooting (SK)

## 1. Študent nevidí assignment
- Nemá GitHub účet
- Je prihlásený nesprávnym účtom
- Prefix nebol zadaný pri vytváraní assignmentu

## 2. Sync nevytvára PR
- Template neobsahuje nové zmeny
- Assignment bol vytvorený z nesprávneho templatu

## 3. Konflikty v PR
- Študent menil tie isté súbory, ktoré aktualizoval učiteľ
- Riešenie: manuálne vyriešiť konflikt, potvrdiť merge

## 4. Študent nemôže pushnúť
- Chýba `git pull` pred push
- Lokálne zmeny sú v konfliktnom stave
- Upstream URL je zle nastavené

## 5. Študent pracuje pod iným účtom
- Overiť Settings → Emails → Primary email
- Odhlásiť sa a prihlásiť správnym GitHub účtom
