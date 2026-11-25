# CURSOR-AUDIT-FIXES — отчёт по AUDIT-001…018

Дата: 2026-11-25. Принцип: **SINGLE-PROJECT-001**. Live: https://rikagro.ru/testtest/.

| ID | Статус | Кратко | Доказательства |
|---|---|---|---|
| AUDIT-001 | done | Settlement phases idle/pending/success/error; no auto-retry loop; manual retry | `reports/audit/AUDIT-001.md`, `AUDIT-001-tests.log` |
| AUDIT-002 | done | 105701 = MainLine terminal (NextId=0), not a new chapter; clamp like DataUtlity | `AUDIT-002.md`, research log, 80/80 tests |
| AUDIT-003 | done | Status via NextId chain + campaign_clears | `AUDIT-003.md`, campaignRoutes tests |
| AUDIT-004 | done | Revive type7 = visual only (original); HP from Cure; orderedEvents | `AUDIT-004.md`, hud tests |
| AUDIT-005 | done | Pass `textures`/`textureCount` into acquireSkeleton; 27 multi-tex effects already had textures | `AUDIT-005-multi-texture-models.json` |
| AUDIT-006 | done | Timers sorted by `at` then `seq` | `AUDIT-006-tests.log` 5/5 |
| AUDIT-007 | done | Floats on wall-clock rAF; survive page `clock.clear` | ReportScene.tsx |
| AUDIT-008 | partial | Live volume sync for playing Audio; 64 unmapped sounds still open | ReportScene volume effect; residual list |
| AUDIT-009 | done | Squad demo removed from play path | main.tsx |
| AUDIT-010 | done | HUD JSON HTTP checks; release leases on init failure | hudAssets.ts, ReportScene |
| AUDIT-011 | documented | ActionIndex 0 = no animation (`ai > 0` in original battle.ex); skip stays correct; angels still open | `AUDIT-011.md` |
| AUDIT-012 | partial | Projectile aim uses HUD offset + OffsetX/Y; full ReferenceType parity open | ReportScene bullet() |
| AUDIT-013 | partial | Page cleanup clears clock/effects/audio; float independent; fuller conflict matrix open | ReportScene cleanups |
| AUDIT-014 | partial | Fantasy names + item labels; WinBoard art residual | ResultScreen.tsx |
| AUDIT-015 | partial | Expanded campaign unit/HTTP tests (terminal, clears, chain); more E2E later | campaignRoutes.test.ts |
| AUDIT-016 | done (read-only) | Disk ~90%; dist/www duplicated skill-effects 1.2G; publish hardlink reclaim | `AUDIT-016-disk.json` |
| AUDIT-017 | done | STATUS/ROADMAP counts from roadmap.json; `tools/roadmap_stats.py` | STATUS.md |
| AUDIT-018 | in_progress | tsc client/server OK; 80/80 server; 14/14 client unit; API redeployed; publish ready | this file |

## SINGLE-PROJECT / диск
- Решение SINGLE-PROJECT-001 в AGENTS.md, DECISIONS, ROADMAP, HANDOFF.
- `tools/publish_testtest.sh` обновлён: hardlinks для immutable assets, rsync только code/html.
- План Git-миграции: `docs/GIT_MIGRATION_PLAN.md` (ждёт владельца).

## Оставшиеся ограничения
- WinBoard original art, angel actors, 64 sounds, exact effect ReferenceType, browser Chromium QA.
- Git всё ещё через `rockbogini-publish` до утверждения миграции.
- После hardlink reclaim проверить `df`; при ≥95% — стоп.
