import json,hashlib,shutil
from pathlib import Path
root=Path('/home/gamedev/lunex-asset-library')
project=Path(__file__).resolve().parents[1]
rows=json.loads((root/'data/index/catalog.json').read_text())
a=next(x for x in rows if x['source']=='queensblade' and x['display_name']=='Culot1401_Avatar')
out=project/'public/library/culot1401'
out.mkdir(parents=True,exist_ok=True)
for rel,expected in [(a['files']['binary'],a['skeleton_sha256']),*zip(a['files']['textures'],a['texture_sha256'])]:
 p=root/rel
 assert hashlib.sha256(p.read_bytes()).hexdigest()==expected
 shutil.copyfile(p,out/p.name)
p=root/a['files']['atlas']; shutil.copyfile(p,out/p.name)
(out/'manifest.json').write_text(json.dumps({k:a[k] for k in ('id','source','display_name','runtime','skeleton_sha256','texture_sha256')},indent=2)+'\n')
print('Imported verified hashes',a['id'])
