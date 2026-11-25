# NEXT-017.4 — Holy equipment MVP

## Delivered
- Exported HolyEquipment / Star / Level / Suit / Soul / GlobalSetting holy keys
- Migration 13: `player_holy_equipment` (entity model: star/level/xp/stage/step/owner)
- API: `GET /v1/holy`, `POST /v1/holy/put-on|put-off|wear|level-up`, `GET /v1/heroes/:sid/holy`
- Attrs + HolyEquipmentScore (82) + Suit2/4 power/score into hero Power
- Mutual exclusion with normal equipment on the same slot (1–4)
- Heroes UI: sacred gear panel (put-on/off, +level via item 101)

## Verification
- holy + equipment + heroes + storage: 17/17 in API container
- Live https://rikagro.ru/testtest/

## Open
- Star / Step up, blessing, soul cast, gallery / resonance
- Suit skill IDs (attrs/power only for 2/4 set)
