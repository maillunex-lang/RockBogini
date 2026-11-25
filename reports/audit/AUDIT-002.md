# AUDIT-002 — последний этап 105701

## Проблема
`orphanMapIds=[105701]`; `chapterForMap(105701)` не находил главу и API откатывался к главе 1.

## Исследование оригинала
- `MapAdventure[105640].Type=2`, `NextId=105701`, в главе 56.
- `MapAdventure[105701].Type=1`, `NextId=0` — единственный type1 с next=0; в `AdventureChapter.MapIds` отсутствует.
- `DataUtlity.GetChapterConfigByMapId`: `Math.min(progress, lastChapter.lastMap)` → clamp к 105640.
- `campaign-units` содержит 105701; цепочка NextId 100101→…→105701 (2241 шагов).

## Исправление
- `chapterForMap` с clamp как в оригинале.
- `mapsForChapter` добавляет терминальный 105701 после последней главы (не новая глава).
- Поля `uiClampMapId`, `campaignComplete`, `terminal` в API.

## Тесты
80/80 server tests incl. campaign helpers (`reports/audit/AUDIT-002-003-tests.log`).
