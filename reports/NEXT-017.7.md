# NEXT-017.7 — Holy soul cast

## Delivered
- Config: HolyEquipSoul (materials by Type, UnlockStar, attr factor per Stage)
- `nextSoulTarget(itemId, stage, star)` — Materials[type-1] cost + ★ gate
- API: `POST /v1/holy/soul` — consume spare unequipped holy rows (owner_sid=0) matching material itemId, Stage++
- Attrs/score already use Stage factor via `holyPieceExtra` / soulCfg
- Heroes UI: Душа+1 with count/lock hint

## Verification
- holy+equip+heroes 22/22 in API container
- Live https://rikagro.ru/testtest/

## Open
- Gallery / resonance
- NEXT-018 summon
