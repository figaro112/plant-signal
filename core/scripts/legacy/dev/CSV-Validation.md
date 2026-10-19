# CSV Validation Guide

## Why validation?
When working with **KNIFE ODS → CSV exports**, column names may vary:
- LibreOffice vs Excel
- Manual edits
- Typos / language drift

Without validation, the generator can fail silently → creates `Untitled` KNIFEs.

## Solution
We define:
- **`schema/header.aliases.json`** – accepted column aliases for each canonical key.
- **Validator step** – checks that the CSV has all required fields, normalizes headers, and blocks build on errors.

## Workflow

### 1. Validate CSV
```bash
make knife-validate-csv