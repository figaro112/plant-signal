---
id: "ARCH-002"
guid: ""
dao: "project"
title: "Content Structure – SSOT Layer"
description: "Popis štruktúry priečinkov content a ich väzby na systémové šablóny."
author: "Roman Kazička"
authors: ["Roman Kazička"]
category: "reference"
type: "architecture"
tags: ["content","structure","ssot"]
created: "2025-10-12"
status: "inprogress"
fm_version: "1.0.1"
fm_build: "2025-10-12T14:05:00Z"
---

# 📘 Content Structure – SSOT Layer

> `content/` je **Single Source of Truth** (SSOT) pre všetky výstupy.  
> Všetko, čo sa publikuje, musí pochádzať z tejto vrstvy.

## Hlavné zásady
- **Nič sa negeneruje priamo do `content/`**.  
- Každý jazyk (`sk/en/...`) má samostatný podpriečinok.  
- Všetky `.md` súbory musia mať FM-Core.

### Príklad štruktúry