# NEXT-018.6 — Personality displace

## Delivered
- Configs: CardProphetSummon 6 → SummonType 12, libs 1201–1203; `item-personality.json` (174)
- Currency `50` ×25; pull excludes current item; element 1–3 only
- API: `GET/POST /v1/inventory/personality/displace`, `/save`, `/cancel` (no refund)
- Migration 18: `player_personality_displace`
- UI: Inventory filter «Личность» + replace panel

## Verification
- personality + displace + storage 5/5 in API container
- Live https://rikagro.ru/testtest/

## Open
- Activity event summons
- Idle / economy (019)
