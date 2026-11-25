# NEXT-016.3 — PVE/PVP talent upgrade + reset

## Delivered
- Export `HeroTalentItemConsume` tiers
- Unlock: level≥1, star≥10 (GlobalSetting)
- `POST /v1/heroes/:sid/talent` `{type:1|2,count?,auto?}` — common items + optional fodder
- `POST /v1/heroes/:sid/talent/reset` — refund at ResetReturnRatio
- HeroesScreen: Талант PVE +1 / Сброс PVE

## Verification
- heroes tests 5/5 in API container
- Live https://rikagro.ru/testtest/

## Open
- Job change / luck skills / awakening
- Manual fodder multi-select UI
