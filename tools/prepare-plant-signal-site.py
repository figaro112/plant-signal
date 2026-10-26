"""Stage only PlantSignal documentation for an optional, unpublished preview."""
from pathlib import Path
import json, os, re, shutil
ROOT=Path(__file__).resolve().parents[1]
meta=json.loads((ROOT/'config/plant-signal/project.json').read_text(encoding='utf-8'))
P=ROOT/'content/docs/en/sthdf'/meta['project_folder']
SITE=ROOT/'publishing/docusaurus';DOCS=SITE/'docs'
mapping={ROOT/'README.md':DOCS/'index.md'}
mapping.update({p:DOCS/'project'/p.relative_to(P) for p in P.rglob('*.md')})
mapping.update({p:DOCS/'knifes'/p.parent.name/'index.md' for p in ROOT.glob('content/docs/en/knifes/K-LOCAL-*/index.md')})
for source,name in [('docs/CONCEPT.en.md','concept.md'),('docs/PROJECT_BRIEF.sk.md','brief.sk.md'),('docs/TEMPLATE_MIGRATION.md','template-migration.md'),('models/README.md','models.md'),('LICENSE','license-code.md'),('LICENSE-DOCS','license-docs.md')]:mapping[ROOT/source]=DOCS/'reference'/name
for source,name in [('ARCHITECTURE.en.md','architecture.md'),('APP_FEATURES.en.md','mobile-app.md'),('WATERING_CONTROL.en.md','watering.md'),('SCOPE_CHANGELOG.en.md','scope-change-log.md')]:mapping[ROOT/'docs'/source]=DOCS/'reference'/name
mapping[ROOT/'docs/DESIGN_PREVIEW.en.md']=DOCS/'reference/design-preview.md'
mapping[ROOT/'models/v3/README.md']=DOCS/'reference/current-cad.md'
mapping[ROOT/'assets/product/generation-notes.md']=DOCS/'reference/visualization-provenance.md'
def rewrite(source,dest,target):
    if target.startswith(('https://','http://','mailto:','#')):return target
    filepart,sep,anchor=target.partition('#');path=(source.parent/filepart).resolve()
    assert path.is_relative_to(ROOT.resolve()),path
    if path in mapping:return os.path.relpath(mapping[path],dest.parent).replace('\\','/')+(sep+anchor if sep else '')
    rel=path.relative_to(ROOT).as_posix()
    if path.is_dir():return 'https://github.com/figaro112/plant-signal/tree/main/'+rel
    if path.suffix.lower()=='.md':return 'https://github.com/figaro112/plant-signal/blob/main/'+rel
    output=SITE/'static-plant-signal/project-files'/rel
    output.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,output)
    # Standalone HTML previews need a full page navigation, outside the docs router.
    return ('pathname://' if path.suffix.lower()=='.html' else '')+'/project-files/'+rel
for source,dest in mapping.items():
    text=source.read_text(encoding='utf-8')
    text=re.sub(r'(!?\[[^\]]*\]\()([^)]+)(\))',lambda m:m[1]+rewrite(source,dest,m[2])+m[3],text)
    if source==ROOT/'README.md':text='---\nid: home\ntitle: PlantSignal\nslug: /\nsidebar_position: 0\n---\n\n'+text
    if source.name in {'LICENSE','LICENSE-DOCS'}:text='# '+('Code license' if source.name=='LICENSE' else 'Documentation license')+'\n\n'+text
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(text,encoding='utf-8')
for folder in ['prototypes','models/v3','assets/app','assets/product']:
    shutil.copytree(ROOT/folder,SITE/'static-plant-signal/project-files'/folder,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
print(f'Staged {len(mapping)} project documents and local design previews; no deployment performed.')
