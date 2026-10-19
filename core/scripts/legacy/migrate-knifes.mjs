// scripts/build_knifes.mjs
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';

// ... other imports and code ...

// --- CSV utils (light, robust) ---
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  // auto-delim
  const delims = [',',';','\t','|'];
  let delim = ',', header = [];
  for (const d of delims) {
    const cells = splitLine(lines[0], d);
    if (cells.some(c => /id/i.test(c))) { delim = d; header = cells; break; }
  }
  if (!header.length) header = splitLine(lines[0], delim);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delim);
    const obj = {};
    header.forEach((h, idx) => obj[h.trim()] = (cells[idx] ?? '').trim());
    rows.push(obj);
  }

  // Helpers to extract authors/created robustly (case/space insensitive)
  function getAuthorsFromCSVRow(r) {
    const norm = (k) => String(k || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/\s+/g, '');
    const key = Object.keys(r).find(k => {
      const nk = norm(k);
      return nk.includes('author') || nk.includes('authors') || nk.includes('autor') || nk.includes('autori');
    });
    const raw = key ? r[key] : '';
    return String(raw)
      .split(/[,;|]/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  function getCreatedFromCSVRow(r) {
    const cand = r['Date of Record'] || r['date of record'] || r.Date || r.date || '';
    if (!cand) return '';
    const d = new Date(cand);
    return isNaN(d) ? '' : d.toISOString().slice(0,10);
  }

  // Map CSV by ID for backfill (authors, created)
  const _csvById = new Map(rows.map(r => {
    const _id = String(r.ID || r.Id || r.id || r['\uFEFFID'] || '').trim().toUpperCase();
    const _authors = getAuthorsFromCSVRow(r);
    const _created = getCreatedFromCSVRow(r);
    return [_id, { authors: _authors, created: _created }];
  }));

  return { rows, _csvById };
}
function splitLine(line, delim) {
  const out = []; let curr = '', q = false;
  for (let i=0;i<line.length;i++){
    const ch=line[i];
    if (ch === '"') { if (q && line[i+1] === '"') { curr+='"'; i++; } else { q=!q; } }
    else if (ch === delim && !q) { out.push(curr); curr=''; }
    else curr += ch;
  }
  out.push(curr);
  return out;
}

// ... other code ...

async function buildKnifes() {
  // ... code before CSV load ...

  // load CSV + parse rows and backfill map
  const csvText = await fs.readFile(csvPath, 'utf8');
  const { rows, _csvById } = parseCSV(csvText);

  // ... code that uses rows, such as filtering/sanitization ...

  // ... code that generates skeleton/overview based on CSV ...

  // call normalizeKnifes with csvById map
  await normalizeKnifes(repoRoot, { org, project, dryRun, locale, csvById: _csvById });

  // ... code after ...
}

// ... other code ...

async function normalizeKnifes(repoRoot, opts) {
  // ... code before loop ...

  for (const folder of folders) {
    // ... code to read and parse frontmatter fm ...

    const id = (fm.id || (folder.match(/^(K\d{3})/i)||[,''])[1] || '').toUpperCase();

    // ... code to build outObj ...

    const outObj = {
      ...fm,
      // ... other computed fields ...
    };

    // Backfill author/authors from CSV index if missing
    const __byId = opts.csvById instanceof Map ? opts.csvById.get(id) : undefined;
    if (__byId) {
      if ((!outObj.author || outObj.author === '') && Array.isArray(__byId.authors) && __byId.authors.length) {
        outObj.author = __byId.authors[0];
      }
      if ((!outObj.authors || !Array.isArray(outObj.authors) || outObj.authors.length === 0) && Array.isArray(__byId.authors)) {
        outObj.authors = __byId.authors.slice(0, 10);
      }
    }

    // Ensure created/modified presence
    const __today = new Date().toISOString().slice(0,10);
    if (!outObj.created) {
      outObj.created = (__byId && __byId.created) ? __byId.created : __today;
    }
    if (outObj.modified === undefined) {
      // keep empty so author/CI can set real date later
      outObj.modified = '';
    }

    // Normalize tags/authors to arrays (avoid JSON-string artifacts)
    function __normToArray(v) {
      if (Array.isArray(v)) return v.filter(Boolean).map(s => String(s).trim());
      if (typeof v === 'string') {
        const str = v.trim();
        if (!str) return [];
        try { if (str.startsWith('[') && str.endsWith(']')) return JSON.parse(str); } catch {}
        return str.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      }
      return [];
    }
    if (outObj.tags !== undefined) outObj.tags = __normToArray(outObj.tags);
    if (outObj.authors !== undefined) outObj.authors = __normToArray(outObj.authors);

    // If author is still empty but authors array exists, set primary author from it
    if ((!outObj.author || outObj.author === '') && Array.isArray(outObj.authors) && outObj.authors.length) {
      outObj.author = outObj.authors[0];
    }

    // ... code to write file ...
  }

  // ... code after ...
}

// ... other code ...

// In all overview renderers, ensure Title is clickable link

// Example snippet inside overview rendering function:
function renderOverviewRow(r) {
  const _title = r.ShortTitle || r['Short Title'] || r.title || r.Title || r.ID || '';
  const _href  = r.slug || r._linkSlug || r._docRelLink || '';
  const _titleCell = _href ? `[${_title}](${_href})` : _title;

  return [
    _titleCell,
    // ... other columns, no separate Link column ...
  ];
}

// ... rest of the file ...