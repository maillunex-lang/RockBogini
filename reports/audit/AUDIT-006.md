# AUDIT-006 — gameClock order

## Проблема
`pump` обходил Set без сортировки по `at`.

## Исправление
Таймеры с `seq`; due sorted by `at` then `seq`; cancelled mid-callback skipped.

## Тесты
5/5 `tools/game-clock.test.mjs`.
