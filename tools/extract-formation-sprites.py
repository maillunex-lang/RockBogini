#!/usr/bin/env python3
"""Source-correct BattleFormationPanel original art, unchanged pixel crops."""
from pathlib import Path
from PIL import Image
import json,shutil,hashlib
root=Path(__file__).resolve().parents[1]
source=Path('/home/gamedev/QueensBladeH5/racon2-main/client/G123Live/Queen-Blade/assets/BattleFormationPanel')
dest=root/'pixi-client/public/heroes/original/formation'
dest.mkdir(parents=True,exist_ok=True)
bg=source/'native/4f/4f744a00-0479-491c-a11a-5371184cc899.83f3a.webp'
shutil.copyfile(bg,dest/'Bg.webp')
atlas=source/'native/65/65662e0b-35b9-4bb8-bec1-f7be2657d2cf.edb16.webp'
im=Image.open(atlas)
sprites={}
for f in (source/'import').rglob('*.json'):
 try:j=json.loads(f.read_text())
 except:continue
 def visit(v):
  if isinstance(v,dict):
   if isinstance(v.get('rect'),list) and isinstance(v.get('name'),str):
    if v['name'] in ('vs','rewardBg','btn1','btn2','formation_off','formation_blue','formation_on','formation_purple'):
     sprites[v['name']]=v['rect']
   for child in v.values():visit(child)
  elif isinstance(v,list):
   for child in v:visit(child)
 visit(j)
for name,(x,y,w,h) in sprites.items():im.crop((x,y,x+w,y+h)).save(dest/(name+'.png'))
assert len(sprites)==8, sprites.keys()
manifest={'originalBackground':{'path':str(bg.relative_to(source)),'sha256':hashlib.sha256(bg.read_bytes()).hexdigest(),'dimensions':[1080,2520]},
          'originalAtlas':str(atlas.relative_to(source)),'sprites':sprites}
(root/'reports/NEXT-026.4-formation-assets.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('EXPORTED original formation background and',len(sprites),'sprite frames')
