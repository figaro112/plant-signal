---
id: "K000000018-01"
guid: "67fa4142-7407-4ca8-a24a-a0777669bc26"
dao: "knife"
title: "KNIFEs - Rules and Princpiples"
description: "KNIFE pre zvedavých - User guide."
author: "Roman Kazička"
authors: ["Roman Kazička", "", ""]
category: "deliverable"
type: "knife"
priority: "top"
tags: ["KNIFE"]
created: "2025-09-17"
modified: "2025-09-30"
status: "inprogress"
locale: "sk"
#sidebar_label: "K000000018-01 –  KNIFEs - Rules and Princpiples"
sidebar_position: 1
rights_holder_content: "Roman Kazička"
rights_holder_system: "Roman Kazička (CAA/KNIFE/LetItGrow)"
license: "CC-BY-NC-SA-4.0"
disclaimer: "Educational content. Use at your own risk."
copyright: "© 2025 Roman Kazička / SystemThinking"
author_id: ""
author_did: ""
---
# KNIFEs - Rules and Princpiples
# KNIFE Rule 001 – Dash for Empty
Všetky nevyplnené hodnoty vo Front Matter sa zapisujú ako `"-"`, nie ako `""` ani `null`.  
Tento prístup zabezpečuje jednotnú interpretáciu v YAML, JSON aj SQL Lite prostredí a minimalizuje riziko chýb pri parsovaní.

# KNIFE Rule 002 – Double Quotes Everywhere
Každá hodnota (aj číslo, aj boolean) musí byť v úvodzovkách `"..."`.  
Zaručuje to bezpečné parsovanie pre YAML aj JSON konverzie.

# KNIFE Rule 003 – Deterministic GUID
Každý KNIFE má jedinečný `guid`, ktorý je nemenný po celý život dokumentu.

# KNIFE Rule 004 – Consistent ID Format
Všetky KNIFE ID musia mať formát `K000XYZ` (6 číslic).  
Pri odvodených alebo doplnkových KNIFE sa používa `-suffix` (napr. `K000067_makefile_appendix`).

# KNIFE Rule 005 – Separation of Concerns
Technické skripty (`fix`, `sync`, `verify`, `build`) **nesmú meniť obsah**, iba štruktúru alebo metaúdaje.  
Obsahové zmeny sú výhradne v rukách autora KNIFE.