import json,hashlib,os
from pathlib import Path
root=Path('/home/gamedev/lunex-asset-library')
project=Path(__file__).resolve().parents[1]
p=project/'public/hero-asset-map.json'
m=json.loads(p.read_text())
c={a['id']:a for a in json.load(open(root/'data/index/catalog.json'))}
total=0
for model,x in m['models'].items():
 a=c[x['assetId']];assert a['source']=='queensblade'
 f=a['files'];out=project/'public/hero-models'/a['id'];out.mkdir(parents=True,exist_ok=True)
 for rel,h in [(f['binary'],a['skeleton_sha256']),*zip(f['textures'],a['texture_sha256']),(f['atlas'],None)]:
  src=root/rel
  if h:assert hashlib.sha256(src.read_bytes()).hexdigest()==h
  dst=out/src.name
  if not dst.exists():os.link(src,dst)
  assert dst.stat().st_ino==src.stat().st_ino
  total+=src.stat().st_size
 x['texture']=Path(f['textures'][0]).name
p.write_text(json.dumps(m,ensure_ascii=False,indent=2))
print('Linked',len(m['models']),'models;',total,'bytes, no duplicate source blocks')
