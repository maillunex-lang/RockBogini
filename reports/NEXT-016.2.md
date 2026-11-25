# NEXT-016.2 — star upgrade with hero fodder

## Delivered
- `HeroBase` slim export (`maxStar`, element, bond, core)
- `POST /v1/heroes/:sid/star` accepts `{materials?, auto?}`
- Matches original `HeroMaterials` types (same hero / bond / element / any)
- Consumes fodder (not locked, not in formation), refunds their level materials
- Enforces `MaxStarLevel` (starters 11303/12301 capped at ★3)
- HeroesScreen: ★+1 (авто-корм) + requirement hint

## Verification
- heroes tests 4/4 in API container
- Live https://rikagro.ru/testtest/ — Герои

## Open
- Manual fodder multi-select UI
- Talents / awakening / reset
