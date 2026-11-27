#!/usr/bin/env python3
"""Read original PioneeringAchievement Cocos CDN protobuf fields as documented in ConfigProto.pb.ex.
No inferred rewards, levels or task text. Source is read-only.
"""
from pathlib import Path
import json,base64,zlib,hashlib,collections
root=Path(__file__).resolve().parents[1]
sources=Path('/home/gamedev/QueensBladeH5/racon2-main/client/config/configure')
def vi(blob,at):
 n=0;shift=0
 while True:
  octet=blob[at];at+=1
  n|=(octet&127)<<shift
  if octet<128:return n,at
  shift+=7
  if shift>70:raise ValueError('bad varint')
def wire(blob):
 at=0
 while at<len(blob):
  key,at=vi(blob,at);field=key>>3;kind=key&7
  if kind==0:val,at=vi(blob,at)
  elif kind==2:sz,at=vi(blob,at);val=blob[at:at+sz];at+=sz
  elif kind==5:val=blob[at:at+4];at+=4
  elif kind==1:val=blob[at:at+8];at+=8
  else:raise ValueError('unsupported')
  yield field,kind,val
def int_array(blob):
 out=[]
 for f,k,v in wire(blob):
  if f!=1:continue
  if k==0:out.append(v)
  if k==2:
   at=0
   while at<len(v):n,at=vi(v,at);out.append(n)
 return out
def rows(name):
 path=next(sources.glob('*/'+name))
 blob=zlib.decompress(base64.b64decode(path.read_text().strip()))
 return path,[v for f,k,v in wire(blob) if f==1 and k==2]
path,raw=rows('PioneeringAchievement')
out={}
for b in raw:
 r={'id':0,'params':[],'uniqueReward':[],'rewardsForAll':[],'sortId':0}
 for f,k,v in wire(b):
  if f in [1,8] and k==0:r['id' if f==1 else 'sortId']=v
  elif f==7:
   if k==0:r['params'].append(v)
   if k==2:
    at=0
    while at<len(v):n,at=vi(v,at);r['params'].append(n)
  elif f in [4,6] and k==2:r['uniqueReward' if f==4 else 'rewardsForAll'].append(int_array(v))
 assert r['id']>0
 out[str(r['id'])]=r
assert len(out)==len(raw)
(root/'next-server/data/pioneering-achievements.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
news,rawnew=rows('NewbieMainTask')
newbie={}
for b in rawnew:
 r={}
 for f,k,v in wire(b):
  if k==0 and f in [1,2,4]:r[{1:'id',2:'taskId',4:'sortId'}[f]]=v
 if r.get('id'):newbie[str(r['id'])]=r
(root/'next-server/data/newbie-main-task.json').write_text(json.dumps(newbie,ensure_ascii=False,separators=(',',':'))+'\n')
report={'source':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'count':len(out),'byType':dict(collections.Counter(r['params'][0] if r['params'] else 0 for r in out.values())),'newbieMainTask':len(newbie),'examples':list(out.values())[:5]}
(root/'reports/NEXT-020.2-source-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))

# NewbieMainTask's 26 TaskIds point into original TaskBase, not into Daily Task list.
taskpath, taskraw=rows('TaskBase')
task={}
for b in taskraw:
 r={'id':0,'type':0,'condition':[],'totalCount':0,'point':0,'startProgress':0,'sortId':0,'rewards':[]}
 for f,k,v in wire(b):
  if k==0 and f in (1,2,6,9,10,12):
   r[{1:'id',2:'type',6:'totalCount',9:'point',10:'startProgress',12:'sortId'}[f]]=v
  elif f==5:
   if k==0:r['condition'].append(v)
   elif k==2:
    at=0
    while at<len(v):n,at=vi(v,at);r['condition'].append(n)
  elif f==13 and k==2:r['rewards'].append(int_array(v))
 if r['id']:task[str(r['id'])]=r
order=sorted(newbie.values(),key=lambda r:(r.get('sortId',0),r['id']))
main={}
for r in order:
 t=task.get(str(r['taskId']))
 assert t and t['type']==1,(r,t)
 main[str(t['id'])]={**t,'newbieSortId':r['sortId'],'newbieId':r['id']}
assert len(main)==len(newbie)==26
(root/'next-server/data/newbie-main-task-conditions.json').write_text(json.dumps(main,ensure_ascii=False,separators=(',',':'))+'\n')
report['taskBaseSource']=str(taskpath)
report['taskBaseCount']=len(task)
report['newbieResolved']=len(main)
report['newbieConditions']=dict(collections.Counter((r['condition'][0] if r['condition'] else 0) for r in main.values()))
report['newbieExamples']=list(main.values())[:5]
(root/'reports/NEXT-020.2-source-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Resolved TaskBase conditions:',len(main),'of',len(task),'newbie condition counts',report['newbieConditions'])
