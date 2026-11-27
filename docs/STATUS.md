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
