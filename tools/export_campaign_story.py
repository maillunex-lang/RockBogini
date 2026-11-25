#!/usr/bin/env python3
"""Export GuideNPCDialog + map guide locales into next-server/data/campaign-story.json."""
from __future__ import annotations
import json,zlib,base64,re
from pathlib import Path

ROOT=Path('/home/gamedev/rocbogini')

def read_varint(data:bytes,i:int):
 x=s=0
 while True:
  b=data[i]; i+=1; x|=(b&0x7f)<<s
  if not (b&0x80): return x,i
  s+=7

def decode_message(data:bytes):
 i=0; fields={}
 while i<len(data):
  key,i=read_varint(data,i); fn,wt=key>>3,key&7
  if wt==0:
   v,i=read_varint(data,i); fields.setdefault(fn,[]).append(v)
  elif wt==2:
   ln,i=read_varint(data,i); v=data[i:i+ln]; i+=ln; fields.setdefault(fn,[]).append(v)
  else:
   raise ValueError(f'unsupported wire {wt}')
 return fields

def load_table(path:Path):
 data=zlib.decompress(base64.b64decode(path.read_text().strip()))
 return [decode_message(b) for b in decode_message(data).get(1,[])]

def main():
 cfg=ROOT/'runtime/client/config/configure'
 dialogs_path=next(cfg.glob('*/GuideNPCDialog'))
 steps_path=next(cfg.glob('*/GuideStep'))
 dialogs=[{
  'id':int(f.get(1,[0])[0]),
  'infoKeys':[x.decode() for x in f.get(2,[])],
  'audioKeys':[int(x) for x in f.get(3,[])],
  'npcKeys':[int(x) for x in f.get(4,[])],
 } for f in load_table(dialogs_path)]
 steps=[{
  'id':int(f.get(1,[0])[0]),
  'type':[int(x) for x in f.get(2,[])],
  'autoNextStep':int(f.get(3,[0])[0]) if f.get(3) else 0,
 } for f in load_table(steps_path)]
 en={x['key']:x['text'] for x in json.loads((ROOT/'localization/en.json').read_text())}
 ru={x['key']:x['text'] for x in json.loads((ROOT/'localization/ru.json').read_text())}
 def loc(key:str)->str:
  r=ru.get(key); e=en.get(key)
  return (r if r and r.strip() else None) or e or ''
 chapters=json.loads((ROOT/'next-server/data/campaign-chapters.json').read_text())
 map_ids=set()
 for c in chapters['chapters']: map_ids.update(c['mapIds'])
 map_ids.update(chapters.get('orphanMapIds') or [])
 by_map={}
 for mid in sorted(map_ids):
  key=f'locale_ui_guide_{mid}'
  text=loc(key)
  if text:
   by_map[str(mid)]=[{'key':key,'infoKey':f'guide_{mid}','text':text}]
 resolved=[]
 for d in dialogs:
  lines=[]
  for ik in d['infoKeys']:
   key='locale_ui_'+ik
   text=loc(key)
   if text:
    lines.append({'key':key,'infoKey':ik,'text':text,'npc':d['npcKeys'][0] if d['npcKeys'] else 0})
  resolved.append({**d,'lines':lines})
 story_chapters=[]
 for k,title in sorted(((k,v) for k,v in en.items() if k.startswith('StoryChapter_title_')), key=lambda x:int(x[0].rsplit('_',1)[-1])):
  sid=int(k.rsplit('_',1)[-1])
  story_chapters.append({
   'id':sid,
   'title':loc(f'StoryChapter_title_{sid}') or title,
   'content':loc(f'StoryChapter_content_{sid}') or en.get(f'StoryChapter_content_{sid}',''),
  })
 out={
  'source':{
   'guideNPCDialog':str(dialogs_path.relative_to(ROOT)),
   'guideStep':str(steps_path.relative_to(ROOT)),
   'localeRu':'localization/ru.json',
   'localeEn':'localization/en.json',
  },
  'mapGuides':by_map,
  'guideNpcDialogs':resolved,
  'guideSteps':steps,
  'storyChapters':story_chapters,
  'stats':{
   'mapGuides':len(by_map),
   'dialogs':len(resolved),
   'dialogsWithText':sum(1 for d in resolved if d['lines']),
   'steps':len(steps),
   'storyChapters':len(story_chapters),
  },
  'exportedAt':'2026-11-25T00:00:00Z',
 }
 dest=ROOT/'next-server/data/campaign-story.json'
 dest.write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
 print(json.dumps(out['stats'],ensure_ascii=False))

if __name__=='__main__':
 main()
