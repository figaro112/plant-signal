// scripts/new_knife.mjs
// Usage: node scripts/new_knife.mjs K000062 "Docusaurus slugs & routing"
import fs from 'node:fs/promises';
import path from 'node:path';

function kebab(s) {
  return (s || 'untitled')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

const id = process.argv[2];
const short = process.argv[3] || 'New Topic';
if (!id || !/^K\d{3}$/i.test(id)) {
  console.error('Provide ID like K000062 and optional short title.');
  process.exit(2);
}
const folder = `${id}-${kebab(short)}`;
const dir = path.join('docs', 'sk', 'KNIFES', folder);
const file = path.join(dir, `${folder}.md`);

await fs.mkdir(dir, { recursive: true });

const fm = `---
id: ${id.toLowerCase()}-${kebab(short)}
title: "${id} – ${short}"
slug: /KNIFES/${folder}/
sidebar_label: "${id} – ${short}"
tags: []
---

> Draft…
`;

try {
  await fs.access(file);
  console.log('Exists:', file);
} catch {
  await fs.writeFile(file, fm, 'utf8');
  console.log('Created:', file);
}
