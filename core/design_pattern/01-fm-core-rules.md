# FM-Core Rules (SSOT)

- FM-Core je **centrálna šablóna**; nepíleme ju podľa typov, len **doplňujeme** cez user header.
- Povinné kľúče: `id`, `guid`, `dao`, `title`, `locale`, `created`, `status`, `privacy`.
- `dao` – musí byť malými písmenami (`knife`, `q12`, `7ds`…).
- `id` – stabilné, bez medzier (napr. `K000088-...` alebo `SK_Q12_HOME`).
- `slug` – používame, keď potrebujeme stabilnú URL (napr. pre rozcestníky).
- **Add-only policy** – existujúce hodnoty nemeníme skriptom; len dopĺňame chýbajúce.
