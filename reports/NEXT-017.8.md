# NEXT-017.8 — Holy gallery / resonance

## Delivered
- Configs: HolyEquipGalleryLevel/Slot, HolyEquipResonance, HolyEquipSlotAddon, CommonAttrs
- Migration 15: `gallery_slot` on holy rows + `player_holy_gallery.levels[4]`
- API: `GET /v1/holy/gallery`, put-on/off, level-up (item 94 cumulative cost)
- Team bonus (levels + slot addons + resonance) + SelfAttr when displayed → hero power
- Soul spare filter requires `gallery_slot=0`
- Heroes UI: gallery strip + В галерею / Из галереи

## Verification
- holy+storage+equip+heroes 26/26 in API container
- Live https://rikagro.ru/testtest/

## Open
- NEXT-018 summon
- Finger-hint / plot video
