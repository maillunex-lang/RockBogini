# NEXT-018.4 — Crystal exchange summon

## Delivered
- Configs: CardProphetSummon 2 → SummonType 301, CardRandomLib 30101–30115
- Currency `39` (Star Power): 1000 base / 2000 Adv for element 4–5
- API: `GET /v1/summon` crystal section; `POST /v1/summon/crystal` `{element:1–5}`
- No oracle task/statue side-effects; empty ExtraReward
- UI: SummonScreen tab «Кристалл» + elements 1–5

## Verification
- summon 10/10 in API container
- Live https://rikagro.ru/testtest/

## Open
- Activity event summons
- Displace (401/402/12)
- Daily free reset cron
- Finger-hint / plot video
