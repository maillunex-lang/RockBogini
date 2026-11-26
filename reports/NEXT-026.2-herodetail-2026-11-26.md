# NEXT-026.2 HeroDetailPanel visual/function integration
Date: 2026-11-26. Public preview: https://rikagro.ru/sexyidle/.

## Source audit
Original Cocos HeroDetailPanel/import/00/00d6b76b-a33f-4b00-b958-dfc7520a9efc.d2260.json inspected. Root 1080x1920 viewport. Background child 928x1358; 4 BaseAttrItem nodes each 618x64; HeroName/BattlePower blocks, ScrollView 880x786, SkillNode 854x280 and equipment grids.
Original HeroDetailPanel standalone native texture is absent from bundle. Its background sprite UUID 269yyAZp9El7jeXeC1pkD0 is referenced as an external dependency and has not yet been mapped to a verified texture. No false exact-parity claim.

## Changes
Integrated hero detail header within existing HeroesScreen using original available card frame (Common atlas), hero portrait, power and current level/star/label; four attribute rows use already extracted original ui/attr_bg.webp and existing commonPanelBg1.webp as a documented interim frame. Preserves all server-driven hero growth, holy equipment, skills and buttons.
Browser full login -> heroes -> select first hero PASS at 320x640, 390x844, 768x1024: 4 attrs, portrait 130px native, frame 218px, power 686 (test guest), no JS exceptions, no >=400 fetch, no body overflow.
Build PASS, rsync /sexyidle published.

## Remaining
Find exact background and other external prefab sprites from other Cocos bundles; original native HeroDetailPanel controls, model Spine, detailed layout and side-by-side acceptance pending. Android device parity and GitHub remote CI not verified. Do not close NEXT-026.
