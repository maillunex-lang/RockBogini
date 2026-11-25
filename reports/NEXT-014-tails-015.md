# NEXT-014 tails + NEXT-015 inventory (plan A)

## 014 tails
- StoryChapter titles → RU (83 chapters, e.g. «Дар ангела»)
- Plot video GuideStep Type=100: `kindName=plotVideo`, `hasPlot` stub dialog (skip without silent auto-complete)
- Empty finger-hint groups still auto-advance (no overlay targets in export)

## NEXT-015 MVP
- `GET /v1/inventory` → `{items[{itemId,amount}], currencies, itemCount}`
- City shortcut «Инвентарь» → `InventoryScreen`
- RU item display names for campaign/idle currencies

## Verification
- 86/86 server tests
- Client `tsc` ok
- Smoke: inventory chalice + plot pending group 1 + story title RU
- Live: https://rikagro.ru/testtest/
