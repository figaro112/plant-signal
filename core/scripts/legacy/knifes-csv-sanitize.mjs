// scripts/knife-csv-sanitize.mjs (HOTFIX: preserve preface + header, add --report-only)
import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/knife-csv-sanitize.mjs <CSV file> [--report-only]');
  process.exit(2);
}

const REPORT_ONLY = process.argv.includes('--report-only');

function normalize(s){
  // pure normalization — must NOT drop any lines
  s = s.replace(/\r\n?/g, '\n');         // CRLF/CR → LF
  s = s.replace(/\u00A0/g, ' ');         // NBSP → space
  s = s.replace(/[“”]/g, '"')            // smart quotes → "
       .replace(/[‘’]/g, "'");           // smart apostrophes → '
  s = s.split('\n').map(l => l.replace(/[ \t]+$/,'')).join('\n'); // trim EOL spaces
  if (!s.endsWith('\n')) s += '\n';      // ensure newline at EOF
  return s;
}

// Utility: detect first header (line with id + title, accepting BOM/quotes/spaces)
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
const cleaned = normalize(raw);

// SAFETY: verify we didn't lose the data header
const rawLines = raw.replace(/\r\n?/g, '\n').split('\n');
const outLines = cleaned.split('\n');
const rawHeaderIdx = findHeaderIndex(rawLines);
const outHeaderIdx = findHeaderIndex(outLines);

if (REPORT_ONLY) {
  if (raw === cleaned) {
    console.log('✅ No changes needed. File is already clean.');
  } else {
    console.log('🔎 Differences detected. Sanitizer would apply fixes:');
    if (/\r\n/.test(raw)) console.log(' • Normalize line endings (CRLF/CR → LF)');
    if (/\u00A0/.test(raw)) console.log(' • Replace NBSP → space');
    if (/[“”]/.test(raw)) console.log(' • Replace smart quotes → "'); 
    if (/[‘’]/.test(raw)) console.log(" • Replace smart apostrophes → '");
    const trailing = raw.split('\n').some(l => /[ \t]+$/.test(l));
    if (trailing) console.log(' • Trim trailing spaces at end of lines');
    if (!raw.endsWith('\n')) console.log(' • Add missing newline at EOF');
  }
  if (rawHeaderIdx === -1) {
    console.warn('⚠️  Input does NOT contain a detectable data header (id + title).');
  } else if (outHeaderIdx === -1) {
    console.warn('❗ SAFETY: Output would lose the data header! This should NEVER happen. Please report.');
  } else {
    console.log(`✓ Header preserved (input line ${rawHeaderIdx+1} → output line ${outHeaderIdx+1}).`);
  }
  process.exit(0);
}

// Normal write-to-stdout mode
if (rawHeaderIdx !== -1 && outHeaderIdx === -1) {
  // Extremely defensive: if somehow header vanished (shouldn't), fallback to raw to avoid data loss.
  console.error('❗ SAFETY: Detected header loss during sanitize. Emitting original content to prevent damage.');
  process.stdout.write(raw);
} else {
  process.stdout.write(cleaned);
}
