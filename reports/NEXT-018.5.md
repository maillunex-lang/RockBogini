# NEXT-018.5 — Element displace (★4 / ★5)

## Delivered
- Configs: CardProphetSummon 3/4 → SummonType 401/402, libs 40101–03 / 40201–06
- Currency `14002` (20 / 100); pull excludes current HeroId; same element
- API: `GET/POST /v1/heroes/:sid/displace`, `/save`, `/cancel` (no refund)
- Migration 17: `player_displace`
- UI: HeroesScreen «Замена стихии» for eligible ★4–5

## Verification
- displace + storage 3/3 in API container
- Live https://rikagro.ru/testtest/

## Open
- Personality displace (type 6 / SummonType 12)
- Activity event summons
- Richer finger targets
