# NEXT-021.9: историческая максимальная сила в Тайной области

## Оригинал
- Read-only `/home/gamedev/QueensBladeH5/racon2-main/server/lib/racon/game/handlers/pve_secret.ex`, `defp ensure`: при запуске новой двухдневной экспедиции вычисляет `MapPowerLevel` как максимальную ступень типа 1, для которой `PowerLimit <= Common.highest_power(p)`.
- Текущий `secretRoutes` ошибочно передавал `player_profiles.power`: текущая формация после переключения героев могла искусственно понизить сложность экспедиции.
- `next-server/src/secretConfig.ts` уже содержит исходный экспорт `secret-power.json` и `selectPower(power)`. Его правила и баланс не изменены.

## Реализовано
- Во всех семи вызовах `state(c,id,power)` в `secretRoutes` теперь передаётся `highest_power` из авторитетного профиля.
- Запросы с транзакционной блокировкой `player_profiles` также читают `highest_power`, а не текущее `power`.
- Новый двухдневный цикл выбирает нужный уровень монстров по историческому максимуму; уже начатая экспедиция и её сохранённый `power_level_id` остаются неизменными до следующего цикла.
- Текущая формация всё так же определяет реально доступных героев и боевую силу отряда. Способ начисления наград, таймеры, расходники и сохранение HP не изменены.
- PostgreSQL migration не требуется: исходное поле `highest_power` уже было добавлено в NEXT-021.7 (migration33).

## Контроль качества
- `next-server npm run build` PASS.
- Полная изолированная регрессия PostgreSQL+Redis: **195/195 PASS, 0 FAIL, 0 SKIP**, Termalin job `4yqctq58y6`, exit0.
- Новый интеграционный тест: сначала открыть экспедицию; сменить текущую мощность до 1 при большом рекорде; убедиться, что текущий цикл не меняется; принудительно истечь срок в тестовой БД; проверить выбор более высокой исходной ступени и сохранение её на весь следующий цикл.
- Ручная проверка браузерного сценария авторизованным игроком пока не выполнена.

## Выпуск NEXT-021.9 на VPS
- Перед обновлением сохранён PostgreSQL dump `/var/backups/rockbogini-next-pre-secret-0219-20261127.dump` (135 KiB), предыдущий Docker-образ `rockbogini-next-api:pre-secret-0219`.
- Новый образ `rockbogini-next-api:latest` успешно собран (Docker build exit0).
- API обновлён через `docker compose -p rockbogini-next up -d --no-deps --no-build api`, PostgreSQL и Redis не перезапускались.
- Production `schema_migrations` = 33; новая миграция не требовалась.
- `https://rikagro.ru/sexyidle/api/ready` = `{"ready":true}` HTTP200.
- Неавторизованный `GET /sexyidle/api/v1/secret` возвращает HTTP401, ожидаемая защита.
- Docker API, PostgreSQL и Redis healthy, исполняемый образ совпадает с тегом latest.
- Клиент в этом серверном пакете не менялся.
- Ручная проверка авторизованного сценария игрока пока не проведена.
