# NEXT-015.1 — inventory filters and kinds

## Delivered
- Items enriched with `kind` (`currency|consume|material|shard|other`) and `byKind` counts
- InventoryScreen: filter chips, search, detail dialog, kind-colored icon placeholders
- Original ItemIcon UUID→webp mapping deferred (Cocos compressed UUIDs); placeholders for now

## Verification
- inventory test pass; client tsc ok
- Live https://rikagro.ru/testtest/ — city → Инвентарь
