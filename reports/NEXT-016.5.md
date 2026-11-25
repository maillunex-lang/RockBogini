# NEXT-016.5 — Luck skills (LuckSkill1/2)

## Delivered
- Export `LuckyCharmSkill` + `HeroLuckyCharm` configs
- Unlock: ★11 slot1 / ★12 slot2 (`HeroLuckyCharmUnlock1/2`)
- `POST /v1/heroes/:sid/luck` `{index,type,param}` — study (Type1 skill / Type2 charm item), differential materials on upgrade
- `POST /v1/heroes/:sid/luck/clear` — forget (Type1 DecomposeItems) or pack (Type2 Packing → item)
- Same Type blocked across slots
- HeroesScreen: study / upgrade / forget

## Verification
- heroes tests 7/7 in API container
- Live https://rikagro.ru/testtest/

## Open
- Awakening
- Luck attrs in combat power
- NEXT-017 equipment
