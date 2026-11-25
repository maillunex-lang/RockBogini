# AUDIT-016 — disk (read-only + reclaim plan)

## Состояние
~90% `/` (~6.1 GiB free). Порог SINGLE-PROJECT-001 достигнут.

## Крупные потребители
| Путь | Размер | Примечание |
|---|---|---|
| runtime/ | 6.1G | оригинал — не трогать |
| pixi-client/ (public+dist) | ~3.1G | skill-effects 1.2G × копии |
| /var/www/testtest | ~1.5G | дубликат public |
| rockbogini-publish | ~3.1G | .git 1.5G + public 1.5G |
| docker images | ~4G (97% reclaimable) | не чистить без согласования |

## Действия без удаления уникальных данных
- `publish_testtest.sh`: hardlink static dirs from `public/` into `dist/` и `/var/www/testtest`.
- План Git-миграции (без удаления зеркала): `docs/GIT_MIGRATION_PLAN.md`.

## Не удалять без владельца
runtime, БД, backups, rockbogini-publish, docker images, original assets.
