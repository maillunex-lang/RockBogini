import json,base64,uuid,os,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
src=root/'runtime/client/G123Live/Queen-Blade/assets'
out=root/'pixi-client/public/battle-sounds';out.mkdir(exist_ok=True)
models=json.load(open(root/'next-audit/hero-animations.json'))
models.update(json.load(open(root/'next-audit/common-skills.json'))['models'])
def decode(s):
 if len(s)==22:return str(uuid.UUID(hex=s[:2]+base64.b64decode(s[2:]+ '==').hex()))
 return s
mapping={};missing=[];count=0
for model,v in models.items():
 bundle=src/v['BundleName'];cfg=next(bundle.glob('config*.json'),None)
 clips={}
 bundles=[bundle]
 if cfg:bundles += [src/d for d in json.load(open(cfg))['deps'] if d!='internal']
 for bundle in bundles:
  cfg=next(bundle.glob('config*.json'),None)
  if not cfg:continue
  c=json.load(open(cfg));vers=dict(zip(c['versions']['native'][::2],c['versions']['native'][1::2]))
  for i,(path,t,*_) in c['paths'].items():
   if c['types'][t]!='cc.AudioClip':continue
   u=decode(c['uuids'][int(i)]);version=vers.get(int(i));files=list((bundle/'native'/u[:2]).glob(u+'.'+str(version)+'.*'))
   if len(files)!=1:continue
   f=files[0];name=hashlib.sha256(f.read_bytes()).hexdigest()+f.suffix;dest=out/name
   if not dest.exists():os.link(f,dest)
   clips.setdefault(path.rsplit('/',1)[-1],name)
 for s in v['Skills']:
  for e in s['Events']:
   if e['EventType']==5:
    count+=1
    if e['ActionName'] not in clips:missing.append((model,e['ActionName']))
 mapping[model]=clips
(out/'manifest.json').write_text(json.dumps(mapping,separators=(',',':')))
print('events',count,'matched',count-len(missing),'missing',len(missing),'files',len(list(out.iterdir()))-1,'unique missing',len(set(missing)))
