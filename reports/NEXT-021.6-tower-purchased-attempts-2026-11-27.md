# NEXT-021.6: Покупки элементальных попыток и доступ к высшим башням

## Источники
- Read-only `server/lib/racon/game/handlers/pve_tower.ex`: 10 бесплатных успешных попыток, списание только при победе, сохранение оплаченных Count, ежедневный сброс PayCount и BattleCount, требования GameModule 101/102.
- Read-only `server/lib/racon/game/handlers/game_misc.ex`: `Req_Game_CommonBuyCount` с Type=1, LevelParam[198].Data2 и алмазом item3, накопление Count/PayCount, ступенчатая стоимость.
- Прямо декодированы `client/config/configure/*/LevelParam` (198 Data2=[1,50]) и `GlobalSetting` (ElementTowerMaxBattleCountDaily = 10).
- `next-server/data/campaign-dependencies.json` содержит оригинальные module 2029–2034 с требованиями [102,type,level].
- Контрольные хеши и конфигурация `reports/NEXT-021.6-source-audit.json`, переносимые параметры `next-server/data/tower-limits.json`.

## Выполнено
- `towerExtraCost` считает шаговую стоимость; текущая конфигурация 50 алмазов за одну дополнительную попытку.
- Server-authoritative `POST /v1/tower/buy-attempts` проверяет авторизацию, тип стихийной башни, блокировку высшей башни, положительное количество, платёж и атомарно увеличивает оставшиеся попытки и дневное число покупок.
- PostgreSQL migration32: `tower_progress.pay_count` с CHECK >= 0. На смене дня PayCount и счётчик бесплатных побед сбрасываются, остаток уже оплаченных попыток сохраняется по логике оригинала.
- Исправлено различие: 10 первых успешных прохождений расходуют бесплатный счётчик, последующие победы списывают оплаченный Count, проигрыш не списывает попытку.
- Высшие башни 101–105,199 требуют исходные GameModule 2029–2034. Доступ проверяется при выдаче списка башен, покупке попыток, начале боя и быстром прохождении. Запрет проверяется до загрузки героев и повторно под транзакционной блокировкой.
- Клиент показывает закрытость башен, необходимый модуль, оставшиеся бесплатные/оплаченные попытки и форму покупки дополнительных попыток.
- Основная формация, неигровые проекты и архив исходников не изменены.

## Контроль качества
- TypeScript server и Pixi client production builds PASS.
- Полная изолированная регрессия PostgreSQL и Redis: 191/191 PASS, 0 FAIL, 0 SKIP, Termalin job `lol9g8vn57`, exit0.
- Первичная проверка обнаружила неправильный приоритет ошибки: `empty_tower_formation` перед `tower_locked`. Проверка доступа перенесена раньше; повторная полная регрессия зелёная.
- Новые тесты подтверждают оригинальные цены, блокировки, отсутствие частичной оплаты при недостатке алмазов, изоляцию игроков, дневной сброс счётчика покупок и доступность оплаченных попыток при исчерпании бесплатных.
- Ручная проверка в браузере с авторизованным игроком ещё нужна, а полный 1:1 визуал и остальная PvE-логика NEXT-021 пока in_progress.

## Выпуск NEXT-021.6 на VPS
- Перед обновлением сохранён PostgreSQL dump `/var/backups/rockbogini-next-pre-tower-0216-20261127.dump` (134 KiB) и предыдущий Docker-образ `rockbogini-next-api:pre-tower-0216`.
- Новый образ `rockbogini-next-api:latest` успешно собран (Docker build exit0).
- API обновлён через `docker compose -p rockbogini-next up -d --no-deps --no-build api`, PostgreSQL и Redis не перезапускались.
- Production `schema_migrations` = **32**, успешно применена новая миграция.
- `https://rikagro.ru/sexyidle/api/ready` = `{"ready":true}` HTTP200.
- Неавторизованный `POST /sexyidle/api/v1/tower/buy-attempts` возвращает HTTP401, ожидаемая защита.
- Docker API, PostgreSQL и Redis healthy, исполняемый образ совпадает с тегом latest.
- Frontend опубликован в `/var/www/sexyidle`, entry `assets/main-BDTPMANM.js`.
- Ручная проверка авторизованного сценария игрока пока не проведена.
