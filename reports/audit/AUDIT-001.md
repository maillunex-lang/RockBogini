# AUDIT-001 — settlement loop

## Проблема
Авто-`useEffect` settle при ошибке сбрасывал `busy` и оставлял условия (`finished && sceneReady && !result`) истинными → возможный бесконечный цикл settle.

## Причина
Отсутствовало явное состояние settlement; ошибка не выводила эффект из авто-пути.

## Исправление
- `settlementState.ts`: фазы `idle|pending|success|error`, `canAutoSettle` только из `idle`.
- `ReportScreen.tsx`: один авто-запуск, `settleInFlight`, ручная кнопка «Повторить получение награды», без авто-повторов.
- Серверная идемпотентность settle без изменений (`battleRoutes` concurrent settle).

## Тесты
`node --test tools/settlement-state.test.mjs` → 3/3 PASS (`reports/audit/AUDIT-001-tests.log`).

## Ограничения
Браузерные HTTP 500/timeout проверяются логикой фаз + серверной идемпотентностью; отдельный Playwright не запускался (нет Chromium). После reload pending battle восстанавливается через `GET /v1/battle/pending`; повторный settle безопасен.
