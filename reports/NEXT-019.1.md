# NEXT-019.1 — Hang-up idle claim

## Delivered
- Accrual already existed (`campaign_idle` + `settleIdle` on battle clear)
- `GET /v1/campaign/idle` — settle + pending rewards, rates, 720m cap
- `POST /v1/campaign/idle/claim` — grant items, clear rewards, reset receive/settlement (keep fractional points)
- Campaign UI panel «Офлайн награды» with claim

## Verification
- idleClaim + campaignDependencies 7/7 in API container
- Live https://rikagro.ru/testtest/

## Open
- Quick battle (019.2)
- VIP bonus rates / adventure progress rewards / online rewards
- Activity event summons
