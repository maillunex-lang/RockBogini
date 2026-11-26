"""NEXT-026.3 20-slice source asset extractor: exact Cocos assets only; no synthetic textures."""
from pathlib import Path
from PIL import Image
import json, uuid, hashlib, shutil
ROOT=Path('/home/gamedev/QueensBladeH5/racon2-main/client/G123Live/Queen-Blade/assets')
DEST=Path('pixi-client/public/original-panels')
ALPH='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
evidence=[]
def dec(u):
    if len(u)!=22:return u
    return u[:2]+''.join(f'{(ALPH.index(u[i])<<6|ALPH.index(u[i+1])):03x}' for i in range(2,22,2))
def config(bundle):
    return json.loads(next((ROOT/bundle).glob('config.*.json')).read_text())
def file_by_name(bundle,name):
    cfg=config(bundle)
    rows=[(i,v) for i,v in cfg['paths'].items() if v[0]==name and len(v)>1 and v[1] in [1,2] and len(v)==2]
    if len(rows)!=1:raise RuntimeError(f'{bundle}/{name}: {rows}')
    h=dec(cfg['uuids'][int(rows[0][0])])
    files=list((ROOT/bundle/'native'/h[:2]).glob(str(uuid.UUID(h))+'*.webp'))
    if len(files)!=1:raise RuntimeError(f'{bundle}/{name}: {files}')
    return files[0]
def record(bundle,name,source,dest,kind):
    sha=hashlib.sha256(dest.read_bytes()).hexdigest()
    evidence.append(dict(bundle=bundle,name=name,source=str(source.relative_to(ROOT)),dest=str(dest),kind=kind,sha256=sha,size=Image.open(dest).size))
    assert Image.open(dest).width>0
def copy(bundle,name,out):
    src=file_by_name(bundle,name);dest=DEST/out;dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(src,dest)
    assert src.read_bytes()==dest.read_bytes()
    record(bundle,name,src,dest,'exact-native-copy')
def atlas(bundle,filename,required,outdir):
    doc=ROOT/bundle/'import'/filename
    j=json.loads(doc.read_text())
    uid=j[1][0];h=dec(uid)
    source=next((ROOT/bundle/'native'/h[:2]).glob(str(uuid.UUID(h))+'*.webp'))
    texture=Image.open(source)
    result={}
    for row in j[-1]:
        try:meta=row[0][0]
        except (TypeError,IndexError):continue
        if not isinstance(meta,dict) or meta.get('name') not in required:continue
        name=meta['name'];x,y,w,height=meta['rect'];rot=meta.get('rotated',False)
        tile=texture.crop((x,y,x+(height if rot else w),y+(w if rot else height)))
        if rot:tile=tile.transpose(Image.Transpose.ROTATE_90)
        dest=DEST/outdir/(name.strip().replace(' ','_')+'.png')
        dest.parent.mkdir(parents=True,exist_ok=True);tile.save(dest)
        record(bundle,name,source,dest,'original-atlas-crop')
        result[name]=str(dest)
    assert set(result)==set(required),(bundle,set(required)-set(result))
    return result
# 01 original WorldMapPanel source metadata, 02 original map1/map2 extraction
for name in ['PNG/map1','PNG/map2']:
    copy('WorldMapPanel',name,Path('campaign')/(name.split('/')[-1]+'.webp'))
# 05 original BagPanel sprite, 06 background copy
copy('BagPanel','Bg',Path('inventory/BagBg.webp'))
# 09 original SummonHeroPanel atlas metadata, 10 extract original source buttons
atlas('SummonHeroPanel','04/046d0bf54.22b06.json',
      ['toggle_oracle','InfiniteTenTog','DailySummonBtn ','SummonBtn'],Path('summon'))
# 13 original ShopPanel atlas metadata, 14 extract original button art
atlas('ShopPanel','06/067632346.16edd.json',
      [f'btn_toplevel_{i}' for i in range(1,5)],Path('shop'))
# Original ShopPanel girl texture via explicit named source
copy('ShopPanel','girl',Path('shop/ShopGirl.webp'))
# 17 original TaskPanel atlas metadata, 18 original task sprites
atlas('TaskPanel','0e/0ea0d3876.bfce2.json',
      ['box_3_mask','bg_2','badge_1','badge_2','box_1','box_2','box_1_mask','box_3','bg_1'],Path('tasks'))
path=Path('reports/NEXT-026.3-asset-manifest.json')
path.write_text(json.dumps({'original_source':str(ROOT),'count':len(evidence),'assets':evidence},
                          ensure_ascii=False,indent=2)+'\n')
print('source assets:',len(evidence))
for e in evidence:print(e['bundle'],e['name'],e['size'],e['sha256'][:12])
