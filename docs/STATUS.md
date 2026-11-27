# NEXT-021.3B (2026-11-27): Секретная область + WorldBoss
Original SecretArea 4 этажа/49 типов монстров/565 карт и 5 предметов, новые серверные транзакции и UI; два исходных WorldBoss события (15802/15803), сохранённая дата окончания 2026-11-01, серверная модель урона и наград, UI и закрытие устаревших событий. Миграции 27/28, изолированная регрессия 172/172 PASS. Production API и фронтенд опубликованы, readiness HTTP 200, обе новые точки 401 без авторизации, Docker healthy. PvE остается in_progress; см. reports/NEXT-021.3B-secret-world-boss-2026-11-27.md.

# NEXT-021.3A (2026-11-27): Бесконечная бездна
2 режима, 140 этапов, 1680 исходных волн и 12 усилений. Серверный бой, сохранение HP и волны, промежуточные награды и UI «Бездна». Изолированная регрессия **165/165 PASS**, сборки сервера и клиента PASS, NEXT-021 остаётся in_progress, полные оригинальные формации/персональные бонусы и другие PvE ещё открыты. Деплой API+клиента выполнен, production ready HTTP 200, миграция 26, сервисы healthy. Отчёт reports/NEXT-021.3-abyss-2026-11-27.md.

# NEXT-021.2 (2026-11-27): ежедневные PvE-подземелья
Пять оригинальных типов и 55 карт, серверные бои, пройденные этажи, идемпотентные награды и бесплатные/платные зачистки. Отдельный экран «Подземелья» и миграция PostgreSQL 25. Изолированные тесты 162/162 PASS, сборки сервера и клиента PASS. Исторический максимум силы и VIP-бонусы отложены. См. reports/NEXT-021.2-daily-instance-2026-11-27.md.

# NEXT-021.1 (2026-11-27): функциональный PvE-режим башен
12 типов башен, 17 000 оригинальных этажей с наградами и врагами, серверные бои, idempotent settlement, daily/extra/quick, PostgreSQL migration 24, вкладка «Башня» в городском меню. Изолированные 159/159 PASS, серверная и клиентская сборки PASS. Этап NEXT-021 оставлен in_progress: оригинальная элементальная формация/разблокировки и все остальные PvE режимы не готовы. См. reports/NEXT-021.1-pve-tower-2026-11-27.md.

# NEXT-016.7 (2026-11-27): атомарное повышение талантов
Исправлены частичные списания предметов/героев при развитии талантов, PostgreSQL транзакция, 156/156 isolated PASS. Следующие работы: остальные операции роста героев и NEXT-021 PvE. См. reports/NEXT-016.7-atomic-talent-growth-2026-11-27.md.

# NEXT-016.6 (2026-11-27): атомарное повышение звезды
Устранено необратимое потребление героев-материалов при нехватке предметов, транзакция PostgreSQL, повторная проверка владения, 154/154 isolated PASS. Следом необходимо аналогично исправить talent, затем NEXT-021 PvE. См. reports/NEXT-016.6-atomic-star-growth-2026-11-27.md.

# Актуальное дополнение 2026-11-27 NEXT-020.2 pioneering
Серверные первопроходческие достижения: 4 оригинальных ID, из них тип 2 (сила) реализован с транзакционным первым победителем и наградами, типы 3–4 отключены до серверной гонки/сезонов. UI вкладка «Достижения», bigint для силы, изолированные 153/153 PASS. Ограничения: определение первого победителя при запросе, отсутствие максимальной исторической силы. См. reports/NEXT-020.2-pioneering-2026-11-27.md. NEXT-020 остаётся in_progress.

# Актуальный механический приоритет 2026-11-27
Механики перед визуалом: активен NEXT-015.3 и затем NEXT-015.4; NEXT-026 визуал приостановлен, статус не закрыт. 13 функциональных групп аудированы в reports/NEXT-MECHANICS-2026-11-27.md. NEXT-015.3: 218 исходных геройских рецептов, проверка isolated PG/Redis 5/5 PASS, Playwright с тестовыми данными 320/390/768 PASS, /sexyidle. Полный регрессионный набор запускается отдельно. Отчёт reports/NEXT-015.3-hero-piece-compose-2026-11-27.md.

# Актуальное состояние 2026-11-26

Активная задача: **NEXT-026.1/026.2**. Mobile HUD browser QA PASS; HeroList original background/4-column first slice. Updated preview https://rikagro.ru/sexyidle/. Previous https://rikagro.ru/testtest/ exists separately; parity between previews not assumed.

Проверено: 020.1 tasks; city Spine biaoti/baitian + scroll stage.

| Подэтап | Состояние |
|---|---|
| 013–014 | done (бой визуал D-011; кампания+гайд) |
| 015.1–015.2 | done; random/event consume open |
| 016–017 | done |
| 018.1–018.6 | done; activity summons → 023 |
| 019.1–019.4 | done (idle/quick/rewards/shops+VIP) |
| 020.1 | done: daily/weekly tasks + point chests |
| 020 story/achievements · 021–025, 027–028 | pending |
| 009 | deferred → 024 |
| 026.1 | city scroll/original sprites/HUD/XP: QA 4 viewports PASS; 1:1 and Spine effects NOT accepted |
| 026.2 | HeroList background, 20 original card/border sprites, 4-column grid, sorting/filters and detail access; 1:1 prefab/detail acceptance open |
| 010, 012, 026 | in_progress (визуал/полнота) |

## Порядок дальше
1. 026.x 1:1 окон (campaign → heroes → …)
2. 020.2+ / 021 PvE (механики)
3. 015 random/event consume · 023 события
4. 022 PvP/соц · 027–028


## NEXT-026 latest QA 2026-11-26
- 320×640/360×640/390×844/768×1024 city: labels 9, nav 5, six shortcuts, XP progressbar, images and requests PASS; no hitbox overlaps. Original labels remain English sprites for owner image translation.
- Heroes page: 3 default heroes, original HeroListPanel/Bg, 4-column layout verified at 320/390/768, no page errors.
- Caveats: CitySpine overlays intentionally disabled due previous flicker; 1:1 visual parity incomplete. GitHub push and remote CI not verified. Evidence reports/NEXT-026.1-026.2-2026-11-26.md.

## NEXT-026.2 cards batch 2026-11-26
- Extracted 20 original Cocos card/background sprites, imported 354 original hero ElementType records.
- UI filters, sorting and view toggle + detail entry tested 320/390/768. Client Vite build PASS, /sexyidle publish PASS.
- NEXT-026 remains in_progress; exact HeroList controls, HeroDetail original art and visual acceptance open. Evidence reports/NEXT-026.2-hero-original-cards-2026-11-26.md.

NEXT-026.2 HeroDetailPanel partial: source original prefab reviewed, 4 original-size attribute nodes, verified portrait/power/attribute layout published to /sexyidle. Browser 320/390/768 PASS. Actual original background sprite unresolved; 1:1 gate OPEN. reports/NEXT-026.2-herodetail-2026-11-26.md.

NEXT-026.2 5 stages (2026-11-26): original CommonBg/PanelBg1 texture and Cocos nine-slice imported, 4 detail navigation anchors, 4 viewport browser E2E PASS, Vite deploy /sexyidle, docs/Git updated. Full 1:1/Spine still pending. reports/NEXT-026.2-5-stage-2026-11-26.md.

NEXT-026.3 (2026-11-26): 20 source-driven visual substeps across campaign/inventory/summon/shop/tasks; 21 exact Cocos assets imported; five screen integrations; browser QA 10/10 PASS at 320x640/390x844, Vite build and /sexyidle deployment. NEXT-026 in_progress; NOT 20 main stages completed, 1:1 not accepted. See reports/NEXT-026.3-20-stages.md.

## Historical deployment reference (merged from remote main)
## VPS deployment 2026-11-26
Canonical checkout `/home/gamedev/rocbogini`, deployed code a4332ce, PixiJS 7.4.3 / Spine 3.8. Original reference extracted at `/home/gamedev/QueensBladeH5/racon2-main`; ZIP retained. Client built with base `/sexyidle/` and API `/sexyidle/api`. Nginx routes to existing API on 127.0.0.1:18991; existing database retained. HTTPS, readiness, guest auth/session/profile/heroes/logout and browser guest entry verified. Server suite job hl3tfr49n9: 55 pass, 24 fail, 6 skip (85 total); failure causes pending investigation. API gameplayReady remains false. No roadmap task marked done. Legacy route remains accessible; publish script still needs migration. PixiJS 8 experiment not adopted.


2026-11-27 NEXT-026.4 partial: original three starter Spine models working, 1135 SkillIcon native source assets, fullscreen detail, real star material preview (upgrade untested); browser city/five screens/heroes PASS; full 20-feature package & exact 1:1 pending. See reports/NEXT-026.4-2026-11-27.md.

2026-11-27 CI repair: Actions next-server test jobs previously failed due mandatory NEXT_RECOVERY_SECRET absent. Test runner now generates 64-char ephemeral random secret; original guard unchanged. Local isolated unit subset 90 pass/0 fail/53 DB skips. Browser Spine ticker visibility pausing added. Report reports/NEXT-026.4-ci-fix-2026-11-27.md. Remote status pending.

2026-11-27 NEXT-026.4 equipment: 8 original ItemIcon sprites for regular/holy slots, actual worn ItemId shown when equipped; dimmed starter preview if empty. 320/390 browser 8/8 PASS, Vite and published PASS. reports/NEXT-026.4-original-equipment-2026-11-27.md.

2026-11-27 NEXT-026.4 formation: BattleFormationPanel original beach 1080x2520 + 8 source sprite crops; server-driven 9 slot grid preserved; 320/390/768 browser PASS including back. Exact Cocos world placement not 1:1. reports/NEXT-026.4-formation-2026-11-27.md.

2026-11-27 NEXT-026.4 battle result: original reward ItemIcon and hero avatar sprites linked by authoritative IDs; original SettlementPanel WinPanel/FailPanel/atlas audited. Build/deploy PASS, full live result E2E and 1:1 still OPEN. reports/NEXT-026.4-result-original-icons-2026-11-27.md.

2026-11-27 NEXT-026.4 real summon: original Common hero cards/portraits shown on server-confirmed free summon; mobile 390/320 PASS. Repaired live 23505 duplicated starter SID during pre-initialization; existing orphan summons preserved. Isolated PG+Redis 11/11 summon tests PASS, DB backup made, API refreshed. Full animation 1:1 open. reports/NEXT-026.4-summon-real-pull-2026-11-27.md.

2026-11-27 broader DB suite attempted in isolated PG/Redis (concurrency=3) did not finish 220s and observed PostgreSQL 40P01 deadlocks in auth and heroes tests. Targeted 11/11 summon DB tests PASS and production GitHub CI green but skips DB tests. Full integration acceptance OPEN; see reports/NEXT-026.4-integration-suite-audit-2026-11-27.md.

2026-11-27: isolated PostgreSQL 16/Redis 7 sequential integration suite: 144 PASS, 0 FAIL, 0 SKIP, 37.278 seconds, Termalin job 8j4mmuos8w exit 0. Added integration-db GitHub Actions job; remote run pending.

2026-11-27 NEXT-015.3 full server regression in ephemeral isolated PostgreSQL/Redis: 146/146 PASS, 0 fail/skip, 38.074s, Termalin job rftridjsn1 exit 0. Release prod compose and compose-all with server authorization 401 unauthenticated; browser mocked UI 3/3 PASS.

2026-11-27 NEXT-015.4 original locked/random boxes: source tables ItemConsume 1898/CardSummonType 611/CardRandomLib 699, four types 158+363+3+2; 19 missing source refs globally but none active for these boxes; transactional API + client and isolated PostgreSQL/Redis 149/149 PASS; reports/NEXT-015.4-original-boxes-2026-11-27.md. Next: NEXT-020.2 achievements.

2026-11-27 NEXT-015.4 /sexyidle/ published, API /ready true and HTTP200; browser UI mocked API at 320/390/768 PASS, isolated server QA 149/149 PASS, before-deploy PostgreSQL backup /var/backups/rockbogini-next-pre-boxes-20261127.dump. GitHub CI pending.

2026-11-27 NEXT-020.2 main story: exact 26 original NewbieMainTask IDs and TaskBase rewards from source; server level/power/map/hero state progression, real quick battle event, one-time transaction claims and Story UI tab. 4 PioneeringAchievement rows extracted, competitive conditions OPEN. 151/151 isolated DB tests PASS and mobile 320/390/768 with real API PASS. Reports: reports/NEXT-020.2-main-story-quests-2026-11-27.md. Backup /var/backups/rockbogini-next-pre-newbie-tasks-20261127.dump.
