# NEXT-021.10: оригинальный отряд Sid 6 для Тайной области

## Исходное поведение
- Read-only `/home/gamedev/QueensBladeH5/racon2-main/server/lib/racon/game/handlers/pve_secret.ex`: `@map_type 6`, `@formation 6`, перед боем `Common.save_formations(p, forms, [6])`, затем `Common.attackers(p, 6)`.
- Read-only `/home/gamedev/QueensBladeH5/racon2-main/server/lib/racon/game/pve/common.ex`: при отсутствии записи Sid6 `attackers(p,sid)` использует основной Sid1; `save_formations` проверяет принадлежность и не допускает повторных героев.
- Шесть стандартных исходных `FormationType` 101–106 уже хранятся в `formationConfig.ts`; боевое расположение использует оригинальные `Data`.

## Выполнено
- Новый `secretFormation.ts`: отдельное шестислотовое построение, контроль SID и принадлежности, точные позиции `FormationType`, fallback к основной формации при отсутствии героев в Sid6.
- Migration34: `player_formations.secret_hero_ids` и `secret_formation_type`, безопасный сброс по умолчанию, ограничения шести позиций, положительных SID, уникальности непустых героев и допустимых типов построений.
- `GET /v1/secret/formation`: авторизация, текущий Sid6, признак fallback, варианты построения и принадлежащие игроку герои.
- `PUT /v1/secret/formation`: атомарное сохранение, проверка принадлежности, защита от дублей и изменений при незавершённом бое, возможность сброса всех слотов для fallback Sid1.
- `POST /v1/secret/challenge` теперь использует сохранённый Sid6 либо основной отряд при пустом Sid6, не изменяя основную формацию.
- Новый редактор в `pixi-client/src/secret/SecretScreen.tsx` для шести позиций, выбора построения, сохранения и возврата основного отряда.
- Не менялись уровни монстров, PvE награды, дневные циклы, боевые алгоритмы или другие проекты.

## Проверки
- `next-server npm run build` PASS.
- `pixi-client VITE_NEXT_API_URL=/sexyidle/api npm run build -- --base=/sexyidle/` PASS, только прежнее предупреждение Vite о чанке >500 KiB.
- Полная изолированная регрессия PostgreSQL и Redis: **197/197 PASS, 0 FAIL, 0 SKIP**, Termalin job `23tc1qqzok`, exit0.
- Новые тесты подтверждают оригинальный Sid6, шесть слотов, порядок боевых позиций, неизменность основного отряда, отклонение чужих героев и дублей, защиту во время pending-боя, изоляцию игроков, сам бой и возврат fallback.
- Ручная проверка в браузере авторизованным игроком пока не выполнена.

## Выпуск NEXT-021.10 на VPS
- Перед обновлением сохранён PostgreSQL dump `/var/backups/rockbogini-next-pre-secret-02110-20261127.dump` (135 KiB), предыдущий Docker-образ `rockbogini-next-api:pre-secret-02110`.
- Новый образ `rockbogini-next-api:latest` успешно собран (Docker build exit0).
- API обновлён через `docker compose -p rockbogini-next up -d --no-deps --no-build api`; PostgreSQL и Redis не перезапускались.
- Production `schema_migrations` = **34**, миграция применена.
- `https://rikagro.ru/sexyidle/api/ready` = `{"ready":true}` HTTP200.
- Неавторизованный `GET /sexyidle/api/v1/secret/formation` вернул HTTP401, ожидаемая защита.
- Docker API, PostgreSQL и Redis healthy, исполняемый образ совпадает с тегом latest.
- Frontend опубликован в `/var/www/sexyidle`, entry `assets/main-7QeT7hRo.js`.
- Ручная проверка авторизованного сценария игрока пока не проведена.
