# NEXT-021.7: исторический рекорд силы для ежедневных подземелий

## Оригинал
- Read-only `/home/gamedev/QueensBladeH5/racon2-main/server/lib/racon/game/handlers/pve_daily_instance.ex`: `Req_Map_DailyInstanceChallenge` допускает бой по `Common.highest_power(p)` в сравнении с исходным `MapDailyInstance.RequirePower`.
- Предыдущая NEXT-021.2 проверяла `player_profiles.power`, то есть текущую силу отряда. После изменения состава это могло ошибочно блокировать уже доступный этап.
- Предыдущие условия наград и VIP-бонусы остаются отдельным незавершённым пакетом.

## Реализовано
- Migration33: `player_profiles.highest_power bigint NOT NULL DEFAULT 1372 CHECK(highest_power>=0)`; для действующих записей однократно сохранено `GREATEST(highest_power,power)`. Исторические пики, ранее не хранившиеся, задним числом восстановить невозможно.
- Новый пользователь получает исходную стартовую базовую силу 1372 в `highest_power` при создании профиля.
- PUT `/v1/formation` обновляет `highest_power=GREATEST(highest_power,new_power)` в одной транзакции с сохранением отряда; уменьшение состава не снижает рекорд.
- GET `/v1/profile` возвращает `highest_power` числом, сохраняя прежнее `power`.
- GET `/v1/daily-instance` и POST `/v1/daily-instance/challenge` авторитетно проверяют `highest_power`, что соответствует исходному серверу.
- Выплаты, суточные лимиты, баланс и механика боёв не менялись.

## Тестирование
- `next-server npm run build` PASS.
- Изолированная регрессия PostgreSQL+Redis: 192/192 PASS, 0 FAIL, 0 SKIP, Termalin job `s7fmvde9yb`, exit0.
- Расширены тесты создания профиля, изменения обычной формации с уменьшением силы, допуска/запрета по рекорду, повторного проигрывания challenge, подтверждён migration33.
- Первый полный прогон выявил отсутствие стартового рекорда у новых игроков и устаревшие фикстуры (прямое изменение текущей силы). Исправлено, итоговый полный прогон зелёный.
- Ручная проверка в браузере авторизованным игроком пока не проводилась.
