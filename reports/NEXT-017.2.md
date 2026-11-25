# NEXT-017.2 — Equipment forging (NextId / Xp)

## Delivered
- `POST /v1/equipment/forge` `{sid, materials:[{itemId,count}]}`
- Climb `ItemEquipment.NextId` when total xp ≥ next.Xp
- Coin cost = forgeCost × EquipmentXpPrice (200)
- HeroesScreen: «Ковка» feeds starter material into worn slot
- Fix put-on replace: return old item without orphan rows

## Verification
- equipment tests 3/3 in API container
- Live https://rikagro.ru/testtest/

## Open
- Consume unequipped equipment models as materials
- Holy equipment
- Attrs → hero power
