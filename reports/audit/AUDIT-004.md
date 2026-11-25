# AUDIT-004 — revive HP

## Проблема
Казалось, что type 7 не восстанавливает HP.

## Оригинал
`AJBattleViewPort` → `Revive` только вызывает `AJBattleActor.Revive()` (видимость/opacity). HP меняет `Cure`/`ExtraCure` через `DealWithHP`. Сервер (`simulation.ts`) эмитит type 7 value=0, затем type 5/22 с HP.

## Исправление
- Не изобретать HP на type 7 (подтверждено оригиналом).
- `orderedEvents`: при одном index Revive(7) перед Cure(5/22).
- Комментарий + тесты.

## Тесты
6/6 hud-health; order log OK (`reports/audit/AUDIT-004-*`).
