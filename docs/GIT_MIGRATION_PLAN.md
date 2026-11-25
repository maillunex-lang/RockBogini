# План миграции Git: rockbogini-publish → /home/gamedev/rocbogini

Статус: **выполнено 2026-11-25** (SINGLE-PROJECT-001).

## Сделано
1. Bundle: `/home/gamedev/rockbogini-history.bundle` (страховка pre-rewrite).
2. `git-filter-repo`: `next/` → корень репозитория; `.github/` сохранён.
3. `.git` установлен в `/home/gamedev/rocbogini/`.
4. `.gitignore` исключает runtime/decompiled/backups/node_modules/dist/.env и пр.
5. CI обновлён под `next-server` + `pixi-client`.
6. Зеркало `/home/gamedev/rockbogini-publish/` **удалено** (владелец разрешил после переноса истории).
7. Remote: `git@github.com:maillunex-lang/RockBogini.git` (force-with-lease после rewrite).

## После миграции
- Работать и коммитить только из `/home/gamedev/rocbogini/`.
- Bundle можно удалить после проверки GitHub history, если нужен диск.
