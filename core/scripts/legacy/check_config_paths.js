// scripts/check_config_paths.js
// Rýchla kontrola, či cesty v docusaurus.config.ts existujú v ./docs.
// Overuje odkazy v navbar.items[].to (napr. "/docs/sk/7Ds/") a skontroluje, či
// existuje docs/sk/7Ds/index.md alebo docs/sk/7Ds.md

const fs = require('fs');
const path = require('path');

const CONFIG = path.join(process.cwd(), 'docusaurus.config.ts');

function readConfig() {
  const src = fs.readFileSync(CONFIG, 'utf8');
  // veľmi jednoduché vytiahnutie "/docs/..." z navbaru
  const navbarBlock = src.split('navbar:')[1] || '';
  const toPaths = [...navbarBlock.matchAll(/to:\s*'([^']+)'/g)].map(m => m[1]);
  return toPaths.filter(p => p.startsWith('/docs/'));
}

function pathExists(docTo) {
  // pre /docs/sk/7Ds/ -> docs/sk/7Ds/index.md alebo docs/sk/7Ds.md
  const rel = docTo.replace(/^\/docs\//, 'docs/').replace(/\/+$/, '');
  const idx = path.join(process.cwd(), rel, 'index.md');
  const md  = path.join(process.cwd(), rel + '.md');
  return fs.existsSync(idx) || fs.existsSync(md);
}

function main() {
  const paths = readConfig();
  const missing = paths.filter(p => !pathExists(p));
  if (missing.length) {
    console.error('❌ Missing targets in config:', missing);
    process.exit(1);
  }
  console.log('✓ Config paths OK');
}

main();
