# Cursor handoff — RockBogini Next

Обновлено: 2026-11-25

## SINGLE-PROJECT-001
Работать только в `/home/gamedev/rocbogini/`. Одна публикация: https://rikagro.ru/testtest/. Оригинал не трогать. Диск ≥90% — аудит; ≥95% — стоп. Git в `/home/gamedev/rocbogini/` → `maillunex-lang/RockBogini`. Зеркало удалено (миграция выполнена).

## Сейчас
Активно: **AUDIT-001…018** (исправления по независимому аудиту) → затем продолжение **NEXT-014**. NEXT-013 закрыт (D-011).

Прочитать AGENTS.md, ROADMAP.md, roadmap.json, STATUS.md, DECISIONS.md, WORKLOG.md, reports/audit/QUEUE.md.

## Сделано (срез)
- NEXT-014.1 campaign API/UI; hotfix buffs; AUDIT-001 settlement state; AUDIT-002/003 terminal 105701 + NextId/clears; AUDIT-004 revive semantics; AUDIT-005 multi-texture wiring; AUDIT-006 clock order; AUDIT-007 float lifecycle; AUDIT-008 volume sync; AUDIT-009 Squad off play path; AUDIT-010 HUD HTTP checks; AUDIT-011 ActionIndex 0 = no anim (documented); AUDIT-012 partial aim offsets; AUDIT-014 names/items (WinBoard residual); AUDIT-016 disk audit; AUDIT-017 roadmap stats; publish hardlink economy.

## Далее
- Добить residuals AUDIT-011/012/014 (ангелы, точные координаты, WinBoard art, 64 sounds).
- AUDIT-015 расширенные campaign E2E.
- После закрытия критических AUDIT — NEXT-014.2 world map / сюжет.
- Миграция Git выполнена; коммитить из rocbogini.

## Критерии
Не отмечать done без доказательств. Не изобретать ID/баланс. Не плодить копии проекта.
