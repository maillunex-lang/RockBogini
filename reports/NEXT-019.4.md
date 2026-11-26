# NEXT-019.4 — Shops + VIP

## Delivered
- Config: ShopBase 32 + ShopItem 939 + VipLevel 21 → `shop-vip.json`
- Migration 21: `player_shop`, `vip_level`, `vip_gift_mask`
- API: GET/POST `/v1/shop`, `/v1/shop/:type/buy|refresh`, GET `/v1/vip`, POST `/v1/vip/gift`
- City «Магазин» → ShopScreen (fixed + refresh shelves + VIP gifts)

## Verification
- shop + storage 5/5
- Live https://rikagro.ru/testtest/

## Open
- Mall cash packs / first-pay (023/monetization)
- Weekly shop auto-reset edge cases beyond daily LimitCycle=1
- Remaining shop types 6+ UI polish
