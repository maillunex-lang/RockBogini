# NEXT-016.1 — hero level / star growth (MVP)

## Delivered
- Export original `HeroLevel` cumulative materials + `HeroStar` maxLevel/itemMaterials
- `POST /v1/heroes/:sid/level` `{newLevel}` — pays delta materials (xpWater/gold/…)
- `POST /v1/heroes/:sid/star` — +1 star when next star has no hero-fodder req (★→4 free; ★5+ deferred)
- HeroesScreen: +1 / +5 level and ★+1 actions; `maxLevel` from star

## Open
- Star upgrades needing fodder heroes (`heroMaterials`)
- Talents / awakening / reset (later 016.x)

## Verification
- heroes tests 3/3 (+ inventory 3/3) in API container
- Live https://rikagro.ru/testtest/ — Герои → detail growth buttons
