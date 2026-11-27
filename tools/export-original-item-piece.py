#!/usr/bin/env python3
"""Byte-accurate parser of original Cocos CDN ItemPiece protobuf configuration.
Only fields defined by the original ConfigProto are exported; no inferred rewards.
"""
from pathlib import Path
import base64,zlib,json,hashlib,collections
root=Path(__file__).resolve().parents[1]
source=next(Path('/home/gamedev/QueensBladeH5/racon2-main/client/config/configure').glob('*/ItemPiece'))
def varint(buf,at):
 value=0;shift=0
 while True:
  octet=buf[at];at+=1
  value|=(octet&127)<<shift
  if octet<128:return value,at
  shift+=7
  if shift>=70:raise ValueError('Malformed varint')
def wire(buf):
 at=0
 while at<len(buf):
  tag,at=varint(buf,at);kind=tag&7;field=tag>>3
  if kind==0:val,at=varint(buf,at)
  elif kind==2:sz,at=varint(buf,at);val=buf[at:at+sz];at+=sz
  elif kind==5:val=buf[at:at+4];at+=4
  elif kind==1:val=buf[at:at+8];at+=8
  else:raise ValueError('unsupported wire kind '+str(kind))
  yield field,kind,val
blob=zlib.decompress(base64.b64decode(source.read_text().strip()))
allrows=[]
for f,k,r in wire(blob):
 assert f==1 and k==2,(f,k)
 row={'Id':0,'RequireCount':0,'CardId':0,'SubType':0}
 for fld,kind,value in wire(r):
  if fld in (1,2,4,6,8) and kind==0:
   row[{1:'Id',2:'RequireCount',4:'CardId',6:'SummonType',8:'SubType'}[fld]]=value
  elif fld in (3,5) and kind==2:
   arr=[]
   for af,ak,av in wire(value):
    if af==1 and ak==0:arr.append(av)
    elif af==1 and ak==2:
     # packed repeated varints
     pos=0
     while pos<len(av):num,pos=varint(av,pos);arr.append(num)
   row.setdefault('ShowLib' if fld==3 else 'DecomposeItems',[]).append(arr)
 allrows.append(row)
assert len(allrows)>400
byid={str(row['Id']):row for row in allrows}
assert len(byid)==len(allrows)
out=root/'next-server/data/item-piece-original.json'
out.write_text(json.dumps(byid,ensure_ascii=False,separators=(',',':'))+'\n')
hero=[r for r in allrows if r['SubType']==1 and r['CardId']>0 and r['RequireCount']>0]
report={'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'records':len(allrows),'heroComposables':len(hero),'subtypes':dict(collections.Counter(r['SubType'] for r in allrows)),'heroExamples':hero[:8],'output':str(out.relative_to(root))}
(root/'reports/NEXT-015.3-item-piece-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Original ItemPiece records',len(allrows),'hero-piece recipes',len(hero),'subtypes',report['subtypes'])
