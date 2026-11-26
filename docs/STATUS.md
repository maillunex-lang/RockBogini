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
| 026.2 | HeroList original background and 4-column grid live; prefab card visual parity open |
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
