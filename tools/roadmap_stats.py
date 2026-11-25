#!/usr/bin/env python3
"""Print NEXT-* status counts from docs/roadmap.json."""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'docs'/'roadmap.json').read_text())
counts={}
def walk(o):
  if isinstance(o,dict):
    i=o.get('id')
    if isinstance(i,str) and i.startswith('NEXT-') and i.count('-')==1:
      counts[o.get('status','pending')]=counts.get(o.get('status','pending'),0)+1
    for v in o.values(): walk(v)
  elif isinstance(o,list):
    for v in o: walk(v)
walk(data)
total=sum(counts.values())
print(f"{counts.get('done',0)} из {total} основных этапов закрыты, {counts.get('in_progress',0)} в работе, {counts.get('deferred',0)} отложен, {counts.get('pending',0)} ожидают.")
