# AUDIT-011 — common skill ActionIndex residuals

## Оригинал
`racon/battle/battle.ex`: анимация только при `ActionIndex > 0`. При `ai == 0` skill применяется мгновенно без HeroAction timeline.
`Skills.active?`: `ai > 0`.

## Вывод
ActionIndex=0 — **не баг экспорта**, а «нет анимации». Клиентский `timelineIndex → -1` и skip — корректны. Не подставлять чужие анимации.

## Остаётся открытым
- Angel CoreModel empty (`700347`, `1457399`) — нет avatar package.
- Dima3501 index 4 при Skills.length=3 — проверить исходный ActionIndex в конфиге vs экспорт timelines.
- Common VFX packages.

Критерии закрытия: отдельные задачи с доказательствами из оригинальных пакетов.
