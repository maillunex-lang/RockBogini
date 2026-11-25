# AUDIT-005 — multi-texture Spine

## Проблема
`Model` / `acquireSkeleton` могли передавать только `texture`.

## Факты
- Hero models: textureCount=1 (все).
- Skill effects: 27 assets with `textures[]`; files present; ReportScene already spread `...asset`.

## Исправление
- Тип Model + `textures`/`textureCount` → acquireSkeleton для героев.
- Список: `AUDIT-005-multi-texture-models.json`.
