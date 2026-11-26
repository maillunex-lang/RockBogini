# NEXT-026.1 — City visual parity (shipped surface)

## Decision
Pull 1:1 original graphics/structure/animations forward onto already-shipped screens (D-012). New mechanics stay functional-first until their screens exist.

## Delivered
- Scrollable MainSceneDefaultBg stage (original aspect 719×1679)
- Original MainPanel Spine: `UI_effect_zhujiemian_biaoti` on each entrance title, `UI_effect_zhujiemian_baitian` ambient
- Entrance hit targets keep prefab layout; shop building opens ShopScreen
- Hardlinked natives under `public/city/effects/{biaoti,baitian}/`

## Open
- Exact title fonts / multilang title art for 10 entrances
- Camera scroll sync vs original Prefab SceneNode
- Castle overlay sprites beyond baked background
- Same 1:1 pass for campaign / heroes / inventory / summon / shop / tasks windows
