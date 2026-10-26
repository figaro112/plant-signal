"""Check project documentation without executing upstream deployment tools."""
from pathlib import Path
import json, re, uuid, subprocess, hashlib, sys
ROOT=Path(__file__).resolve().parents[1]
META=json.loads((ROOT/'config/plant-signal/project.json').read_text(encoding='utf-8'))
PROJECT=ROOT/'content/docs/en/sthdf'/META['project_folder']
SECTIONS=['about-me','knowledge-contribution','project-summary','project-outcomes','pitch-presentation','final-presentation','reflexia']
errors=[]
for section in SECTIONS:
    if not (PROJECT/'students'/section/'index.md').is_file():errors.append('Missing deliverable: '+section)
files=[ROOT/'README.md',ROOT/'docs/CONCEPT.en.md',ROOT/'docs/PROJECT_BRIEF.sk.md',ROOT/'docs/TEMPLATE_MIGRATION.md',ROOT/'models/README.md',*PROJECT.rglob('*.md'),*ROOT.glob('content/docs/en/knifes/K-LOCAL-*/**/*.md'),*ROOT.glob('content/docs/sk/sthdf/'+META['project_folder']+'/**/*.md')]
guids=set();ids=set();links=0
files.extend(ROOT/'docs'/name for name in ['ARCHITECTURE.en.md','APP_FEATURES.en.md','WATERING_CONTROL.en.md','SCOPE_CHANGELOG.en.md'])
for p in files:
    text=p.read_text(encoding='utf-8');rel=p.relative_to(ROOT).as_posix()
    if rel.startswith('content/'):
        if not text.startswith('---\n'):errors.append('Missing front matter: '+rel);continue
        header=re.match(r'\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)',text,re.S)[1]
        for key in ['fm_version','guid','dao','title','author','authors','locale','created','status','privacy','license','origin_repo']:
            if not re.search(r'^'+key+r':',header,re.M):errors.append('Missing '+key+': '+rel)
        for key,seen in [('guid',guids),('id',ids)]:
            m=re.search(r'^'+key+r':\s*"([^"]+)"',header,re.M)
            if m:
                if m[1] in seen:errors.append('Duplicate '+key+': '+m[1])
                seen.add(m[1])
                if key=='guid':uuid.UUID(m[1])
        if f'privacy: "{META["privacy"]}"' not in header:errors.append('Wrong visibility metadata: '+rel)
        expected='sk' if '/sk/' in rel else 'en'
        if f'locale: "{expected}"' not in header:errors.append('Wrong locale: '+rel)
        if re.search(r'\{\{[A-Z_]+\}\}',text):errors.append('Unresolved placeholder: '+rel)
    stripped=re.sub(r'```.*?```','',text,flags=re.S)
    for target in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)',stripped):
        if target.startswith(('https://','http://','mailto:','#')):continue
        target=target.split('#',1)[0];resolved=(p.parent/target).resolve()
        if not resolved.is_relative_to(ROOT.resolve()):errors.append('Link escapes project: '+rel+' -> '+target)
        elif not resolved.exists():errors.append('Missing target: '+rel+' -> '+target)
        links+=1
check_assets='--check-original-assets' in sys.argv
for prefix in (['models','assets'] if check_assets else []):
    names=subprocess.check_output(['git','ls-tree','-r','--name-only','1315d1f','--',prefix],cwd=ROOT,text=True).splitlines()
    for name in names:
        old=subprocess.check_output(['git','show','1315d1f:'+name],cwd=ROOT)
        current=(ROOT/name).read_bytes()
        if Path(name).suffix in {'.md','.json','.scad'}:
            old=old.replace(b'\r\n',b'\n');current=current.replace(b'\r\n',b'\n')
        if hashlib.sha256(old).digest()!=hashlib.sha256(current).digest():errors.append('Original asset changed: '+name)
active=sorted(p.name for p in (ROOT/'.github/workflows').glob('*.yml'))
if active!=['plant-signal-docs.yml']:errors.append('Unexpected active workflows: '+str(active))
if errors:raise SystemExit('\n'.join(errors[:20])+f'\nTotal errors: {len(errors)}')
print(f'OK: {len(SECTIONS)} deliverables, {len(files)} documents, {links} relative links, {len(guids)} unique GUIDs.'+(' Original CAD/images preserved.' if check_assets else ''))
