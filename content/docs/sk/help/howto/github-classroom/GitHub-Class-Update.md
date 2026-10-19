# Ako aktualizovať templaty v GitHub Classroom

Tento dokument vysvetľuje, ako správne aktualizovať templaty v GitHub Classroom a ako zabezpečiť, aby študenti dostali zmeny.

## 🧠 Základný princíp

1. Pri vytvorení assignmentu si Classroom vytvorí KÓPIU templatu.
2. Študentské repozitáre už nie sú prepojené s templatom.
3. Zmeny v templati sa prenášajú iba aktívnym zásahom učiteľa.

---

# 🥇 Spôsob A — „Sync assignments“ (odporúčaný)

Classroom obsahuje funkciu, ktorá automaticky vytvorí Pull Request do každého študentského repozitára.

### Ako na to:
- Otvor Classroom
- Vyber assignment
- Klikni **Sync assignments**

### Čo to spraví:
- Porovná template HEAD so študentskými repozitármi
- Vygeneruje PR do každého repozitára
- Študent (alebo učiteľ) PR mergne

### Výhody:
- Bezpečné
- Auditovateľné
- Nestráca sa história
- Automaticky rieši konflikty

---

# 🥈 Spôsob B — Ručný merge (pokročilý)

1. Klonuj študentský repo.
2. Pridaj remote templatu:
   ```
   git remote add template https://github.com/ORG/TEMPLATE_REPO.git
   git fetch template
   ```
3. Porovnaj:
   ```
   git diff template/main..main
   ```
4. Merge alebo cherry-pick:
   ```
   git merge template/main
   ```
5. Push:
   ```
   git push
   ```

---

# 🧨 Spôsob C — Nevhodné: tvorba nového assignmentu

Toto spôsobí:
- stratu histórie
- nefunkčné Classroom štatistiky
- reset hodnotení

Použiť len ak študenti ešte nezačali pracovať.

---

# 📌 Odporúčaný postup pre STHDF

- Template dolaďovať postupne
- Assignment vytvoriť až keď je template stabilný
- Aktualizácie posielať cez **Sync assignments**

---

# 🎓 Príprava ďalších dokumentov
- TeacherGuide_TemplateSync.md
- StudentGuide_HowToMergeTeacherUpdates.md
- Automatizované screenshoty
- Audity diffs cez CLI

Ak chceš, môžem ich pripraviť ako ďalší krok.

