# NEXT-015.2 — ItemIcon webp + use/sell

## Delivered
- Hardlink import of original `ItemIcon` natives → `pixi-client/public/item-icons/{id}.webp` (3724 icons; pack-only assets stay missing)
- Inventory API enrichment: `kind`, `icon`, `sellPrice`, `canSell`, `usable`, `useSubType`
- `POST /v1/inventory/use` — FixedBox (subType 1) and ManualBox (subType 3 + selIndex)
- `POST /v1/inventory/sell` — coin grant via `item-sell-overrides.json` (client `ItemBase.SellPrice` is 0 for all rows)
- InventoryScreen: real icons with kind placeholder fallback; Use / Sell actions

## Notes
- Chalice `110010` (Treasure Summon) is consume subType 99 / event — not usable in this stage
- Sell overrides: materials 60/87/95/10001/10451/10480 until original SellPrice appears in config

## Verification
- inventory tests 3/3 in API container; client `tsc` ok
- Live https://rikagro.ru/testtest/ — city → Инвентарь
