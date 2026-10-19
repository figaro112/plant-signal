#!/usr/bin/env python3
import csv, unicodedata, re, sys

STATUS_CANON = {"backlog","inprogress","done","archived","other"}
PRIORITY_CANON = {"top","middle","low","no"}

STATUS_ALIASES = {
    "": "backlog", "todo":"backlog","tbd":"backlog","idea":"backlog","napad":"backlog","nápad":"backlog",
    "now":"backlog","new":"backlog","init":"backlog","backlog":"backlog","queued":"backlog","queue":"backlog","pending":"backlog",
    "inprogress":"inprogress","in-progress":"inprogress","wip":"inprogress","work-in-progress":"inprogress",
    "ongoing":"inprogress","active":"inprogress","aktivna":"inprogress","aktívna":"inprogress",
    "working":"inprogress","rozpracovane":"inprogress","rozpracované":"inprogress","draft":"inprogress",
    "done":"done","final":"done","finished":"done","complete":"done","completed":"done","hotovo":"done","finalized":"done","zverejnene":"done","zverejnené":"done",
    "archived":"archived","archive":"archived","retired":"archived","deprecated":"archived",
    "onhold":"other","on-hold":"other","paused":"other","pause":"other","blocked":"other","later":"other",
    "review":"other","kontrola":"other","revizia":"other","revízia":"other"
}

PRIORITY_ALIASES = {
    "": "no","none":"no","no":"no",
    "low":"low","minor":"low","trivial":"low",
    "middle":"middle","medium":"middle","normal":"middle",
    "high":"top","hi":"top","top":"top","urgent":"top","critical":"top"
}

def strip_accents(s: str) -> str:
    import unicodedata
    return ''.join(ch for ch in unicodedata.normalize('NFD', s) if unicodedata.category(ch) != 'Mn')

def strip_emojis(text: str) -> str:
    return ''.join(ch for ch in text if ch.isascii() or ch.isalnum() or ch.isspace() or ch in "-_")

def norm_alias(value, aliases, canon, default):
    if value is None:
        return default
    v = str(value).strip()
    v = strip_emojis(v)
    v = v.strip('"').strip("'")
    low = v.lower()
    if low in canon:
        return low
    key = strip_accents(low)
    if key in aliases:
        return aliases[key]
    cleaned = ''.join(ch for ch in low if ch.isalnum() or ch.isspace() or ch in "-_")
    key2 = strip_accents(cleaned)
    if key2 in aliases:
        return aliases[key2]
    return default if low == "" else (low if low in canon else default)

def normalize_csv(in_path, out_path):
    with open(in_path, "r", encoding="utf-8-sig") as fin:
        reader = csv.DictReader(fin)
        headers = reader.fieldnames or []
        # Ensure we output at least these columns in a stable order
        out_headers = list(dict.fromkeys([*(h for h in headers), "guid", "id", "status", "priority"]))
        rows_out = []
        for row in reader:
            r = {k: (v or "").strip() for k,v in row.items()}
            guid = r.get("guid") or r.get("GUID") or ""
            cid = r.get("id") or r.get("ID") or ""
            status = norm_alias(r.get("status",""), STATUS_ALIASES, STATUS_CANON, "backlog")
            priority = norm_alias(r.get("priority",""), PRIORITY_ALIASES, PRIORITY_CANON, "no")
            r["guid"] = guid
            r["id"] = cid
            r["status"] = status
            r["priority"] = priority
            rows_out.append(r)
    with open(out_path, "w", encoding="utf-8", newline="") as fout:
        writer = csv.DictWriter(fout, fieldnames=out_headers)
        writer.writeheader()
        for r in rows_out:
            writer.writerow({h: r.get(h, "") for h in out_headers})

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: knife_csv_normalize.py <input.csv> <output.csv>")
        sys.exit(2)
    normalize_csv(sys.argv[1], sys.argv[2])
