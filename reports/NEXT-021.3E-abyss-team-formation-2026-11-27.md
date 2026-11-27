# NEXT-021.3E: Отдельная формация отрядной Бездны

## Источник
- Исходные серверные обработчики read-only `server/lib/racon/game/handlers/pve_abyss.ex`, `server/lib/racon/game/pve/common.ex`, `server/lib/racon/battle/unit.ex`.
- Исходный MapType 11: AttackerFormation [7]; в отличие от главного отряда (Sid 1) и трёх отдельных формаций одиночного режима (Sids 101/102/103).
- Встроенная база FormationType 101–106 используется для точного отображения позиций MapType 11; например FormationType 101: [2,4,5,6,7,9].

## Реализовано
- PostgreSQL migration 30 добавляет `abyss_team_hero_ids[6]` и `abyss_team_formation_type` в `player_formations` с ограничениями на длину, ненулевые положительные SID, допустимые построения и отсутствие повторов.
- Отрядная Бездна MapType 11 больше не использует главный отряд. Отдельная формация Sid 7 создаётся и сохраняется независимо от главного отряда и одиночного MapType 10.
- `PUT /v1/abyss/team`: проверка владельца каждого героя, уникальности, типа построения; запрет изменения во время незавершённого боя; транзакционное сохранение.
- `GET /v1/abyss/formation` содержит команду, её построение и оригинальные позиции; `GET /v1/abyss` возвращает обе отдельные формации.
- В клиентской вкладке «Бездна» добавлен выбор построения и шести позиций, сохранение через новый маршрут, блокировка запуска волны при несохранённом выборе.
- Первая версия тестов нашла 404 у нового гостя. Исправлена инициализация `player_profiles` до попытки удержания его row lock.

## Проверки
- TypeScript server: `npm run build` PASS.
- Pixi client: `VITE_NEXT_API_URL=/sexyidle/api npm run build -- --base=/sexyidle/` PASS, только прежнее предупреждение Vite о крупном чанке.
- Временные PostgreSQL/Redis: после исправления полный прогон `bash tools/test-all-mechanics-isolated.sh` **180/180 PASS, 0 FAIL, 0 SKIP**, Termalin job `65kqjqs9oo`, exit 0.
- Новые интеграционные тесты: принадлежность героев, дубликаты, шестислотовая формация, выбор перестановки, изоляция от главного отряда и от чужих пользователей, отказ изменения во время pending боя.
- Ранее до исправления: 179/180, один тест 404. Ошибка исправлена до выпуска.

## Открытые вопросы
- Полная оригинальная система бонусов, пассивных эффектов и визуальная 1:1 анимация боя требуют следующих этапов.
- Полный браузерный сценарий с авторизованным игровым аккаунтом на production не проверен.
- NEXT-021 остаётся in_progress.

## Выпуск NEXT-021.3E на VPS
- Перед обновлением сохранён дамп PostgreSQL `/var/backups/rockbogini-next-pre-abyss-0213e-20261127.dump` (129 KiB) и предыдущий Docker-образ `rockbogini-next-api:pre-abyss-0213e`.
- Новый образ `rockbogini-next-api:latest` успешно собран (Docker build exit0).
- `docker compose -p rockbogini-next up -d --no-deps --no-build api` PASS; базу и Redis не перезапускали.
- Production `schema_migrations` = **30**; `https://rikagro.ru/sexyidle/api/ready` = HTTP200 `{"ready":true}`.
- `PUT /sexyidle/api/v1/abyss/team` без сессии HTTP401, ожидаемая защита.
- Docker API/PostgreSQL/Redis healthy, работающий API-образ совпадает с тегом latest.
- Frontend обновлён на `/var/www/sexyidle`, публичный entry `assets/main-D8Jckqav.js`.
- Сценарий с авторизованным игровым аккаунтом через браузер вручную пока не проверен.
