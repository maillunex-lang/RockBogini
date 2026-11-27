#!/usr/bin/env python3
"""Byte-accurate parser of original Cocos CDN ItemPiece protobuf configuration.
Only fields defined by the original ConfigProto are exported; no inferred rewards.
"""
from pathlib import Path
import base64,zlib,json,hashlib,collections
root=Path(__file__).resolve().parents[1]
source=next(Path('/home/gamedev/QueensBladeH5/racon2-main/client/config/configure').glob('*/ItemConsume'))
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
out={}
for f,k,r in wire(blob):
 row={'id':0,'subType':0,'summonType':0,'param':[],'showLib':[]}
 for fld,kind,v in wire(r):
  if fld in (1,2,9) and kind==0:row[{1:'id',2:'subType',9:'summonType'}[fld]]=v
  elif fld in (3,10) and kind==2:
   arr=[]
   for af,ak,av in wire(v):
    if af==1 and ak==0:arr.append(av)
    elif af==1 and ak==2:
     pos=0
     while pos<len(av):num,pos=varint(av,pos);arr.append(num)
   row['param' if fld==3 else 'showLib'].append(arr)
 out[str(row['id'])]=row
(root/'next-server/data/item-consume-original.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print('SOURCE',len(out),collections.Counter(r['subType'] for r in out.values()))
for t in (2,5,6,7):
 a=[r for r in out.values() if r['subType']==t];print(t,len(a),a[:1])

for name,scalar,arrays in [('CardSummonType',{1:'id'},{3:'libs'}),('CardRandomLib',{1:'id',3:'startChance'},{8:'randomLib'})]:
 source=next(Path('/home/gamedev/QueensBladeH5/racon2-main/client/config/configure').glob('*/'+name))
 result={}
 for f,k,r in wire(zlib.decompress(base64.b64decode(source.read_text().strip()))):
  row={v:0 for v in scalar.values()}
  row.update({v:[] for v in arrays.values()})
  for fld,kind,v in wire(r):
   if fld in scalar and kind==0:row[scalar[fld]]=v
   elif fld in arrays and kind==2:
    arr=[]
    for af,ak,av in wire(v):
     if af==1 and ak==0:arr.append(av)
     elif af==1 and ak==2:
      pos=0
      while pos<len(av):num,pos=varint(av,pos);arr.append(num)
    row[arrays[fld]].append(arr)
  result[str(row['id'])]=row
 (root/('next-server/data/box-'+name+'.json')).write_text(json.dumps(result,separators=(',',':'))+'\n')
 print(name,len(result))
