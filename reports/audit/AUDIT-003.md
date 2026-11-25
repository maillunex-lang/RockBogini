# AUDIT-003 — статус этапов через NextId + clears

## Проблема
Статус через `mapId < stage` ненадёжен на конце кампании и при нелинейных ID.

## Исправление
- Построена MainLine-цепочка по `campaign-rewards.next`.
- `mapStatus` / `chapterStatus` / `canChallengeMap` используют индекс в цепочке + `campaign_clears`.
- Терминальный этап (`next=0`) после clear → `cleared` и `campaignComplete`.
- Согласовано с `battleRoutes`: challenge по-прежнему `mapId <= profile.stage`.

## Тесты
Юнит-тесты на цепочку, 105640→105701, replay, terminal clear; HTTP-тест с clears (`AUDIT-002-003-tests.log`).
