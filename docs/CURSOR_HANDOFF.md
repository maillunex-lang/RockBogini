# Cursor handoff — RockBogini Next

Обновлено: 2026-11-25

## SINGLE-PROJECT-001
Работать только в `/home/gamedev/rocbogini/`. Git → RockBogini. Публикация: https://rikagro.ru/testtest/. Диск ≥90% аудит; ≥95% стоп.

## Сейчас
Активно: **NEXT-014.2** (MapWorld карта — partial). Критические AUDIT закрыты.

## Сделано в этом срезе
- NEXT-014.2: dual view «Карта мира / Главы»; 30 зон с position/owningMap; `MapWorld_name_*` из оригинального locale; `worldStatus`/`currentWorldId`; multi-texture `acquireSkeleton`; 81/81 tests; API+publish.

## Далее
- NEXT-014.3+: StoryChapter/диалоги, обучение (Guide*), RU перевод названий зон, boss presentation, WinBoard art.
- Residuals AUDIT: angels, 64 sounds, exact effect coords.

## Критерии
Не изобретать ID/баланс/имена мест — только из конфигов/locale. Не отмечать done без доказательств.
