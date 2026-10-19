---
title: Inštalácia na Windows (MSYS2)
---

# Inštalácia nástrojov na Windows (MSYS2)

## 1. Stiahni MSYS2

https://www.msys2.org

## 2. Aktualizuj balíčky

```bash
pacman -Syu
```

## 3. Inštaluj Git + Node

```bash
pacman -S git
pacman -S nodejs
```

## 4. Overenie

```bash
git --version
node --version
```
