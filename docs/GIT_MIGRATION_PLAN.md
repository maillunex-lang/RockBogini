# План миграции Git: rockbogini-publish → /home/gamedev/rocbogini

Статус: **ожидает утверждения владельца**. Зеркало не удалять.

## Зачем
- SINGLE-PROJECT-001: одна рабочая копия.
- Сейчас код в `rocbogini` (не git), история в `rockbogini-publish` (~1.5G `.git` + 1.5G `next/pixi-client/public` дубликат ассетов).
- Экономия диска и устранение рассинхрона rsync.

## Предлагаемые шаги (после «да»)
1. Снимок: `git bundle create ~/rockbogini-history.bundle --all` из `rockbogini-publish`.
2. В `/home/gamedev/rocbogini`: `git init`, добавить remote, fetch bundle / mirror history.
3. Вариант A (предпочтительный): перенести историю ветки `main` так, чтобы корень репо стал содержимым `next/` (filter-repo / subtree), либо держать prefix `next/` временно.
4. `.gitignore` (черновик): `node_modules/`, `dist/`, `.env`, `runtime/`, `backups/`, `**/_build/`, `deps/`, большие бинарные ассеты при необходимости LFS или hardlink-out-of-git (public уже на диске — решить: track vs ignore+CDN).
5. Первый push в `maillunex-lang/RockBogini` только после dry-run и проверки, что secrets не в индексе.
6. Зеркало `rockbogini-publish` оставить read-only архивом ≥7 дней, удалить только по отдельному согласованию.

## Риски
- Потеря путей/LFS при filter.
- Случайный commit `runtime/` или `.env`.
- Временный рост диска на время bundle (~1.5G) — нужен запас; сейчас ~6G free (порог 90%).

## Решение владельца
- [ ] Утвердить миграцию
- [ ] Отложить
- [ ] Отклонить (оставить зеркало)
