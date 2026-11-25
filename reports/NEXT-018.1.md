# NEXT-018.1 — Normal summon MVP

## Delivered
- Configs: CardCommonSummon 1/2, CardSummonType 101, CardRandomLib 10101–10107, ItemHeroCard
- Migration 16: `player_summon` (lib_count/lib_status/free/today/total)
- API: `GET /v1/summon`, `POST /v1/summon/pull` (×1 / ×10 / free)
- Pull engine with OnceLibs + StartChance/MaxCount pity; grants `player_heroes`
- City «Призыв» → SummonScreen

## Verification
- summon+storage 5/5 in API container
- Live https://rikagro.ru/testtest/

## Open
- Senior banner (102), oracle/activity summons
- Daily free reset cron, diamond alt-cost
- Finger-hint / plot video
