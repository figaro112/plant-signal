---
title: Docusaurus – inštalácia a základné príkazy
---

# Docusaurus – inštalácia a základné príkazy

Táto stránka popisuje, ako rozbehať Docusaurus pre KNIFE / STHDF dokumentáciu.

## Predpoklady

- nainštalovaný **Git**
- nainštalovaný **Node.js** (LTS verzia)
- prístup k repozitáru (napr. cez GitHub)

## Inštalácia závislostí

V koreňovom priečinku Docusaurus projektu:

```bash
cd publishing/docusaurus
npm install
```

## Najčastejšie príkazy

```bash
# Lokálny dev server
npm run start

# Production build
npm run build

# Náhľad vybuildovanej verzie
npm run serve
```

V KNIFE/CLASS templatoch môžeš mať aliasy cez `make`, napr.:

```bash
make dev
make build
make serve
```

Pozri si konkrétny `Makefile` v danom projekte.
