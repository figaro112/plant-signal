---
id: "ARCH-004"
dao: "project"
title: "Publishing Process – From Content to Deployment"
description: "Proces publikovania obsahu z priečinka content cez publishing do finálnych výstupov."
author: "Roman Kazička"
category: "reference"
type: "architecture"
tags: ["publishing","deployment","gitflow","actions"]
created: "2025-10-12"
status: "inprogress"
---

# 🌐 Publishing Process – From Content to Deployment

> Publishing je **proces**, nie cieľ.  
> Oddelením contentu a publishingu sa dá zabezpečiť čistota dát a opakovateľnosť buildov.

## Typický tok

1. **Authoring** – tvorba obsahu v `content/`
2. **Staging** – kopírovanie alebo build do `publishing/<generator>/`
3. **Build** – SSG (napr. Docusaurus, Hugo, Docsy)
4. **Deploy** – push na `gh-pages` alebo iný host

### Makefile Ciele (príklad)
```bash
make stage-docusaurus
make build-hugo
make publish-sites