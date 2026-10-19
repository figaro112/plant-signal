// scripts/knife-csv-sanitize.mjs — SAFE: neodstraňuje žiadne riadky/preface
import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/knife-csv-sanitize.mjs <CSV file> [--report-only]');
  process.exit(2);
}
const REPORT_ONLY = process.argv.includes('--report-only');

function sanitizeChars(s) {
  // 1) Normalizuj konce riadkov (CRLF/CR -> LF)
  s = s.replace(/\r\n?/g, '\n');
  // 2) NBSP -> space
  s = s.replace(/\u00A0/g, ' ');
  // 3) “ ” -> "   a   ‘ ’ -> '
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // 4) Trim koncových medzier PRED newline (nezasahuje do počtu riadkov)
  s = s.replace(/[ \t]+(?=\n)/g, '');
  // 5) Ensure newline at EOF
  if (!s.endsWith('\n')) s += '\n';
  return s;
}

// len kontrola existencie dátovej hlavičky (id + title) – nič nevyhadzujeme
function findHeaderIndex(lines){
  const headerRe = /^[\uFEFF\s"]*id[\s"]*[,;\t].*?["\s]*title["\s]*([,;\t]|$)/i;
  for (let i=0;i<lines.length;i++){
    const line = lines[i];
    if (!line.trim()) continue;
    if (headerRe.test(line)) return i;
  }
  return -1;
}

const raw = await fs.readFile(file, 'utf8');
const cleaned = sanitizeChars(raw);

if (REPORT_ONLY) {
  const msgs = [];
  if (/\r\n?/.test(raw) && !/^\n$/.test('\n')) msgs.push('• Normalize line endings (CRLF/CR → LF)');
  if (/\u00A0/.test(raw)) msgs.push('• Replace NBSP → space');
  if (/[“”]/.test(raw)) msgs.push('• Replace smart quotes → "');
  if (/[‘’]/.test(raw)) msgs.push("• Replace smart apostrophes → '");
  if (/[ \t]+(?=\n)/.test(raw)) msgs.push('• Trim trailing spaces at EOL');
  if (!raw.endsWith('\n')) msgs.push('• Add missing newline at EOF');
  console.log(msgs.length ? '🔎 Would apply:\n' + msgs.join('\n') : '✅ No changes needed.');

  const ri = findHeaderIndex(raw.replace(/\r\n?/g,'\n').split('\n'));
  const ci = findHeaderIndex(cleaned.split('\n'));
  if (ri === -1) console.warn('⚠️ Input: nenašla sa dátová hlavička (id + title).');
  else if (ci === -1) console.warn('❗ Output: chýba detegovaná dátová hlavička (to by sa nemalo stať).');
  else console.log(`✓ Header preserved (input line ${ri+1} → output line ${ci+1}).`);
  process.exit(0);
}

// Safety: ak by náhodou hlavička zmizla, vypíšeme radšej pôvodné dáta
const ri = findHeaderIndex(raw.replace(/\r\n?/g,'\n').split('\n'));
const ci = findHeaderIndex(cleaned.split('\n'));
process.stdout.write((ri !== -1 && ci === -1) ? raw : cleaned);