import json,hashlib,shutil
from pathlib import Path
root=Path('/home/gamedev/lunex-asset-library/data')
project=Path(__file__).resolve().parents[1]
rows=json.loads((root/'index/catalog.json').read_text())
valid={x['id']:x for l in (root/'reports/full-runtime-merged.jsonl').open() if (x:=json.loads(l)).get('ok')}
selected=[]; seen=set()
for a in rows:
 n=a['display_name']; v=valid.get(a['id'],{})
 if a['source']!='queensblade' or not n.endswith('_Avatar') or '_Skin' in n or not {'attack','hurt','standby'}.issubset(v.get('animations',[])) or len(a['files']['textures'])!=1 or n in seen:continue
 seen.add(n); out=project/'public/squad'/a['id']; out.mkdir(parents=True,exist_ok=True)
 for rel,h in [(a['files']['binary'],a['skeleton_sha256']),*zip(a['files']['textures'],a['texture_sha256'])]:
  p=root.parent/rel; assert hashlib.sha256(p.read_bytes()).hexdigest()==h; shutil.copyfile(p,out/p.name)
 p=root.parent/a['files']['atlas']; shutil.copyfile(p,out/p.name)
 selected.append(dict(id=a['id'],name=n,texture=Path(a['files']['textures'][0]).name,animations=v['animations']))
 if len(selected)==10:break
assert len(selected)==10
(project/'public/squad/manifest.json').write_text(json.dumps(selected,indent=2))
print('Imported',len(selected),'previously decoded avatars')
