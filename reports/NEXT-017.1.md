# NEXT-017.1 — Equipment put-on / put-off MVP

## Delivered
- Export `ItemEquipment` (76 items, slots 1–4)
- `player_equipment` table (migration 12)
- `GET /v1/equipment`, `POST /v1/equipment/put-on` (from bag), `POST /v1/equipment/put-off`
- `GET /v1/heroes/:sid/equipment` — 4 slots
- HeroesScreen: wear starter gear / unequip

## Verification
- equipment + heroes tests 8/8 in API container
- Live https://rikagro.ru/testtest/

## Open
- Forging / NextId upgrade chain
- Holy equipment
- Auto put-on / score-based replace
- Attrs into hero power
