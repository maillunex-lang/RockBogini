# NEXT-018.3 — Oracle / prophet summon

## Delivered
- Configs: CardProphetSummon 1/5 → SummonType 201, CardRandomLib 20101–20117
- Currency `14001`; Adv cost when `element=4`
- API: `GET /v1/summon` oracle section; `POST /v1/summon/oracle` `{type:1|5, element:1–4}`
- Element filter on CardRandomLib.ElementType; ExtraReward once per request (not × times)
- UI: SummonScreen tab «Оракул» + element 1–4

## Verification
- summon 8/8 in API container
- Live https://rikagro.ru/testtest/

## Open
- Activity / crystal summons
- Daily free reset cron
- Finger-hint / plot video
