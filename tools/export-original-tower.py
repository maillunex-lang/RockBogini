#!/usr/bin/env python3
"""Export original TestTowerType, MapTestTower and tower MapBase protobuf configs.

Original sources are read-only. Fields follow Racon.Pb.ConfigProto; no invented
floors, drops, enemies or combat bonuses. Deterministic output.
"""
from pathlib import Path
import base64
import hashlib
import json
import zlib

ROOT=Path(__file__).resolve().parents[1]
SOURCES=Path('/home/gamedev/QueensBladeH5/racon2-main/client/config/configure')

def varint(data:bytes,index:int):
    value=0
    shift=0
    while index<len(data):
        octet=data[index]
        index+=1
        value|=(octet&127)<<shift
        if octet<128:
            return value,index
        shift+=7
        if shift>70:
            raise ValueError('invalid protobuf varint')
    raise ValueError('truncated protobuf varint')

def wire(data:bytes):
    index=0
    while index<len(data):
        key,index=varint(data,index)
        field,kind=key>>3,key&7
        if kind==0:
            value,index=varint(data,index)
        elif kind==2:
            count,index=varint(data,index)
            value=data[index:index+count]
            index+=count
        elif kind in (1,5):
            count=8 if kind==1 else 4
            value=data[index:index+count]
            index+=count
        else:
            raise ValueError(f'protobuf wire type {kind}')
        yield field,kind,value

def packed_ints(data:bytes):
    values=[]
    for field,kind,value in wire(data):
        if field!=1:
            continue
        if kind==0:
            values.append(value)
        elif kind==2:
            at=0
            while at<len(value):
                number,at=varint(value,at)
                values.append(number)
    return values

def scalar_int(value:int):
    # protobuf int64 uses 2s-complement, not zigzag
    return value-(1<<64) if value >= (1<<63) else value

def read_rows(name:str):
    path=next(SOURCES.glob('*/'+name))
    decoded=zlib.decompress(base64.b64decode(path.read_bytes()))
    rows=[value for f,k,value in wire(decoded) if f==1 and k==2]
    return path,rows

def export(name:str,scalar:dict[int,str],arrays:dict[int,str],flat:dict[int,str],signed=False):
    path,rows=read_rows(name)
    result={}
    for b in rows:
        rec={key:0 for key in scalar.values()}
        rec.update({key:[] for key in arrays.values()})
        rec.update({key:[] for key in flat.values()})
        for field,kind,value in wire(b):
            if kind==0 and field in scalar:
                rec[scalar[field]]=scalar_int(value) if signed else value
            elif field in arrays and kind==2:
                values=packed_ints(value)
                rec[arrays[field]].append([scalar_int(x) for x in values] if signed else values)
            elif field in flat:
                if kind==0:
                    rec[flat[field]].append(value)
                elif kind==2:
                    pos=0
                    while pos<len(value):
                        number,pos=varint(value,pos)
                        rec[flat[field]].append(number)
        if rec['id']:
            result[str(rec['id'])]=rec
    assert len(result)==len(rows),(name,len(rows),len(result))
    return path,result

type_path,types=export('TestTowerType',{1:'id',3:'mapIdPrefix',4:'rankId',5:'maxCount',7:'maxRewardCount'},{},{2:'openTime'})
floor_path,floors=export('MapTestTower',{1:'id',3:'isKeyNode',7:'quickBattlePower',9:'distance'},{4:'firstClearRewards',6:'dailyRewards',8:'extraRewards'},{})
map_path,all_maps=export('MapBase',{1:'id',3:'type',7:'battlePower',9:'isBoss'},{6:'attributeAddon',12:'heroes'},{10:'strength'},signed=True)

# MapBase.Bg is a string field, unlike other scalar fields.
_,raw_maps=read_rows('MapBase')
for data in raw_maps:
    row_id=0
    bg=''
    for field,kind,value in wire(data):
        if field==1 and kind==0:
            row_id=value
        if field==4 and kind==2:
            bg=value.decode('utf-8','replace')
    if str(row_id) in all_maps:
        all_maps[str(row_id)]['bg']=bg

maps={}
for cfg in types.values():
    for index in range(1,cfg['maxCount']+1):
        key=str(cfg['mapIdPrefix']+index)
        if key in all_maps:
            maps[key]=all_maps[key]

assert len(types)==12 and len(floors)==17000
assert '99' in types and '200001' in floors and '200001' in maps
assert len(maps)==17000,(len(maps),'tower MapBase coverage')
for name,data in [('tower-types.json',types),('tower-maps.json',floors),('tower-map-base.json',maps)]:
    (ROOT/'next-server/data'/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')

audit={
    'sources':{str(path):hashlib.sha256(path.read_bytes()).hexdigest() for path in [type_path,floor_path,map_path]},
    'towerTypes':len(types),
    'towerFloors':len(floors),
    'towerMapBase':len(maps),
    'normal':types['99'],
    'firstNormalFloor':floors['200001'],
    'typeList':list(map(int,types.keys())),
}
(ROOT/'reports/NEXT-021.1-source-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print(f'Extracted {len(types)} tower types, {len(floors)} reward floors and {len(maps)} enemy maps.')
