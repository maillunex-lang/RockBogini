import json, collections
from pathlib import Path
project=Path(__file__).resolve().parents[2]
root=Path('/home/gamedev/lunex-asset-library/data')
data=json.loads((project/'next-audit/hero-catalog.json').read_text())
catalog=json.loads((root/'index/catalog.json').read_text())
valid={x['id']:x for l in (root/'reports/full-runtime-merged.jsonl').open() if (x:=json.loads(l)).get('ok')}
byname=collections.defaultdict(list)
for a in catalog:
 if a['source']=='queensblade':byname[a['display_name'].lower()].append(a)
models={}
for m in sorted({h['Model'] for h in data['HeroBase'] if h['Model']}):
 candidates=[]
 for n in [m+'_Avatar','Hero_'+m+'_Avatar',m,'Boss_'+m,'Boss_'+m+'_Avatar','Angel_'+m+'_Avatar']:
  candidates.extend(byname[n.lower()])
 candidates=list({a['id']:a for a in candidates}.values())
 verified=[a for a in candidates if a['id'] in valid]
 models[m]={'candidates':[{'id':a['id'],'name':a['display_name'],'animations':valid[a['id']]['animations'],'textures':len(a['files']['textures'])} for a in verified],'status':'matched' if len(verified)==1 else 'ambiguous' if verified else 'missing'}
heroes=[{'id':h['Id'],'type':h['Type'],'model':h['Model'],'avatar':h['UIAvatar'],'normal':h['NormalAttackId'],'skills':h['Skills'],'extraSkills':h['ExtraSkills'],'status':models.get(h['Model'],{}).get('status','missing')} for h in data['HeroBase']]
summary={'heroes':len(heroes),'models':len(models),'model_status':dict(collections.Counter(x['status'] for x in models.values())),'hero_status':dict(collections.Counter(x['status'] for x in heroes))}
(project/'reports/NEXT-010-hero-assets.json').write_text(json.dumps({'summary':summary,'models':models,'heroes':heroes},ensure_ascii=False,indent=2))
print(json.dumps(summary));print('missing:',[m for m,x in models.items() if x['status']=='missing'])
