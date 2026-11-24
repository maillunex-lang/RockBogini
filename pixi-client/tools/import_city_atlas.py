import json,pathlib,hashlib
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[2]
b=root/'runtime/client/G123Live/Queen-Blade/assets/MainPanel'
f=next(b.glob('native/d3/d3cbc94b*.webp'));sha=hashlib.sha256(f.read_bytes()).hexdigest()
lib=pathlib.Path('/home/gamedev/lunex-asset-library')
idx=json.loads((lib/'data/reports/supplemental-index.json').read_text())
src=lib/next(x['path'] for x in idx if x['sha256']==sha)
assert hashlib.sha256(src.read_bytes()).hexdigest()==sha
im=Image.open(src);out=root/'pixi-client/public/city/icons';out.mkdir(exist_ok=True);names={}
for p in b.glob('import/**/*.json'):
 try:x=json.loads(p.read_text())
 except:continue
 if not isinstance(x,list) or len(x)!=6 or not isinstance(x[1],list) or 'd3y8lLs3FC17vj83tHFPtB' not in x[1]:continue
 def walk(v):
  if isinstance(v,dict) and 'rect' in v and 'name' in v:names[v['name']]=v
  elif isinstance(v,list):
   for a in v:walk(a)
 walk(x[5])
for n,v in names.items():
 x,y,w,h=v['rect'];assert x+w<=im.width and y+h<=im.height;assert not v.get('rotated');im.crop((x,y,x+w,y+h)).save(out/(n+'.webp'),lossless=True)
(out/'atlas.json').write_text(json.dumps({'sha256':sha,'sprites':names},indent=2))
print('Extracted',len(names),'sprites')
