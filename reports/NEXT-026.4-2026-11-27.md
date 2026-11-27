# NEXT-026.4 partial delivery: hero animation + detail + skill art + star preview
Date 2026-11-27, canonical checkout /home/gamedev/rocbogini, public preview https://rikagro.ru/sexyidle/

Source provenance:
- ORIGINAL hero-asset-map.json: 354 hero definitions, 296 model assets in existing pixi-client/public/hero-models, loaded on demand by existing pixi-client/src/assets/spineLibrary.ts; no replacement illustrations.
- Original Cocos SkillIcon/config.*.json and native/*.webp: 1572 named source textures; 3169 distinct skill IDs referenced by 354 heroes. 1159 intersect source config entries, 1135 currently have a resolvable native image. Copied byte-identical to public/skill-icons, preserved SHA256/source references in reports/NEXT-026.4-skill-icons.json. 24 config-listed textures have no matching native file, and other skill IDs are absent from source config. No invented icons.
- Original CommonBg PanelBg1 and original hero card borders remain used.

Implementation:
1. On-demand original Spine 3.8 preview in hero details with supported model/animation selector; 30FPS cap; explicit toggle; releases view and skeleton lease on unmount. Existing PixiJS 7.4.3 and existing assets library only.
2. Browser proof: 390x844 and 320x640, original Alina1301 success (five animations, one canvas, unmount zero canvases), all three guest starter characters Alina1301, Ally2301, Nanaaier2401 render and load; no JS/HTTP errors.
3. Corrected dark hero text on real original light PanelBg1, visually confirmed screenshot (/tmp/rock-next0264-spine.png).
4. Imported 1135 original SkillIcon WebP assets from source and used existing authoritative server skill IDs; 2/2 original skill pictures visible for starter hero; 320/390/768 browser pass, no overflow.
5. Original dedicated HeroDetailPanel behavior: opens from hero card in separate fullscreen dialog, back button/Esc returns to hero list; tested 320/390/768, no errors or overflow.
6. Star-up panel shows actual server starPreview.heroMaterials and itemMaterials, with original item-icons and existing grow handler, not synthetic costs; game currently disables star growth for starter heroes so successful star-up transaction is NOT accepted or tested.
7. Regression checks: tools/verify-city-mobile.cjs, tools/verify-next026-20.cjs (five prior screens), tools/verify-hero-detail.cjs all PASS after changes; client Vite/tsc build PASS, /sexyidle deployed.

Limitations:
Not 20 full roadmap features, and not overall 1:1. Original exact hero detail geometry/character idle in other UIs, all source-native skill icon gaps, campaign/combat/summon, social/admin, 1:1 screenshot benchmark, actual Android testing, game backend test failures and GitHub remote CI still outstanding. No server/db/game currency or other games changed.
