# NEXT-026.4 equipment original sprites, 2026-11-27

Source:
- Existing pixi-client/public/item-icons/{40111,40211,40311,40411,41001,41002,41003,41004}.webp are verified original ItemIcon asset copies already included in project. No new synthetic art.
- Existing server API /v1/heroes/{sid}/equipment and /v1/heroes/{sid}/holy determines which ItemId is equipped; slot fallback displays original starter ItemId dimmed with title "Образец оригинального предмета, слот пуст". This is a visual preview, not a claim the starter gear is owned.
- Four ordinary equipment slots and four holy slots show source-art icon for the actual worn or preview ID. Existing equip/unequip/forge/holy controls unchanged.

Verification: original 8/8 images loaded and no HTTP/JS errors, and no horizontal viewport overflow at 320px and 390px. Vite TypeScript build PASS; published to https://rikagro.ru/sexyidle/.
Existing gameplay/DB transactions not modified or tested in this change. UI 1:1 not yet accepted.
