---
title: "Git PR UAT"
description: "Postup pre vytvorenie Pull Requestu na testovanie v UAT prostredí"
---

# K-TASK-GIT-PR-UAT-001

## Cieľ

Tento návod popisuje postup, ako vytvoriť Pull Request (PR) v Git repozitári pre účely testovania v UAT prostredí.

## Predpoklady

- Mať lokálnu kópiu repozitára.
- Mať správne nastavené remote repozitáre (origin, upstream).
- Mať vytvorenú vetvu s požadovanými zmenami.

## Postup

1. **Aktualizujte lokálny master branch:**

```
git checkout master
git pull upstream master
```

2. **Vytvorte novú vetvu pre vašu zmenu:**

```
git checkout -b feature/moja-zmena
```

3. **Pridajte a commitnite zmeny:**

```
git add .
git commit -m "Popis zmeny"
```

4. **Pushnite vetvu na origin:**

```
git push origin feature/moja-zmena
```

5. **Vytvorte Pull Request na GitHub:**

- Prejdite na stránku repozitára na GitHub.
- Vyberte vašu vetvu `feature/moja-zmena`.
- Kliknite na tlačidlo "Compare & pull request".
- Vyplňte popis PR.
- Požiadajte o review.

## Po vytvorení PR

- Počkajte na schválenie a merge PR.
- Po merge aktualizujte lokálny master:

```
git checkout master
git pull upstream master
```

## Poznámky

- Uistite sa, že PR je testovateľný v UAT prostredí.
- Komunikujte so zodpovedným tímom pre nasadenie.

## Overenie upstreamu

Ak chcete overiť, že máte správne nastavený upstream remote, použite:

```
git remote -v
```

Výsledok by mal obsahovať riadky pre `origin` aj `upstream`.

## Súvisiace návody


