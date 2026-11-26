# Актуальное состояние 2026-11-26

Активная задача: **NEXT-026.1** city visual parity (D-012). Live https://rikagro.ru/sexyidle/ (public test deployment; legacy /testtest/ retained temporarily).
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
| 026.1 | city 1:1 scroll + biaoti/baitian Spine |
| 010, 012, 026 | in_progress (визуал/полнота) |

## Порядок дальше
1. 026.x 1:1 окон (campaign → heroes → …)
2. 020.2+ / 021 PvE (механики)
3. 015 random/event consume · 023 события
4. 022 PvP/соц · 027–028


## VPS deployment 2026-11-26
Canonical checkout `/home/gamedev/rocbogini`, deployed code a4332ce, PixiJS 7.4.3 / Spine 3.8. Original reference extracted at `/home/gamedev/QueensBladeH5/racon2-main`; ZIP retained. Client built with base `/sexyidle/` and API `/sexyidle/api`. Nginx routes to existing API on 127.0.0.1:18991; existing database retained. HTTPS, readiness, guest auth/session/profile/heroes/logout and browser guest entry verified. Server suite job hl3tfr49n9: 55 pass, 24 fail, 6 skip (85 total); failure causes pending investigation. API gameplayReady remains false. No roadmap task marked done. Legacy route remains accessible; publish script still needs migration. PixiJS 8 experiment not adopted.
