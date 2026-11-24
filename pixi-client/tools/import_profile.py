import json,base64,pathlib,re,hashlib,shutil
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[2]
bundle=root/'runtime/client/G123Live/Queen-Blade/assets/UserInfo'
d=json.loads(next(bundle.glob('config.*.json')).read_text())
out=root/'pixi-client/public/profile'
lib=pathlib.Path('/home/gamedev/lunex-asset-library')
index={x['sha256']:x for x in json.loads((lib/'data/reports/supplemental-index.json').read_text()) if x['kind']=='image'}
records=[]
for k,v in d['paths'].items():
 if v[1]!=1 or not re.fullmatch(r'(Icon|Frame)/\d+',v[0]):continue
 u=d['uuids'][int(k)];h=u[:2]+base64.b64decode(u[2:]).hex() if len(u)==22 else u.replace('-','')
 u=f'{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}'
 files=list((bundle/'native'/u[:2]).glob(u+'*.webp'))+list((bundle/'native'/u[:2]).glob(u+'*.png'))
 if not files:continue
 f=files[0];sha=hashlib.sha256(f.read_bytes()).hexdigest();source='original'
 if sha in index:
  candidate=lib/index[sha]['path']
  if candidate.is_file() and hashlib.sha256(candidate.read_bytes()).hexdigest()==sha:f=candidate;source='library'
 kind,id=v[0].split('/');name=kind.lower()+'-'+id+'.webp'
 with Image.open(f) as im:im.convert('RGBA').save(out/name,'WEBP',lossless=True)
 records.append({'kind':kind.lower(),'id':int(id),'file':name,'source':source,'sha256':sha})
(out/'manifest.json').write_text(json.dumps(records))
print('imported',len(records),'library',sum(r['source']=='library' for r in records),'default',any(r['id']==11303 for r in records),'frame',any(r['id']==3101 for r in records))
