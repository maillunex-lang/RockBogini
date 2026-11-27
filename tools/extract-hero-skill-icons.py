#!/usr/bin/env python3
"""Extract only originally named SkillIcon textures referenced by the 354-hero catalog."""
from pathlib import Path
import json,shutil,hashlib,uuid
project=Path(__file__).resolve().parents[1]
source=Path('/home/gamedev/QueensBladeH5/racon2-main/client/G123Live/Queen-Blade/assets/SkillIcon')
catalog=json.loads((project/'next-server/src/heroCatalog.ts').read_text().split(' = ',1)[1].strip().rstrip(';'))
original=json.loads(next(source.glob('config.*.json')).read_text())
names={}
for key,val in original['paths'].items():
    if len(val)>1 and val[1]==0 and val[0].isdigit():
        names.setdefault(int(val[0]),original['uuids'][int(key)])
ids=set()
for hero in catalog:
    for typ in ('Skills','ExtraSkills'):
        for item in hero.get(typ,[]):
            if isinstance(item,dict):
                ids.update(x for x in item.get('Items',[]) if isinstance(x,int) and x>0)
            elif isinstance(item,int) and item>0:ids.add(item)
alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
def expand(compact):
    if len(compact)!=22:return compact
    return compact[:2]+''.join(f'{(alphabet.index(compact[i])<<6|alphabet.index(compact[i+1])):03x}' for i in range(2,22,2))
dst=project/'pixi-client/public/skill-icons';dst.mkdir(exist_ok=True,parents=True)
manifest={}
for sid in sorted(ids&set(names)):
    h=expand(names[sid])
    matches=list((source/'native'/h[:2]).glob(str(uuid.UUID(h))+'*.webp'))
    if len(matches)!=1:continue
    src=matches[0];data=src.read_bytes();out=dst/f'{sid}.webp'
    if not out.exists() or out.read_bytes()!=data:out.write_bytes(data)
    manifest[str(sid)]={'sha256':hashlib.sha256(data).hexdigest(),'source':str(src.relative_to(source))}
out=project/'pixi-client/src/heroes/availableSkillIcons.json'
out.write_text(json.dumps(list(map(int,manifest.keys())),separators=(',',':'))+'\n')
report=project/'reports/NEXT-026.4-skill-icons.json'
report.write_text(json.dumps({'heroCatalogCount':len(catalog),'catalogSkillIds':len(ids),'originalSourceSkillIds':len(names),'imported':len(manifest),'originalFiles':manifest},ensure_ascii=False,indent=2)+'\n')
print('HEROES',len(catalog),'SKILL_IDS',len(ids),'MATCH',len(ids&set(names)),'COPIED',len(manifest))
