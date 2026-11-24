import json,collections,hashlib,os
from pathlib import Path
p=Path(__file__).resolve().parents[1];root=Path('/home/gamedev/lunex-asset-library')
original=p.parent/'runtime/client/G123Live/Queen-Blade/assets'
timeline=json.loads((p/'public/hero-animation-timelines.json').read_text())
valid={a['id']:a for l in (root/'data/reports/full-runtime-merged.jsonl').open() if (a:=json.loads(l)).get('ok')}
catalog=[a for a in json.loads((root/'data/index/catalog.json').read_text()) if a['source']=='queensblade' and a['id'] in valid]
bybundle=collections.defaultdict(list)
for a in catalog:bybundle[a['bundle']].append(a)
assets={};models={};counts=collections.Counter()
for m,v in timeline.items():
 b=v['BundleName'];configs=list((original/b).glob('config*.json'))
 deps=json.loads(configs[0].read_text()).get('deps',[]) if len(configs)==1 else []
 candidates=[a for bundle in [b,*deps] if bundle!='internal' for a in bybundle[bundle] if 'effect' in a['display_name'].lower() and 'buff' not in a['display_name'].lower()]
 names={e['ActionName'] for s in v['Skills'] for e in s['Events'] if e['EventType'] in [2,6,7,8] and e['ActionName']}
 mapping={}
 for n in sorted(names):
  matches={a['id']:a for a in candidates if n in valid[a['id']]['animations']}
  if len(matches)!=1:
   counts['ambiguous' if matches else 'missing']+=1;mapping[n]={'status':'ambiguous' if matches else 'missing','candidates':list(matches)};continue
  a=next(iter(matches.values()));f=a['files']
  if len(f['textures'])!=1:counts['multi_texture']+=1;mapping[n]={'status':'multi_texture','candidates':[a['id']]};continue
  out=p/'public/skill-effects'/a['id'];out.mkdir(parents=True,exist_ok=True)
  for rel,h in [(f['binary'],a['skeleton_sha256']),*zip(f['textures'],a['texture_sha256']),(f['atlas'],None)]:
   src=root/rel
   if h:assert hashlib.sha256(src.read_bytes()).hexdigest()==h
   dst=out/src.name
   if not dst.exists():os.link(src,dst)
   assert dst.stat().st_ino==src.stat().st_ino
  assets[a['id']]={'id':a['id'],'name':a['display_name'],'texture':Path(f['textures'][0]).name,'animations':valid[a['id']]['animations']}
  mapping[n]={'status':'matched','assetId':a['id']};counts['matched']+=1
 models[m]={'bundle':b,'effects':mapping}
result={'summary':dict(counts),'assets':assets,'models':models}
(p/'public/skill-effect-map.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
print(dict(counts),'unique assets',len(assets))
