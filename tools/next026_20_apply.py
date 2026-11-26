"""NEXT-026.3 five source-based screen integrations; source-only textures and reversible CSS."""
from pathlib import Path
import json
root=Path('/home/gamedev/QueensBladeH5/racon2-main/client/G123Live/Queen-Blade/assets')
out=Path('reports/NEXT-026.3-source-audits.json')
screens=[
 ('campaign','WorldMapPanel','pixi-client/src/battle/campaign.css'),
 ('inventory','BagPanel','pixi-client/src/inventory/inventory.css'),
 ('summon','SummonHeroPanel','pixi-client/src/summon/summon.css'),
 ('shop','ShopPanel','pixi-client/src/shop/shop.css'),
 ('tasks','TaskPanel','pixi-client/src/tasks/tasks.css')]
audits=[]
for name,bundle,style in screens:
 cfg=json.loads(next((root/bundle).glob('config.*.json')).read_text())
 audits.append({'screen':name,'bundle':bundle,'prefab_names':[v[0] for v in cfg['paths'].values() if 'Panel' in v[0]],
 'original_paths_count':len(cfg['paths']),'source_config_file':next((root/bundle).glob('config.*.json')).name,
 'original_resources':[x['name'] for x in json.loads(Path('reports/NEXT-026.3-asset-manifest.json').read_text())['assets'] if x['bundle']==bundle]})
out.write_text(json.dumps(audits,ensure_ascii=False,indent=2)+'\n')
# Campaign original map1 and map2: only on corresponding two map sheets; no invented third map art.
p=Path('pixi-client/src/battle/CampaignScreen.tsx');s=p.read_text()
old='<div className="campaign-world-plane" style={{[\'--map-aspect\' as string]:`${mapBounds.w}/${mapBounds.h}`}}>'
new='<div className="campaign-world-plane" data-original-sheet={owningMaps.indexOf(owningMap)===0?"map1":owningMaps.indexOf(owningMap)===1?"map2":"none"} style={{[\'--map-aspect\' as string]:`${mapBounds.w}/${mapBounds.h}`}}>'
assert old in s
p.write_text(s.replace(old,new,1))
css={
'campaign':"""
/* NEXT-026.3.03 Cocos WorldMapPanel PNG/map1,map2 original texture;
   positions of current API nodes still need owner 1:1 comparison. */
.campaign-world-plane[data-original-sheet="map1"]{background:url('/original-panels/campaign/map1.webp') center/100% 100% no-repeat}
.campaign-world-plane[data-original-sheet="map2"]{background:url('/original-panels/campaign/map2.webp') center/100% 100% no-repeat}
.campaign-world-node{box-shadow:0 1px 5px #16131c88}
.campaign-world-map{background-color:#362f28}
@media(max-width:400px){.campaign-world-node{min-width:72px;max-width:100px;padding:5px 7px;font-size:11px}}
""",
'inventory':"""
/* NEXT-026.3.07 exact BagPanel/Bg texture 1080x2520; full-screen original panel art. */
.inventory-screen{background:#24151c url('/original-panels/inventory/BagBg.webp') center top/100% auto repeat-y}
.inventory-bag,.inventory-currencies{background:#140d1f77;padding:10px;border:1px solid #ccaf8259}
.inventory-screen .inventory-row{background-color:#261e29bc}
@media(max-width:400px){.inventory-screen{padding:10px}.inventory-screen h1{font-size:1.4rem}}
""",
'summon':"""
/* NEXT-026.3.11 original SummonHeroPanel atlas button art, four source frames. */
.summon-tabs[role="tablist"]{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
.summon-tabs[role="tablist"] button{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:3px;min-width:0;padding:6px 2px;font-size:clamp(9px,2.5vw,13px);line-height:1.2}
.summon-tabs[role="tablist"] button::before{content:"";display:block;width:min(100%,54px);height:54px;background-position:center;background-size:contain;background-repeat:no-repeat}
.summon-tabs[role="tablist"] button:nth-child(1)::before{background-image:url('/original-panels/summon/DailySummonBtn.png')}
.summon-tabs[role="tablist"] button:nth-child(2)::before{background-image:url('/original-panels/summon/SummonBtn.png')}
.summon-tabs[role="tablist"] button:nth-child(3)::before{background-image:url('/original-panels/summon/toggle_oracle.png')}
.summon-tabs[role="tablist"] button:nth-child(4)::before{background-image:url('/original-panels/summon/InfiniteTenTog.png')}
.summon-tabs[role="tablist"] button[aria-selected=true]{border-color:#f7d589}
@media(max-width:400px){.summon-screen{padding:8px}.summon-tabs[role="tablist"] button::before{height:40px;width:40px}}
""",
'shop':"""
/* NEXT-026.3.15 exact original ShopPanel button atlas and original girl overlay. */
.shop-screen{position:relative;isolation:isolate}
.shop-screen::before{content:"";position:absolute;right:0;top:65px;width:min(55%,270px);height:210px;pointer-events:none;opacity:.28;background:url('/original-panels/shop/ShopGirl.webp') center/contain no-repeat;z-index:-1}
.shop-types button{display:flex;align-items:center;gap:5px;min-width:0}
.shop-types button:nth-child(-n+4)::before{content:"";display:block;width:30px;height:34px;flex:none;background-size:contain;background-repeat:no-repeat;background-position:center}
.shop-types button:nth-child(1)::before{background-image:url('/original-panels/shop/btn_toplevel_1.png')}
.shop-types button:nth-child(2)::before{background-image:url('/original-panels/shop/btn_toplevel_2.png')}
.shop-types button:nth-child(3)::before{background-image:url('/original-panels/shop/btn_toplevel_3.png')}
.shop-types button:nth-child(4)::before{background-image:url('/original-panels/shop/btn_toplevel_4.png')}
@media(max-width:400px){.shop-screen{padding:10px}.shop-types button{font-size:11px;padding:5px}}
""",
'tasks':"""
/* NEXT-026.3.19 exact TaskPanel atlas: sky/warm backgrounds, reward boxes. */
.tasks-points{background:#1b2038 url('/original-panels/tasks/bg_2.png') center/cover no-repeat;border-color:#c9ae77}
.tasks-chests button{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:66px}
.tasks-chests button::before{content:"";display:block;width:48px;height:45px;background-size:contain;background-position:center;background-repeat:no-repeat}
.tasks-chests button:nth-child(3n+1)::before{background-image:url('/original-panels/tasks/box_1.png')}
.tasks-chests button:nth-child(3n+2)::before{background-image:url('/original-panels/tasks/box_2.png')}
.tasks-chests button:nth-child(3n)::before{background-image:url('/original-panels/tasks/box_3.png')}
.tasks-chests button[data-claimed="1"]::before{filter:grayscale(1);opacity:.5}
.tasks-screen header{background:linear-gradient(90deg,#121c2aaa,#121c2a00),url('/original-panels/tasks/bg_1.png') center/cover no-repeat;padding:9px}
@media(max-width:400px){.tasks-screen{padding:10px}.tasks-chests button::before{width:38px;height:36px}}
"""
}
for name,_,path in screens:
 p=Path(path);s=p.read_text();assert 'NEXT-026.3.' not in s
 p.write_text(s+'\n'+css[name])
 print('INTEGRATED',name,path)
print('AUDITS',len(audits),'asset_count',len(json.loads(Path('reports/NEXT-026.3-asset-manifest.json').read_text())['assets']))
